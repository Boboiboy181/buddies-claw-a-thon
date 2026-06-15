import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { extractCvText, isSupportedCvType } from '../common/cv-parser.util';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('candidates')
export class CandidatesController {
  constructor(private candidatesService: CandidatesService) {}

  @Post()
  create(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(dto);
  }

  /** Extracts plain text from an uploaded CV file (PDF / DOCX / TXT) so HR can
   *  auto-fill the candidate's CV instead of pasting it manually. */
  @ApiConsumes('multipart/form-data')
  @Post('parse-cv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async parseCv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('CV file is required (field "file")');
    if (!isSupportedCvType(file.mimetype, file.originalname)) {
      throw new BadRequestException('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
    }
    let cvText: string;
    try {
      cvText = await extractCvText(file.buffer, file.mimetype, file.originalname);
    } catch {
      throw new BadRequestException('This file looks corrupted or unreadable. Please try another file.');
    }
    if (!cvText) {
      throw new BadRequestException(
        'No text could be extracted — the file may be empty or a scanned image. Please paste the CV text manually.',
      );
    }
    return { cvText, filename: file.originalname };
  }

  @Get()
  findAll() {
    return this.candidatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidatesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCandidateDto>) {
    return this.candidatesService.update(id, dto);
  }
}
