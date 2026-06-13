import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TtsService } from '../tts/tts.service';
import { SttService } from '../stt/stt.service';
import { StorageService } from '../storage/storage.service';
import { DailyService } from '../daily/daily.service';
import { LivekitService } from '../livekit/livekit.service';
import { InterviewGateway } from '../gateway/interview.gateway';
import { QUEUE_REPORT_GENERATION, JOB_GENERATE_REPORT } from '../queue/queue.constants';

const DEFAULT_GREETING_VI =
  'Xin chào! Tôi là trợ lý phỏng vấn AI. Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. ' +
  'Tôi sẽ lần lượt đọc từng câu hỏi, bạn hãy trả lời sau khi nghe xong. Chúng ta bắt đầu nhé!';

const DEFAULT_CLOSING_VI =
  'Cảm ơn bạn đã hoàn thành buổi phỏng vấn hôm nay. Chúng tôi sẽ xem xét các câu trả lời của bạn ' +
  'và phản hồi trong thời gian sớm nhất. Chúc bạn một ngày tốt lành!';

@Injectable()
export class InterviewOrchestratorService {
  private readonly logger = new Logger(InterviewOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private tts: TtsService,
    private stt: SttService,
    private storage: StorageService,
    private daily: DailyService,
    private livekit: LivekitService,
    private gateway: InterviewGateway,
    private config: ConfigService,
    @InjectQueue(QUEUE_REPORT_GENERATION) private reportQueue: Queue,
  ) {}

  // ── Giai đoạn 1: Setup ──────────────────────────────────────────────

  async setupRoom(interviewId: string) {
    const interview = await this.getInterview(interviewId);

    if (this.livekit.isConfigured) {
      const room = await this.livekit.ensureRoom(interviewId);
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { dailyRoomName: room.name, dailyRoomUrl: room.url },
      });
      const [hostToken, candidateToken] = await Promise.all([
        this.livekit.getAccessToken(room.name, `host-${interviewId}`, true),
        this.livekit.getAccessToken(room.name, `candidate-${interviewId}`, false),
      ]);
      this.prewarmTts(interviewId).catch((err) =>
        this.logger.warn(`TTS prewarm failed for ${interviewId}: ${err.message}`),
      );
      return { provider: 'livekit', roomUrl: room.url, hostToken, candidateToken };
    }

    let roomName = interview.dailyRoomName;
    let roomUrl = interview.dailyRoomUrl;
    if (!roomName || !roomUrl) {
      const room = await this.daily.createRoom(interviewId);
      roomName = room.name;
      roomUrl = room.url;
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { dailyRoomName: roomName, dailyRoomUrl: roomUrl },
      });
    }

    const [hostToken, candidateToken] = await Promise.all([
      this.daily.getMeetingToken(roomName, `host-${interviewId}`, true),
      this.daily.getMeetingToken(roomName, `candidate-${interviewId}`, false),
    ]);

    // Prewarm TTS in background so the first question plays without delay
    this.prewarmTts(interviewId).catch((err) =>
      this.logger.warn(`TTS prewarm failed for ${interviewId}: ${err.message}`),
    );

    return { roomUrl, hostToken, candidateToken };
  }

  /** Candidate-side room join: ensures the room exists and returns a
   *  non-owner meeting token. Called from the public interview page.
   *  Prefers LiveKit when configured; falls back to Daily. */
  async joinRoom(interviewId: string) {
    const interview = await this.getInterview(interviewId);

    if (this.livekit.isConfigured) {
      const room = await this.livekit.ensureRoom(interviewId);
      if (interview.dailyRoomName !== room.name || interview.dailyRoomUrl !== room.url) {
        await this.prisma.interview.update({
          where: { id: interviewId },
          data: { dailyRoomName: room.name, dailyRoomUrl: room.url },
        });
      }
      const candidateToken = await this.livekit.getAccessToken(
        room.name,
        `candidate-${interviewId}`,
        false,
      );
      return { provider: 'livekit', roomUrl: room.url, candidateToken };
    }

    let roomName = interview.dailyRoomName;
    let roomUrl = interview.dailyRoomUrl;
    if (!roomName || !roomUrl) {
      const room = await this.daily.createRoom(interviewId);
      roomName = room.name;
      roomUrl = room.url;
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { dailyRoomName: roomName, dailyRoomUrl: roomUrl },
      });
    }

    const candidateToken = await this.daily.getMeetingToken(
      roomName,
      `candidate-${interviewId}`,
      false,
    );
    return { provider: 'daily', roomUrl, candidateToken };
  }

  // ── Giai đoạn 2: Invite ─────────────────────────────────────────────

  async sendInvite(interviewId: string) {
    const interview = await this.getInterview(interviewId);
    await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: $Enums.InterviewStatus.INVITED,
        state: $Enums.InterviewState.CONSENT_PENDING,
      },
    });
    this.gateway.emitStateChange(interviewId, $Enums.InterviewState.CONSENT_PENDING);
    return { candidateLink: `/interview/${interview.accessToken}` };
  }

  // ── Giai đoạn 3: Consent accepted ───────────────────────────────────

  async onConsentAccepted(interviewId: string) {
    await this.getInterview(interviewId);
    await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        consentAcceptedAt: new Date(),
        status: $Enums.InterviewStatus.CONSENT_ACCEPTED,
        state: $Enums.InterviewState.READY_CHECK,
      },
    });
    this.gateway.emitStateChange(interviewId, $Enums.InterviewState.READY_CHECK);
  }

  // ── Giai đoạn 4: Greeting ───────────────────────────────────────────

  async startGreeting(interviewId: string) {
    const interview = await this.getInterview(interviewId);

    // Start cloud recording now that the candidate is in the room.
    // Best-effort: recording failures must not block the interview.
    if (interview.dailyRoomName) {
      const recorder = this.livekit.isConfigured ? this.livekit : this.daily;
      recorder
        .startRecording(interview.dailyRoomName)
        .catch((err) => this.logger.warn(`startRecording failed for ${interviewId}: ${err.message}`));
    }

    await this.runOrFail(interviewId, async () => {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          startedAt: new Date(),
          status: $Enums.InterviewStatus.IN_PROGRESS,
          state: $Enums.InterviewState.AGENT_GREETING,
        },
      });
      this.gateway.emitStateChange(interviewId, $Enums.InterviewState.AGENT_GREETING);

      const greetingText = this.config.get('AGENT_GREETING_TEXT', DEFAULT_GREETING_VI);
      const { extension, contentType } = this.tts.audioFormat;
      const key = `interviews/${interviewId}/tts/greeting.${extension}`;
      const buffer = await this.tts.synthesize(greetingText);
      await this.storage.uploadBuffer(buffer, key, contentType);
      const audioUrl = await this.storage.getSignedDownloadUrl(key);

      this.gateway.emitAgentSpeak(interviewId, { type: 'greeting', text: greetingText, audioUrl });
    });
  }

  // ── Giai đoạn 5: Ask question ───────────────────────────────────────

  async askQuestion(interviewId: string, questionIndex: number) {
    const interview = await this.getInterview(interviewId, { questions: { orderBy: { order: 'asc' } } });
    const question = (interview as any).questions[questionIndex];
    if (!question) throw new BadRequestException(`No question at index ${questionIndex}`);

    await this.runOrFail(interviewId, async () => {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          state: $Enums.InterviewState.ASKING_QUESTION,
          currentQuestionIndex: questionIndex,
        },
      });
      this.gateway.emitStateChange(interviewId, $Enums.InterviewState.ASKING_QUESTION, {
        questionIndex,
        questionId: question.id,
      });

      const key = await this.ensureQuestionTts(interviewId, question);
      const audioUrl = await this.storage.getSignedDownloadUrl(key);

      this.gateway.emitAgentSpeak(interviewId, {
        type: 'question',
        text: question.text,
        audioUrl,
        questionId: question.id,
      });
    });
  }

  /** Re-plays the current question on candidate request ("repeat"). Reuses the
   *  cached TTS audio and does not advance or penalize time — the answer timer
   *  restarts when listening resumes after the replay. */
  async repeatQuestion(interviewId: string) {
    const interview = await this.getInterview(interviewId, { questions: { orderBy: { order: 'asc' } } });
    const question = (interview as any).questions[interview.currentQuestionIndex];
    if (!question) throw new BadRequestException('No current question to repeat');

    await this.runOrFail(interviewId, async () => {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { state: $Enums.InterviewState.ASKING_QUESTION },
      });
      this.gateway.emitStateChange(interviewId, $Enums.InterviewState.ASKING_QUESTION, {
        questionIndex: interview.currentQuestionIndex,
        questionId: question.id,
      });

      const key = await this.ensureQuestionTts(interviewId, question);
      const audioUrl = await this.storage.getSignedDownloadUrl(key);
      this.gateway.emitAgentSpeak(interviewId, {
        type: 'question',
        text: question.text,
        audioUrl,
        questionId: question.id,
      });
    });
  }

  // ── Giai đoạn 6: Start listening ────────────────────────────────────

  async startListening(interviewId: string, questionId: string) {
    const question = await this.prisma.interviewQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.interviewId !== interviewId) {
      throw new NotFoundException('Question not found for this interview');
    }
    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { state: $Enums.InterviewState.LISTENING_ANSWER },
    });
    this.gateway.emitStateChange(interviewId, $Enums.InterviewState.LISTENING_ANSWER, { questionId });
    this.gateway.emitStartListening(interviewId, questionId, question.maxDurationSeconds);
  }

  // ── Giai đoạn 7: Process answer ─────────────────────────────────────

  async processAnswer(
    interviewId: string,
    questionId: string,
    audioBuffer: Buffer,
    options: { mimetype?: string; durationSeconds?: number } = {},
  ): Promise<string> {
    const question = await this.prisma.interviewQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.interviewId !== interviewId) {
      throw new NotFoundException('Question not found for this interview');
    }

    return this.runOrFail(interviewId, async () => {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { state: $Enums.InterviewState.PROCESSING_ANSWER },
      });
      this.gateway.emitStateChange(interviewId, $Enums.InterviewState.PROCESSING_ANSWER, { questionId });

      const mimetype = options.mimetype || 'audio/webm';
      const ext = mimetype.includes('webm') ? 'webm' : mimetype.includes('wav') ? 'wav' : 'mp3';
      const key = `interviews/${interviewId}/answers/${questionId}.${ext}`;
      await this.storage.uploadBuffer(audioBuffer, key, mimetype);

      const language = this.config.get('AGENT_LANGUAGE', 'vi');
      const transcript = await this.stt.transcribe(audioBuffer, `answer.${ext}`, language);

      await this.prisma.interviewAnswer.upsert({
        where: { questionId },
        create: {
          interviewId,
          questionId,
          answerAudioUrl: key,
          transcript,
          durationSeconds: options.durationSeconds,
        },
        update: {
          answerAudioUrl: key,
          transcript,
          durationSeconds: options.durationSeconds,
        },
      });

      this.gateway.emitStateChange(interviewId, $Enums.InterviewState.AGENT_RESPONSE, {
        questionId,
        transcript,
      });

      return transcript;
    });
  }

  // ── Giai đoạn 8: Advance ────────────────────────────────────────────

  async advanceInterview(interviewId: string) {
    const interview = await this.getInterview(interviewId, { questions: { orderBy: { order: 'asc' } } });
    const nextIndex = interview.currentQuestionIndex + 1;
    const hasMore = nextIndex < (interview as any).questions.length;

    if (hasMore) {
      await this.askQuestion(interviewId, nextIndex);
      return { done: false, nextQuestionIndex: nextIndex };
    }
    // Speak a closing thank-you before completing. Best-effort: a TTS failure
    // must not block finishing (report generation is queued server-side either way).
    await this.playClosing(interviewId).catch((err) =>
      this.logger.warn(`Closing TTS failed for ${interviewId}: ${err.message}`),
    );
    await this.finishInterview(interviewId);
    return { done: true, nextQuestionIndex: null };
  }

  /** Synthesizes and emits the agent's closing thank-you message (type 'closing'). */
  async playClosing(interviewId: string) {
    const closingText = this.config.get('AGENT_CLOSING_TEXT', DEFAULT_CLOSING_VI);
    const { extension, contentType } = this.tts.audioFormat;
    const key = `interviews/${interviewId}/tts/closing.${extension}`;
    const buffer = await this.tts.synthesize(closingText);
    await this.storage.uploadBuffer(buffer, key, contentType);
    const audioUrl = await this.storage.getSignedDownloadUrl(key);
    this.gateway.emitAgentSpeak(interviewId, { type: 'closing', text: closingText, audioUrl });
  }

  // ── Giai đoạn 9: Finish ─────────────────────────────────────────────

  async finishInterview(interviewId: string) {
    const interview = await this.getInterview(interviewId);

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        endedAt: new Date(),
        status: $Enums.InterviewStatus.COMPLETED,
        state: $Enums.InterviewState.COMPLETED,
      },
    });
    this.gateway.emitStateChange(interviewId, $Enums.InterviewState.COMPLETED);

    if (interview.dailyRoomName) {
      try {
        const recorder = this.livekit.isConfigured ? this.livekit : this.daily;
        await recorder.stopRecording(interview.dailyRoomName);
      } catch (err: any) {
        this.logger.warn(`stopRecording failed for ${interviewId}: ${err.message}`);
      }
    }

    this.gateway.emitInterviewCompleted(interviewId);

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { state: $Enums.InterviewState.REPORT_GENERATING },
    });
    this.gateway.emitStateChange(interviewId, $Enums.InterviewState.REPORT_GENERATING);
    await this.reportQueue.add(
      JOB_GENERATE_REPORT,
      { interviewId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(`Interview ${interviewId} finished, report queued`);
  }

  // ── TTS prewarm ─────────────────────────────────────────────────────

  async prewarmTts(interviewId: string) {
    const questions = await this.prisma.interviewQuestion.findMany({
      where: { interviewId, ttsAudioUrl: null },
      orderBy: { order: 'asc' },
    });
    if (questions.length === 0) return { prewarmed: 0 };

    // Sequential on purpose: the TTS provider rate-limits bursts (429),
    // and parallel synthesis of a whole question set trips it.
    for (const q of questions) {
      await this.ensureQuestionTts(interviewId, q);
    }
    this.logger.log(`Prewarmed TTS for ${questions.length} questions of interview ${interviewId}`);
    return { prewarmed: questions.length };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Returns the storage key for the question's TTS audio, synthesizing and
   * uploading it if not yet cached. ttsAudioUrl stores the storage key
   * (interviews/{interviewId}/tts/{questionId}.{wav|mp3}); signed URLs are
   * generated on emit since they expire.
   */
  private async ensureQuestionTts(
    interviewId: string,
    question: { id: string; text: string; ttsAudioUrl: string | null },
  ): Promise<string> {
    if (question.ttsAudioUrl) return question.ttsAudioUrl;

    const { extension, contentType } = this.tts.audioFormat;
    const key = `interviews/${interviewId}/tts/${question.id}.${extension}`;
    const buffer = await this.tts.synthesize(question.text);
    await this.storage.uploadBuffer(buffer, key, contentType);
    await this.prisma.interviewQuestion.update({
      where: { id: question.id },
      data: { ttsAudioUrl: key },
    });
    return key;
  }

  private async getInterview(interviewId: string, include?: any) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      ...(include ? { include } : {}),
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  /** Runs fn; on unrecoverable error sets state FAILED and notifies clients. */
  private async runOrFail<T>(interviewId: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      this.logger.error(`Interview ${interviewId} failed: ${err.message}`, err.stack);
      await this.prisma.interview
        .update({
          where: { id: interviewId },
          data: { state: $Enums.InterviewState.FAILED, status: $Enums.InterviewStatus.FAILED },
        })
        .catch(() => undefined);
      this.gateway.emitStateChange(interviewId, $Enums.InterviewState.FAILED);
      this.gateway.emitError(interviewId, err.message ?? 'Interview failed');
      throw err;
    }
  }
}
