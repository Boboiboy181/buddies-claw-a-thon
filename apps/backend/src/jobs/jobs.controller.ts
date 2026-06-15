import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto, @Request() req: any) {
    return this.jobsService.create(dto, req.user.id);
  }

  /** Parse a JD from a public URL (Tavily) or an uploaded PDF/DOCX/TXT file.
   *  Returns { jdRawText } ready to populate the job description editor. */
  @ApiConsumes('multipart/form-data')
  @Post('parse-jd')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async parseJd(@Body('url') url: string, @UploadedFile() file: Express.Multer.File) {
    if (!url && !file) throw new BadRequestException('Provide either a url field or a file upload.');
    return this.jobsService.parseJd({ url, file });
  }

  @Get()
  findAll(@Query() query: { status?: string; keyword?: string; department?: string; level?: string }) {
    return this.jobsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.jobsService.archive(id);
  }

  @Delete(':id/force')
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }
}
