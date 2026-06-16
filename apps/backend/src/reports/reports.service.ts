import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums, Prisma } from '@prisma/client';
import { LlmService } from '../llm/llm.service';
import { MailService } from '../mail/mail.service';
import { reportReady } from '../mail/mail.templates';
import { htmlToText } from '../common/html.util';
import { aggregateAudioSignals, type AudioMetrics } from '../common/audio-metrics.util';

// One question's grounded analysis, as produced by the per-answer LLM pass.
interface QuestionAnalysis {
  questionId: string;
  question: string;
  answerTranscript: string;
  answerSummary: string;
  relevance: 'on_topic' | 'partially_on_topic' | 'off_topic';
  strengths: string[];
  concerns: string[];
  evidenceQuotes: string[];
  coveredSignals: string[];
  missedSignals: string[];
  score: number | null;
  scoreReason: string;
  audioMetrics: AudioMetrics | null;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async findByInterview(interviewId: string) {
    return this.prisma.interviewReport.findUnique({ where: { interviewId } });
  }

  async generateReport(interviewId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        candidate: true,
        job: true,
        createdByHr: true,
        questions: { orderBy: { order: 'asc' } },
        answers: { include: { question: true } },
      },
    });

    if (!interview) throw new NotFoundException('Interview not found');

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { status: $Enums.InterviewStatus.REPORT_GENERATING },
    });

    try {
      // ── Stage 1: grounded per-question analysis ──────────────────────────
      // Each answer is analysed in isolation, with only its own transcript and
      // measured audio metrics. This keeps the model focused on real evidence and
      // makes hallucination easy to catch (every quote must exist in the answer).
      const questionAnalyses: QuestionAnalysis[] = [];
      for (const q of interview.questions) {
        const answer = interview.answers.find((a) => a.questionId === q.id);
        const metrics = (answer?.audioMetricsJson as unknown as AudioMetrics | null) ?? null;
        const analysis = await this.analyseAnswer(interview.job.title, q, answer?.transcript ?? '', metrics);
        questionAnalyses.push(analysis);

        // Persist per-question analysis on the answer (previously unused field).
        if (answer) {
          await this.prisma.interviewAnswer.update({
            where: { questionId: q.id },
            data: { analysisJson: analysis as unknown as Prisma.InputJsonValue },
          });
        }
      }

      // ── Deterministic audio signals (no LLM guessing) ────────────────────
      const audioSignals = aggregateAudioSignals(
        interview.answers
          .map((a) => a.audioMetricsJson as unknown as AudioMetrics | null)
          .filter((m): m is AudioMetrics => !!m),
      );

      // ── Stage 2: synthesis from the per-question findings + CV + JD ───────
      const synthesis = await this.synthesise(interview, questionAnalyses);

      const report = await this.prisma.interviewReport.upsert({
        where: { interviewId },
        create: {
          interviewId,
          summary: synthesis.summary,
          qaAnalysisJson: questionAnalyses as unknown as Prisma.InputJsonValue,
          cvMatchAnalysisJson: synthesis.cvMatchAnalysis,
          jdFitAnalysisJson: synthesis.jdFitAnalysis,
          audioReviewSignalsJson: audioSignals as unknown as Prisma.InputJsonValue,
          videoReviewSignalsJson: this.videoSignalsPlaceholder() as unknown as Prisma.InputJsonValue,
          rubricScoresJson: synthesis.rubricScores,
          recommendation: synthesis.recommendation,
          riskFlagsJson: [],
        },
        update: {
          summary: synthesis.summary,
          qaAnalysisJson: questionAnalyses as unknown as Prisma.InputJsonValue,
          cvMatchAnalysisJson: synthesis.cvMatchAnalysis,
          jdFitAnalysisJson: synthesis.jdFitAnalysis,
          audioReviewSignalsJson: audioSignals as unknown as Prisma.InputJsonValue,
          videoReviewSignalsJson: this.videoSignalsPlaceholder() as unknown as Prisma.InputJsonValue,
          rubricScoresJson: synthesis.rubricScores,
          recommendation: synthesis.recommendation,
        },
      });

      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { status: $Enums.InterviewStatus.REPORT_READY },
      });

      // Notify the recruiter who created the interview that the report is ready.
      // Best-effort: a mail failure must not fail report generation.
      if (interview.createdByHr?.email) {
        const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/+$/, '');
        await this.mail.send({
          to: 'daogiahai18@gmail.com',
          ...reportReady({
            candidateName: interview.candidate.fullName,
            jobTitle: interview.job.title,
            link: `${base}/hr/interviews/${interviewId}`,
          }),
        });
      }

      return report;
    } catch (error) {
      this.logger.error(`Report generation failed for interview ${interviewId}`, error);
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { status: $Enums.InterviewStatus.FAILED },
      });
      throw error;
    }
  }

  // ── Stage 1 helper ─────────────────────────────────────────────────────
  private async analyseAnswer(
    jobTitle: string,
    question: { id: string; text: string; expectedSignals: string[]; evaluationCriteria: string[] },
    rawTranscript: string,
    metrics: AudioMetrics | null,
  ): Promise<QuestionAnalysis> {
    const transcript = rawTranscript.trim();

    // No answer → return an honest, evidence-free record instead of asking the LLM
    // to evaluate nothing.
    if (!transcript) {
      return {
        questionId: question.id,
        question: question.text,
        answerTranscript: '',
        answerSummary: 'No answer was recorded for this question.',
        relevance: 'off_topic',
        strengths: [],
        concerns: ['Candidate did not provide an answer.'],
        evidenceQuotes: [],
        coveredSignals: [],
        missedSignals: question.expectedSignals ?? [],
        score: null,
        scoreReason: 'No answer to evaluate.',
        audioMetrics: metrics,
      };
    }

    const systemPrompt =
      'You are an HR interview analyst. Evaluate exactly ONE answer, using ONLY the ' +
      'transcript provided. Every string in evidenceQuotes MUST be copied verbatim from ' +
      'the transcript — do not paraphrase or invent. Do not judge from voice, tone, or ' +
      'appearance. Do not infer protected attributes or make psychological/medical claims. ' +
      'If the answer is short, vague, or off-topic, say so plainly. Return JSON only.';

    const metricLine = metrics
      ? `Measured audio metrics (factual — do NOT re-estimate): source=${metrics.source}, ` +
        `totalDuration=${metrics.totalDurationSeconds ?? 'n/a'}s, ` +
        `speakingTime=${metrics.speakingDurationSeconds ?? 'n/a'}s, ` +
        `wordsPerMinute=${metrics.wordsPerMinute ?? 'n/a'}, pace=${metrics.speakingPace}, ` +
        `longPauses=${metrics.longPauses.length}`
      : 'Measured audio metrics: unavailable.';

    const userPrompt = `Job: ${jobTitle}
Question: ${question.text}
What this question is meant to assess: ${(question.expectedSignals ?? []).join(', ') || 'n/a'}
Evaluation criteria: ${(question.evaluationCriteria ?? []).join(', ') || 'n/a'}
${metricLine}

Candidate answer transcript:
"""
${transcript}
"""

Return JSON with this exact structure:
{
  "answerSummary": "string — 1-2 sentences",
  "relevance": "on_topic | partially_on_topic | off_topic",
  "strengths": ["string"],
  "concerns": ["string"],
  "evidenceQuotes": ["verbatim substrings copied from the transcript above"],
  "coveredSignals": ["which expected signals the answer demonstrated"],
  "missedSignals": ["which expected signals were not addressed"],
  "score": number 1-10,
  "scoreReason": "string — justify the score using the evidence"
}`;

    const result = await this.llm.generateJson<any>({ systemPrompt, userPrompt, temperature: 0.2 });

    // Verify every quote actually appears in the transcript; drop fabricated ones.
    const verifiedQuotes = this.verifyQuotes(result.evidenceQuotes, transcript);
    const dropped = (Array.isArray(result.evidenceQuotes) ? result.evidenceQuotes.length : 0) - verifiedQuotes.length;
    if (dropped > 0) {
      this.logger.warn(`Dropped ${dropped} unverifiable evidence quote(s) for question ${question.id}`);
    }

    return {
      questionId: question.id,
      question: question.text,
      answerTranscript: transcript,
      answerSummary: result.answerSummary ?? '',
      relevance: result.relevance ?? 'partially_on_topic',
      strengths: this.toStringArray(result.strengths),
      concerns: this.toStringArray(result.concerns),
      evidenceQuotes: verifiedQuotes,
      coveredSignals: this.toStringArray(result.coveredSignals),
      missedSignals: this.toStringArray(result.missedSignals),
      score: typeof result.score === 'number' ? result.score : null,
      scoreReason: result.scoreReason ?? '',
      audioMetrics: metrics,
    };
  }

  // ── Stage 2 helper ─────────────────────────────────────────────────────
  private async synthesise(
    interview: {
      candidate: { fullName: string; cvParsedText?: string | null };
      job: { title: string; jdRawText: string | null };
    },
    questionAnalyses: QuestionAnalysis[],
  ) {
    // Strip the heavy transcript/audio fields the synthesis step doesn't need.
    const findings = questionAnalyses.map((qa) => ({
      question: qa.question,
      relevance: qa.relevance,
      score: qa.score,
      answerSummary: qa.answerSummary,
      strengths: qa.strengths,
      concerns: qa.concerns,
      coveredSignals: qa.coveredSignals,
      missedSignals: qa.missedSignals,
      evidenceQuotes: qa.evidenceQuotes,
    }));

    const systemPrompt =
      'You are an HR analyst writing the final interview report. Base EVERY statement only ' +
      'on the provided per-question findings, CV, and JD. Do not invent quotes or facts not ' +
      'present in the inputs. Do not infer protected attributes or make psychological/medical ' +
      'claims. If evidence is insufficient for a judgement, say so. Return JSON only.';

    const userPrompt = `Candidate: ${interview.candidate.fullName}
Job: ${interview.job.title}

CV:
${interview.candidate.cvParsedText || 'Not provided'}

Job Description:
${htmlToText(interview.job.jdRawText ?? '')}

Per-question findings (already grounded in the transcripts):
${JSON.stringify(findings, null, 2)}

Return JSON with this exact structure:
{
  "summary": "string — overall assessment grounded in the findings",
  "cvMatchAnalysis": {
    "matchedClaims": ["string"],
    "missingOrUnclearClaims": ["string"],
    "inconsistenciesToReview": ["string"]
  },
  "jdFitAnalysis": {
    "matchingSkills": ["string"],
    "gaps": ["string"],
    "roleFitSummary": "string"
  },
  "rubricScores": [
    { "criterion": "string", "score": number 1-10, "reason": "string", "evidence": ["string"] }
  ],
  "recommendation": {
    "decision": "strong_yes | yes | maybe | no",
    "reason": "string",
    "followUpQuestions": ["string"]
  }
}`;

    return this.llm.generateJson<any>({ systemPrompt, userPrompt, temperature: 0.3 });
  }

  // Video analysis is not performed; report this honestly rather than fabricating
  // face-presence / camera signals the system never measured.
  private videoSignalsPlaceholder() {
    return {
      available: false,
      notes: [
        'No video analysis was performed. Face presence, eye contact, and camera state were not measured.',
      ],
    };
  }

  // Keep only quotes that appear (whitespace-insensitively) in the transcript.
  private verifyQuotes(quotes: unknown, transcript: string): string[] {
    if (!Array.isArray(quotes)) return [];
    const haystack = this.normalise(transcript);
    return quotes
      .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
      .filter((q) => haystack.includes(this.normalise(q)));
  }

  private normalise(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
  }
}
