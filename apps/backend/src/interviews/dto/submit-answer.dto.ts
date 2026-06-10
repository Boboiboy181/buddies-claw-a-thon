import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty() @IsString() questionId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() answerAudioUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transcript?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() durationSeconds?: number;
}
