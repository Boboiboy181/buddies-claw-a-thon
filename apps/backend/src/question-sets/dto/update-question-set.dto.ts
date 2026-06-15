import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';

export class UpdateQuestionSetDto {
  @ApiProperty({ enum: $Enums.QuestionSetStatus })
  @IsEnum($Enums.QuestionSetStatus)
  status: $Enums.QuestionSetStatus;
}
