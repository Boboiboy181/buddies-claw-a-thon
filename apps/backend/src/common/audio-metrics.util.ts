// Deterministic audio metrics derived from real transcription timing data.
//
// These replace the values the LLM used to fabricate (speaking pace, pauses,
// duration). Everything here is computed from Whisper segment timestamps or, when
// the provider returns no timing data, falls back honestly to "unavailable".

export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
  noSpeechProb?: number;
  avgLogprob?: number;
}

export type SpeakingPace = 'slow' | 'normal' | 'fast' | 'unknown';
export type MetricsSource = 'measured' | 'client-duration' | 'unavailable';

export interface LongPause {
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
}

export interface AudioMetrics {
  source: MetricsSource;
  totalDurationSeconds: number | null;
  speakingDurationSeconds: number | null;
  silenceSeconds: number | null;
  wordCount: number;
  wordsPerMinute: number | null;
  speakingPace: SpeakingPace;
  longPauses: LongPause[];
  // Mean per-segment confidence in 0..1, derived from Whisper avg_logprob. Null
  // when the provider returns no per-segment log-probabilities.
  avgConfidence: number | null;
  notes: string[];
}

// A gap between speech segments longer than this is reported as a "long pause".
const LONG_PAUSE_THRESHOLD_SECONDS = 2.5;

// Words-per-minute thresholds. Heuristic and language-agnostic; flagged as such
// in the notes so HR does not over-read them.
const SLOW_WPM = 90;
const FAST_WPM = 170;

function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function classifyPace(wpm: number | null): SpeakingPace {
  if (wpm == null || !Number.isFinite(wpm) || wpm <= 0) return 'unknown';
  if (wpm < SLOW_WPM) return 'slow';
  if (wpm > FAST_WPM) return 'fast';
  return 'normal';
}

export function computeAudioMetrics(opts: {
  segments?: TranscriptSegment[];
  totalDurationSeconds?: number | null;
  clientDurationSeconds?: number | null;
  transcriptText?: string;
}): AudioMetrics {
  const wordCount = countWords(opts.transcriptText ?? '');
  const segments = opts.segments?.filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end));

  // No timing data from the provider — be honest instead of guessing.
  if (!segments || segments.length === 0) {
    const total = opts.totalDurationSeconds ?? opts.clientDurationSeconds ?? null;
    return {
      source: total != null ? 'client-duration' : 'unavailable',
      totalDurationSeconds: total != null ? round(total) : null,
      speakingDurationSeconds: null,
      silenceSeconds: null,
      wordCount,
      wordsPerMinute: total && total > 0 ? round(wordCount / (total / 60)) : null,
      speakingPace: 'unknown',
      longPauses: [],
      avgConfidence: null,
      notes:
        total != null
          ? ['Only wall-clock duration was available; speech vs. silence was not measured.']
          : ['No timing data was returned by the transcription provider.'],
    };
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const speaking = sum(sorted.map((s) => Math.max(0, s.end - s.start)));
  const total = opts.totalDurationSeconds ?? sorted[sorted.length - 1].end;

  const longPauses: LongPause[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].start - sorted[i - 1].end;
    if (gap >= LONG_PAUSE_THRESHOLD_SECONDS) {
      longPauses.push({
        startSeconds: round(sorted[i - 1].end),
        endSeconds: round(sorted[i].start),
        durationSeconds: round(gap),
      });
    }
  }

  const wpm = speaking > 0 ? wordCount / (speaking / 60) : null;
  const logprobs = sorted
    .map((s) => s.avgLogprob)
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  const avgConfidence = logprobs.length ? round(Math.exp(sum(logprobs) / logprobs.length), 3) : null;

  return {
    source: 'measured',
    totalDurationSeconds: round(total),
    speakingDurationSeconds: round(speaking),
    silenceSeconds: round(Math.max(0, total - speaking)),
    wordCount,
    wordsPerMinute: wpm != null ? round(wpm) : null,
    speakingPace: classifyPace(wpm),
    longPauses,
    avgConfidence,
    notes: [],
  };
}

// Combine metrics across multiple recordings for the same answer (follow-ups are
// appended to a single answer). Durations and word counts are additive; pace is
// recomputed from the aggregate; confidence is duration-weighted.
export function mergeAudioMetrics(prev: AudioMetrics | null, next: AudioMetrics): AudioMetrics {
  if (!prev) return next;

  const measured = prev.source === 'measured' && next.source === 'measured';
  const speaking = (prev.speakingDurationSeconds ?? 0) + (next.speakingDurationSeconds ?? 0);
  const total =
    prev.totalDurationSeconds != null || next.totalDurationSeconds != null
      ? (prev.totalDurationSeconds ?? 0) + (next.totalDurationSeconds ?? 0)
      : null;
  const wordCount = prev.wordCount + next.wordCount;
  const wpm = measured && speaking > 0 ? round(wordCount / (speaking / 60)) : null;

  const confParts = [prev, next].filter((m) => m.avgConfidence != null && m.speakingDurationSeconds);
  const confWeightTotal = sum(confParts.map((m) => m.speakingDurationSeconds ?? 0));
  const avgConfidence =
    confParts.length && confWeightTotal > 0
      ? round(
          sum(confParts.map((m) => (m.avgConfidence as number) * (m.speakingDurationSeconds ?? 0))) /
            confWeightTotal,
          3,
        )
      : (prev.avgConfidence ?? next.avgConfidence);

  return {
    source: measured ? 'measured' : prev.source === 'unavailable' ? next.source : prev.source,
    totalDurationSeconds: total != null ? round(total) : null,
    speakingDurationSeconds: measured ? round(speaking) : null,
    silenceSeconds: measured && total != null ? round(Math.max(0, total - speaking)) : null,
    wordCount,
    wordsPerMinute: wpm,
    speakingPace: classifyPace(wpm),
    longPauses: [...prev.longPauses, ...next.longPauses],
    avgConfidence,
    notes: Array.from(new Set([...prev.notes, ...next.notes])),
  };
}

// Aggregate per-answer metrics into the single interview-level "audio review
// signals" block stored on the report. Keeps the legacy keys the frontend reads
// (speakingPace, speakingDurationSeconds) while filling them with real values.
export function aggregateAudioSignals(metricsList: AudioMetrics[]) {
  const valid = metricsList.filter(Boolean);
  if (valid.length === 0) {
    return {
      available: false,
      source: 'unavailable' as MetricsSource,
      speakingPace: 'unknown' as SpeakingPace,
      speakingDurationSeconds: null,
      totalDurationSeconds: null,
      wordsPerMinute: null,
      longPauseCount: 0,
      avgConfidence: null,
      notes: ['No measured audio data was captured for this interview.'],
    };
  }

  const measured = valid.filter((m) => m.source === 'measured');
  const speaking = sum(measured.map((m) => m.speakingDurationSeconds ?? 0));
  const total = sum(valid.map((m) => m.totalDurationSeconds ?? 0));
  const wordCount = sum(valid.map((m) => m.wordCount));
  const wpm = speaking > 0 ? round(wordCount / (speaking / 60)) : null;
  const longPauseCount = sum(valid.map((m) => m.longPauses.length));

  const confParts = measured.filter((m) => m.avgConfidence != null && m.speakingDurationSeconds);
  const confWeight = sum(confParts.map((m) => m.speakingDurationSeconds ?? 0));
  const avgConfidence =
    confParts.length && confWeight > 0
      ? round(
          sum(confParts.map((m) => (m.avgConfidence as number) * (m.speakingDurationSeconds ?? 0))) /
            confWeight,
          3,
        )
      : null;

  const source: MetricsSource = measured.length ? 'measured' : valid[0].source;

  return {
    available: true,
    source,
    speakingPace: classifyPace(wpm),
    speakingDurationSeconds: measured.length ? round(speaking) : null,
    totalDurationSeconds: total > 0 ? round(total) : null,
    wordsPerMinute: wpm,
    longPauseCount,
    avgConfidence,
    notes:
      source === 'measured'
        ? ['Measured from transcription timestamps. Pace thresholds are heuristic and language-agnostic.']
        : ['Derived from wall-clock duration only; speech vs. silence was not measured.'],
  };
}
