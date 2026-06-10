import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';

export class CreateQuestionDto {
  @ApiProperty() @IsNumber() order: number;
  @ApiProperty() @IsString() text: string;
  @ApiPropertyOptional({ enum: $Enums.QuestionCategory }) @IsEnum($Enums.QuestionCategory) @IsOptional() category?: $Enums.QuestionCategory;
  @ApiPropertyOptional() @IsArray() @IsOptional() expectedSignals?: string[];
  @ApiPropertyOptional() @IsArray() @IsOptional() evaluationCriteria?: string[];
  @ApiPropertyOptional() @IsNumber() @IsOptional() maxDurationSeconds?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isRequired?: boolean;
}
