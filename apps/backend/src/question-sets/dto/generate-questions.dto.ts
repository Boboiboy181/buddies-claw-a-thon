import { IsNumber, IsArray, IsString, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateQuestionsDto {
  @ApiProperty({ minimum: 3, maximum: 20 }) @IsNumber() @Min(3) @Max(20) questionCount: number;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) categories: string[];
  @ApiProperty({ enum: ['vi', 'en'] }) @IsString() language: 'vi' | 'en';
  @ApiPropertyOptional({ enum: ['junior', 'middle', 'senior'] }) @IsString() @IsOptional() difficulty?: string;
  @ApiProperty() @IsBoolean() includeSalaryQuestion: boolean;
  @ApiProperty() @IsBoolean() includeMotivationQuestion: boolean;
}
