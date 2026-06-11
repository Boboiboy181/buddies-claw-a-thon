import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSetsService } from './question-sets.service';
import { QuestionGenerationService } from './question-generation.service';

@Module({
  imports: [LlmModule],
  controllers: [QuestionSetsController],
  providers: [QuestionSetsService, QuestionGenerationService],
  exports: [QuestionSetsService],
})
export class QuestionSetsModule {}
