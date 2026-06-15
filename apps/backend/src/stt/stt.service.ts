import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { TranscriptSegment } from '../common/audio-metrics.util';

export interface TranscriptionResult {
  text: string;
  durationSeconds?: number;
  segments?: TranscriptSegment[];
}

const MIME_BY_EXT: Record<string, string> = {
  wav: 'audio/wav',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
};

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io';
const DEFAULT_ELEVENLABS_STT_MODEL = 'scribe_v2';

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);
  private readonly provider: 'elevenlabs' | 'agentbase' | 'openai';
  private readonly client?: OpenAI;
  private readonly model: string;
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly elevenlabs?: ElevenLabsClient;

  constructor(private config: ConfigService) {
    const elevenLabsApiKey = this.readOptional('ELEVENLABS_API_KEY');
    const agentbaseApiKey = this.readOptional('LLM_API_KEY');
    const agentbaseModel = this.readOptional('STT_MODEL');
    // Per-account transcription base URL, e.g.
    // https://maas-llm-aiplatform-hcm.api.vngcloud.vn/maas/user-XXXXXX/openai/whisper-large-v3/v1
    const agentbaseSttBaseUrl = this.readOptional('STT_BASE_URL');
    const openAiApiKey = this.readOptional('OPENAI_API_KEY');

    // An explicit STT_PROVIDER overrides the auto-detection below, mirroring TtsService.
    const forced = this.readOptional('STT_PROVIDER')?.toLowerCase();
    if (forced === 'elevenlabs') {
      if (!elevenLabsApiKey) throw new Error('STT_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is not set');
      this.provider = 'elevenlabs';
      this.apiKey = elevenLabsApiKey;
      this.baseUrl = this.elevenLabsSdkBaseUrl();
      this.model = this.config.get('ELEVENLABS_STT_MODEL', DEFAULT_ELEVENLABS_STT_MODEL);
      this.elevenlabs = new ElevenLabsClient({ apiKey: this.apiKey, baseUrl: this.baseUrl, maxRetries: 2 });
      this.logger.log(`Using ElevenLabs STT with model "${this.model}" (forced via STT_PROVIDER)`);
      return;
    }
    if (forced === 'openai') {
      if (!openAiApiKey) throw new Error('STT_PROVIDER=openai but OPENAI_API_KEY is not set');
      this.provider = 'openai';
      this.client = new OpenAI({ apiKey: openAiApiKey });
      this.model = this.config.get('OPENAI_STT_MODEL', 'whisper-1');
      this.logger.log(`Using direct OpenAI STT with model "${this.model}" (forced via STT_PROVIDER)`);
      return;
    }
    if (forced === 'agentbase' && !(agentbaseApiKey && agentbaseModel && agentbaseSttBaseUrl)) {
      throw new Error('STT_PROVIDER=agentbase but LLM_API_KEY + STT_MODEL + STT_BASE_URL are not set');
    }

    if (elevenLabsApiKey && forced !== 'agentbase') {
      this.provider = 'elevenlabs';
      this.apiKey = elevenLabsApiKey;
      this.baseUrl = this.elevenLabsSdkBaseUrl();
      this.model = this.config.get('ELEVENLABS_STT_MODEL', DEFAULT_ELEVENLABS_STT_MODEL);
      this.elevenlabs = new ElevenLabsClient({ apiKey: this.apiKey, baseUrl: this.baseUrl, maxRetries: 2 });
      this.logger.log(`Using ElevenLabs STT with model "${this.model}"`);
      return;
    }

    if (agentbaseApiKey && agentbaseModel && agentbaseSttBaseUrl) {
      this.provider = 'agentbase';
      this.client = new OpenAI({
        apiKey: agentbaseApiKey,
        baseURL: agentbaseSttBaseUrl.replace(/\/+$/, ''),
      });
      this.model = agentbaseModel;
      this.logger.log(`Using AgentBase STT endpoint with model "${this.model}"`);
      return;
    }

    if (!openAiApiKey) {
      throw new Error(
        'Missing LLM_API_KEY + STT_MODEL + STT_BASE_URL for AgentBase or OPENAI_API_KEY for direct OpenAI usage',
      );
    }

    this.provider = 'openai';
    this.client = new OpenAI({ apiKey: openAiApiKey });
    this.model = this.config.get('OPENAI_STT_MODEL', 'whisper-1');
    this.logger.log(`Using direct OpenAI STT with model "${this.model}"`);
  }

  async transcribe(audioBuffer: Buffer, filename = 'audio.mp3', language = 'vi'): Promise<string> {
    return (await this.transcribeDetailed(audioBuffer, filename, language)).text;
  }

  // Transcribe and, when the provider supports it, return segment-level timing
  // and confidence so downstream analysis can use real metrics instead of guesses.
  // Falls back to plain text if `verbose_json` is rejected by the endpoint.
  async transcribeDetailed(
    audioBuffer: Buffer,
    filename = 'audio.mp3',
    language = 'vi',
  ): Promise<TranscriptionResult> {
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp3';
    const mime = MIME_BY_EXT[ext] ?? 'audio/mpeg';

    if (this.provider === 'elevenlabs') {
      return this.transcribeElevenLabs(audioBuffer, filename, mime, language);
    }

    try {
      const response = (await this.client!.audio.transcriptions.create({
        file: this.buildFile(audioBuffer, filename, mime),
        model: this.model,
        language,
        response_format: 'verbose_json',
      } as any)) as any;

      return {
        text: response.text ?? '',
        durationSeconds: typeof response.duration === 'number' ? response.duration : undefined,
        segments: Array.isArray(response.segments)
          ? response.segments.map((s: any) => ({
              start: s.start,
              end: s.end,
              text: s.text ?? '',
              noSpeechProb: s.no_speech_prob,
              avgLogprob: s.avg_logprob,
            }))
          : undefined,
      };
    } catch (err) {
      this.logger.warn(
        `verbose_json transcription failed (${(err as Error)?.message ?? err}); falling back to plain text`,
      );
      const response = await this.client!.audio.transcriptions.create({
        file: this.buildFile(audioBuffer, filename, mime),
        model: this.model,
        language,
      });
      return { text: response.text ?? '' };
    }
  }

  private async transcribeElevenLabs(
    audioBuffer: Buffer,
    filename: string,
    mime: string,
    language: string,
  ): Promise<TranscriptionResult> {
    const data = (await this.elevenlabs!.speechToText.convert({
      modelId: this.model as any,
      file: this.buildFile(audioBuffer, filename, mime),
      timestampsGranularity: 'word',
      diarize: false,
      tagAudioEvents: false,
      ...(language ? { languageCode: language } : {}),
    })) as any;

    const words = Array.isArray(data?.words) ? data.words : [];
    const timedWords = words
      .filter((w: any) => w?.type !== 'spacing' && typeof w?.start === 'number' && typeof w?.end === 'number')
      .map((w: any) => ({
        start: w.start,
        end: w.end,
        text: w.text ?? '',
        avgLogprob: typeof w.logprob === 'number' ? w.logprob : undefined,
      }));

    return {
      text: data?.text ?? '',
      durationSeconds: timedWords.length ? timedWords[timedWords.length - 1].end : undefined,
      segments: this.wordsToSegments(timedWords),
    };
  }

  private wordsToSegments(words: TranscriptSegment[]): TranscriptSegment[] | undefined {
    if (!words.length) return undefined;
    const segments: TranscriptSegment[] = [];
    let current: TranscriptSegment | null = null;
    const gapSeconds = 0.8;

    for (const word of words) {
      if (!current || word.start - current.end > gapSeconds) {
        if (current) segments.push(current);
        current = { ...word };
        continue;
      }
      current.end = word.end;
      current.text = `${current.text}${/^[,.;:!?]/.test(word.text) ? '' : ' '}${word.text}`.trim();
      if (typeof word.avgLogprob === 'number') current.avgLogprob = word.avgLogprob;
    }
    if (current) segments.push(current);
    return segments;
  }

  private buildFile(audioBuffer: Buffer, filename: string, mime: string): File {
    const ab = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;
    return new File([ab], filename, { type: mime });
  }

  private readOptional(key: string): string | undefined {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : undefined;
  }

  private elevenLabsSdkBaseUrl(): string {
    return this.config
      .get('ELEVENLABS_BASE_URL', ELEVENLABS_BASE_URL)
      .replace(/\/+$/, '')
      .replace(/\/v1$/i, '');
  }
}
