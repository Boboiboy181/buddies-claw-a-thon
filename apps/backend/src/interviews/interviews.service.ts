import { Injectable, NotFoundException, BadRequestException, GoneException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { $Enums } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { interviewInvite } from '../mail/mail.templates';
import { QUEUE_REPORT_GENERATION, JOB_GENERATE_REPORT } from '../queue/queue.constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    @InjectQueue(QUEUE_REPORT_GENERATION) private reportQueue: Queue,
  ) {}

  /** Absolute candidate interview URL from the configured frontend origin. */
  private candidateUrl(token: string): string {
    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/+$/, '');
    return `${base}/interview/${token}`;
  }

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

    const expiryDays = parseInt(this.config.get<string>('INVITE_EXPIRY_DAYS', '7'), 10);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const interview = await this.prisma.interview.create({
      data: {
        candidateId,
        jobId: dto.jobId,
        questionSetId,
        questionSetSnapshotJson: snapshotQuestions,
        status: $Enums.InterviewStatus.INVITED,
        state: $Enums.InterviewState.CONSENT_PENDING,
        accessToken: uuidv4(),
        expiresAt,
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

    // Best-effort invite e-mail — a mail failure must not fail interview creation.
    const link = this.candidateUrl(interview.accessToken);
    const emailed = await this.mail.send({
      to: interview.candidate.email,
      ...interviewInvite({
        candidateName: interview.candidate.fullName,
        jobTitle: interview.job.title,
        link,
        expiresAt: interview.expiresAt,
      }),
    });

    return {
      ...interview,
      accessToken: interview.accessToken,
      candidateLink: `/interview/${interview.accessToken}`,
      inviteEmailSent: emailed,
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
    // Reject expired invitations, but only before the interview has started —
    // a candidate who began in time should never be locked out mid-session.
    const notStarted =
      interview.status === $Enums.InterviewStatus.CREATED ||
      interview.status === $Enums.InterviewStatus.INVITED ||
      interview.status === $Enums.InterviewStatus.CONSENT_ACCEPTED;
    if (interview.expiresAt && interview.expiresAt < new Date() && notStarted) {
      throw new GoneException('This interview invitation has expired');
    }
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
