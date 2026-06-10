import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionSetsService } from './question-sets.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';

@ApiTags('question-sets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class QuestionSetsController {
  constructor(private qs: QuestionSetsService) {}

  @Post('jobs/:jobId/question-sets/generate')
  generate(@Param('jobId') jobId: string, @Body() dto: GenerateQuestionsDto, @Request() req: any) {
    return this.qs.generate(jobId, dto, req.user.id);
  }

  @Get('jobs/:jobId/question-sets')
  findByJob(@Param('jobId') jobId: string) {
    return this.qs.findByJob(jobId);
  }

  @Get('question-sets/:id')
  findOne(@Param('id') id: string) {
    return this.qs.findOne(id);
  }

  @Post('question-sets/:id/questions')
  addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.qs.addQuestion(id, dto);
  }

  @Patch('question-sets/:id/questions/:qId')
  updateQuestion(@Param('id') id: string, @Param('qId') qId: string, @Body() dto: Partial<CreateQuestionDto>) {
    return this.qs.updateQuestion(id, qId, dto);
  }

  @Delete('question-sets/:id/questions/:qId')
  deleteQuestion(@Param('id') id: string, @Param('qId') qId: string) {
    return this.qs.deleteQuestion(id, qId);
  }

  @Patch('question-sets/:id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderQuestionsDto) {
    return this.qs.reorderQuestions(id, dto.questions);
  }

  @Post('question-sets/:id/activate')
  activate(@Param('id') id: string) {
    return this.qs.activate(id);
  }
}
