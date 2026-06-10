import { Module } from '@nestjs/common';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSetsService } from './question-sets.service';
import { QuestionGenerationService } from './question-generation.service';

@Module({
  controllers: [QuestionSetsController],
  providers: [QuestionSetsService, QuestionGenerationService],
  exports: [QuestionSetsService],
})
export class QuestionSetsModule {}
