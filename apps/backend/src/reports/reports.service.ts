import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums } from '@prisma/client';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly llm: LlmService,
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
      const qaText = interview.questions.map((q) => {
        const answer = interview.answers.find((a) => a.questionId === q.id);
        return `Q${q.order}: ${q.text}\nA: ${answer?.transcript || '[No answer recorded]'}`;
      }).join('\n\n');

      const systemPrompt = `You are an HR interview analysis assistant. Analyze the candidate based on transcript, CV, JD, and rubric. Use only provided evidence. Do not infer protected attributes. Do not make psychological or medical claims. Do not judge honesty from facial expressions or voice. Provide structured JSON output. Every score must include evidence from transcript, CV, or JD.`;

      const userPrompt = `Analyze this interview and return a JSON report.

Candidate: ${interview.candidate.fullName}
Job: ${interview.job.title}

CV:
${interview.candidate.cvParsedText || 'Not provided'}

Job Description:
${interview.job.jdRawText}

Interview Q&A:
${qaText}

Return JSON with this structure:
{
  "summary": "string",
  "questionAnalyses": [
    {
      "questionId": "string",
      "question": "string",
      "answerTranscript": "string",
      "answerSummary": "string",
      "strengths": ["string"],
      "concerns": ["string"],
      "evidenceQuotes": ["string"],
      "score": number (1-10),
      "scoreReason": "string"
    }
  ],
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
  "audioReviewSignals": {
    "speakingDurationSeconds": number,
    "longPauses": [],
    "speakingPace": "normal",
    "notes": ["string"]
  },
  "videoReviewSignals": {
    "facePresenceRatio": null,
    "cameraOffPeriods": [],
    "reviewHighlights": [],
    "notes": ["Based on available data only. These are observational signals, not psychological assessments."]
  },
  "rubricScores": [
    { "criterion": "string", "score": number, "reason": "string", "evidence": ["string"] }
  ],
  "recommendation": {
    "decision": "strong_yes|yes|maybe|no",
    "reason": "string",
    "followUpQuestions": ["string"]
  }
}`;

      const analysis = await this.llm.generateJson<any>({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
      });

      const report = await this.prisma.interviewReport.upsert({
        where: { interviewId },
        create: {
          interviewId,
          summary: analysis.summary,
          qaAnalysisJson: analysis.questionAnalyses,
          cvMatchAnalysisJson: analysis.cvMatchAnalysis,
          jdFitAnalysisJson: analysis.jdFitAnalysis,
          audioReviewSignalsJson: analysis.audioReviewSignals,
          videoReviewSignalsJson: analysis.videoReviewSignals,
          rubricScoresJson: analysis.rubricScores,
          recommendation: analysis.recommendation,
          riskFlagsJson: [],
        },
        update: {
          summary: analysis.summary,
          qaAnalysisJson: analysis.questionAnalyses,
          cvMatchAnalysisJson: analysis.cvMatchAnalysis,
          jdFitAnalysisJson: analysis.jdFitAnalysis,
          audioReviewSignalsJson: analysis.audioReviewSignals,
          videoReviewSignalsJson: analysis.videoReviewSignals,
          rubricScoresJson: analysis.rubricScores,
          recommendation: analysis.recommendation,
        },
      });

      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { status: $Enums.InterviewStatus.REPORT_READY },
      });

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
}
