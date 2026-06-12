import {
  Controller,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InterviewOrchestratorService } from './orchestrator.service';

@ApiTags('orchestrator')
@Controller('orchestrator/interviews/:id')
export class OrchestratorController {
  constructor(private orchestrator: InterviewOrchestratorService) {}

  // ── HR-driven (JWT protected) ───────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('setup-room')
  setupRoom(@Param('id') id: string) {
    return this.orchestrator.setupRoom(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('invite')
  sendInvite(@Param('id') id: string) {
    return this.orchestrator.sendInvite(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('prewarm-tts')
  prewarmTts(@Param('id') id: string) {
    return this.orchestrator.prewarmTts(id);
  }

  // ── Candidate-driven (public, like other candidate endpoints) ──────

  /** Returns the Daily room URL + a candidate-scoped meeting token. Public so the
   *  interview page (token link, no JWT) can join the video room. */
  @Post('join-room')
  joinRoom(@Param('id') id: string) {
    return this.orchestrator.joinRoom(id);
  }

  @Post('consent')
  async consent(@Param('id') id: string) {
    await this.orchestrator.onConsentAccepted(id);
    return { ok: true };
  }

  @Post('start-greeting')
  async startGreeting(@Param('id') id: string) {
    await this.orchestrator.startGreeting(id);
    return { ok: true };
  }

  @Post('next-question')
  async nextQuestion(
    @Param('id') id: string,
    @Query('index', new ParseIntPipe({ optional: true })) index?: number,
  ) {
    await this.orchestrator.askQuestion(id, index ?? 0);
    return { ok: true };
  }

  @Post('start-listening')
  async startListening(@Param('id') id: string, @Body() body: { questionId: string }) {
    if (!body?.questionId) throw new BadRequestException('questionId is required');
    await this.orchestrator.startListening(id, body.questionId);
    return { ok: true };
  }

  @ApiConsumes('multipart/form-data')
  @Post('process-answer')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async processAnswer(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { questionId: string; durationSeconds?: string },
  ) {
    if (!file) throw new BadRequestException('audio file is required (field "audio")');
    if (!body?.questionId) throw new BadRequestException('questionId is required');
    const transcript = await this.orchestrator.processAnswer(id, body.questionId, file.buffer, {
      mimetype: file.mimetype,
      durationSeconds: body.durationSeconds ? parseInt(body.durationSeconds, 10) : undefined,
    });
    return { transcript };
  }

  @Post('advance')
  advance(@Param('id') id: string) {
    return this.orchestrator.advanceInterview(id);
  }

  @Post('finish')
  async finish(@Param('id') id: string) {
    await this.orchestrator.finishInterview(id);
    return { ok: true };
  }
}
