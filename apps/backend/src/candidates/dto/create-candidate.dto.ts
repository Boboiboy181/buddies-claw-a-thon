import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateDto {
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cvFileUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cvText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
