import { IsString, IsOptional, IsEmail, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CandidateInputDto {
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cvFileUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cvText?: string;
}

export class CreateInterviewDto {
  @ApiPropertyOptional() @IsString() @IsOptional() candidateId?: string;
  @ApiPropertyOptional() @ValidateNested() @Type(() => CandidateInputDto) @IsOptional() candidate?: CandidateInputDto;
  @ApiProperty() @IsString() jobId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() questionSetId?: string;
}
