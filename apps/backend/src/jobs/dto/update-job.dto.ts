import { PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { $Enums } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({ enum: $Enums.JobStatus })
  @IsEnum($Enums.JobStatus)
  @IsOptional()
  status?: $Enums.JobStatus;
}
