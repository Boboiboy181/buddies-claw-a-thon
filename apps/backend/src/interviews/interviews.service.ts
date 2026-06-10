import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { $Enums } from '@prisma/client';
import { QUEUE_REPORT_GENERATION, JOB_GENERATE_REPORT } from '../queue/queue.constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_REPORT_GENERATION) private reportQueue: Queue,
  ) {}

  async create(dto: CreateInterviewDto, userId: string) {
    // Resolve or create candidate
    let candidateId = dto.candidateId;
    if (!candidateId && dto.candidate) {
      const existing = await this.prisma.candidate.findUnique({ where: { email: dto.candidate.email } });
      if (existing) {
        candidateId = existing.id;
      } else {
        const created = await this.prisma.candidate.create({
          data: {
            fullName: dto.candidate.fullName,
            email: dto.candidate.email,
            phone: dto.candidate.phone,
            cvFileUrl: dto.candidate.cvFileUrl,
            cvParsedText: dto.candidate.cvText,
          },
        });
        candidateId = created.id;
      }
    }
    if (!candidateId) throw new BadRequestException('candidateId or candidate info required');

    // Resolve question set
    let questionSetId = dto.questionSetId;
    if (!questionSetId) {
      const activeSet = await this.prisma.questionSet.findFirst({
        where: { jobId: dto.jobId, status: $Enums.QuestionSetStatus.ACTIVE },
      });
      if (activeSet) questionSetId = activeSet.id;
    }

    // Load questions for snapshot
    let snapshotQuestions: any[] = [];
    if (questionSetId) {
      const qs = await this.prisma.questionSet.findUnique({
        where: { id: questionSetId },
        include: { questions: { orderBy: { order: 'asc' } } },
      });
      if (qs) snapshotQuestions = qs.questions;
    }

    const interview = await this.prisma.interview.create({
      data: {
        candidateId,
        jobId: dto.jobId,
        questionSetId,
        questionSetSnapshotJson: snapshotQuestions,
        status: $Enums.InterviewStatus.CREATED,
        state: $Enums.InterviewState.INIT,
        accessToken: uuidv4(),
        createdBy: userId,
        questions: {
          create: snapshotQuestions.map((q: any) => ({
            sourceQuestionBankItemId: q.id,
            order: q.order,
            text: q.text,
            category: q.category,
            expectedSignals: q.expectedSignals ?? [],
            evaluationCriteria: q.evaluationCriteria ?? [],
            maxDurationSeconds: q.maxDurationSeconds ?? 120,
            isRequired: q.isRequired ?? true,
          })),
        },
      },
      include: { candidate: true, job: true },
    });

    return {
      ...interview,
      accessToken: interview.accessToken,
      candidateLink: `/interview/${interview.accessToken}`,
    };
  }

  async findAll(query: { candidateId?: string; jobId?: string; status?: string }) {
    const where: any = {};
    if (query.candidateId) where.candidateId = query.candidateId;
    if (query.jobId) where.jobId = query.jobId;
    if (query.status) where.status = query.status;
    return this.prisma.interview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
        report: { select: { id: true, recommendation: true } },
      },
    });
  }

  async findOne(id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
        questions: { orderBy: { order: 'asc' } },
        answers: { include: { question: true } },
        report: true,
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async findByToken(token: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { accessToken: token },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true, jdRawText: true } },
        questions: { orderBy: { order: 'asc' } },
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async acceptConsent(id: string) {
    return this.prisma.interview.update({
      where: { id },
      data: {
        consentAcceptedAt: new Date(),
        status: $Enums.InterviewStatus.CONSENT_ACCEPTED,
        state: $Enums.InterviewState.READY_CHECK,
      },
    });
  }

  async start(id: string) {
    const interview = await this.findOne(id);
    return this.prisma.interview.update({
      where: { id },
      data: {
        startedAt: new Date(),
        status: $Enums.InterviewStatus.IN_PROGRESS,
        state: $Enums.InterviewState.AGENT_GREETING,
      },
    });
  }

  async submitAnswer(id: string, dto: SubmitAnswerDto) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    // Upsert answer
    const answer = await this.prisma.interviewAnswer.upsert({
      where: { questionId: dto.questionId },
      create: {
        interviewId: id,
        questionId: dto.questionId,
        answerAudioUrl: dto.answerAudioUrl,
        transcript: dto.transcript,
        durationSeconds: dto.durationSeconds,
      },
      update: {
        transcript: dto.transcript,
        answerAudioUrl: dto.answerAudioUrl,
        durationSeconds: dto.durationSeconds,
      },
    });

    // Advance question index
    const nextIndex = interview.currentQuestionIndex + 1;
    const hasMore = nextIndex < interview.questions.length;

    await this.prisma.interview.update({
      where: { id },
      data: {
        currentQuestionIndex: nextIndex,
        state: hasMore ? $Enums.InterviewState.ASKING_QUESTION : $Enums.InterviewState.COMPLETED,
      },
    });

    return { answer, hasMore, nextQuestionIndex: hasMore ? nextIndex : null };
  }

  async finish(id: string) {
    await this.prisma.interview.update({
      where: { id },
      data: {
        endedAt: new Date(),
        status: $Enums.InterviewStatus.COMPLETED,
        state: $Enums.InterviewState.REPORT_GENERATING,
      },
    });

    // Enqueue report generation
    await this.reportQueue.add(JOB_GENERATE_REPORT, { interviewId: id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Interview ${id} finished, report queued`);
    return { status: 'processing', message: 'Interview completed. Report is being generated.' };
  }

  async getReport(id: string) {
    const report = await this.prisma.interviewReport.findUnique({ where: { interviewId: id } });
    if (!report) throw new NotFoundException('Report not found or not ready yet');
    return report;
  }

  async getRecordingUrl(id: string) {
    const interview = await this.prisma.interview.findUnique({ where: { id } });
    if (!interview?.recordingUrl) throw new NotFoundException('Recording not available');
    // Log audit
    await this.prisma.auditLog.create({
      data: { action: 'VIEW_RECORDING', resourceType: 'interview', resourceId: id, interviewId: id },
    });
    return { recordingUrl: interview.recordingUrl };
  }
}
