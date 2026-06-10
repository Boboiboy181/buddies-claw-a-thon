import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@ApiTags('interviews')
@Controller()
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  // ── HR endpoints ──────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('interviews')
  create(@Body() dto: CreateInterviewDto, @Request() req: any) {
    return this.interviewsService.create(dto, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('interviews')
  findAll(@Query() query: { candidateId?: string; jobId?: string; status?: string }) {
    return this.interviewsService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('interviews/:id')
  findOne(@Param('id') id: string) {
    return this.interviewsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('interviews/:id/report')
  getReport(@Param('id') id: string) {
    return this.interviewsService.getReport(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('interviews/:id/recording')
  getRecording(@Param('id') id: string) {
    return this.interviewsService.getRecordingUrl(id);
  }

  // ── Candidate endpoints ───────────────────────────────────────────────────

  @Get('candidate/interviews/:token')
  getByToken(@Param('token') token: string) {
    return this.interviewsService.findByToken(token);
  }

  @Post('candidate/interviews/:id/consent')
  acceptConsent(@Param('id') id: string) {
    return this.interviewsService.acceptConsent(id);
  }

  @Post('candidate/interviews/:id/start')
  start(@Param('id') id: string) {
    return this.interviewsService.start(id);
  }

  @Post('candidate/interviews/:id/answers')
  submitAnswer(@Param('id') id: string, @Body() dto: SubmitAnswerDto) {
    return this.interviewsService.submitAnswer(id, dto);
  }

  @Post('candidate/interviews/:id/finish')
  finish(@Param('id') id: string) {
    return this.interviewsService.finish(id);
  }
}
