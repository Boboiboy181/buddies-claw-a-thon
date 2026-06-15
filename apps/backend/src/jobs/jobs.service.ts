import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { extractCvText, isSupportedCvType } from '../common/cv-parser.util';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { $Enums } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private config: ConfigService,
  ) {}

  async create(dto: CreateJobDto, userId: string) {
    return this.prisma.job.create({
      data: {
        ...dto,
        requirements: dto.requirements ?? [],
        status: $Enums.JobStatus.DRAFT,
        createdBy: userId,
      },
    });
  }

  async findAll(query: { status?: string; keyword?: string; department?: string; level?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.department) where.department = { contains: query.department, mode: 'insensitive' };
    if (query.level) where.level = { contains: query.level, mode: 'insensitive' };
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { jdRawText: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    return this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questionSets: true, interviews: true } } },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        questionSets: { orderBy: { createdAt: 'desc' } },
        _count: { select: { interviews: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id);
    return this.prisma.job.update({ where: { id }, data: dto });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.job.update({
      where: { id },
      data: { status: $Enums.JobStatus.ARCHIVED },
    });
  }

  async remove(id: string) {
    const job = await this.findOne(id);
    if (job._count.interviews > 0) {
      throw new BadRequestException('Job has associated interviews and cannot be deleted.');
    }
    await this.prisma.job.delete({ where: { id } });
  }

  async parseJd(input: { url?: string; file?: Express.Multer.File }): Promise<{ jdRawText: string }> {
    let rawText: string;

    if (input.url) {
      rawText = await this.scrapeUrlWithTavily(input.url);
    } else if (input.file) {
      if (!isSupportedCvType(input.file.mimetype, input.file.originalname)) {
        throw new BadRequestException('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      }
      rawText = await extractCvText(input.file.buffer, input.file.mimetype, input.file.originalname);
    } else {
      throw new BadRequestException('Either url or file is required.');
    }

    if (!rawText?.trim()) {
      throw new BadRequestException('No content could be extracted from the provided source.');
    }

    const { jdRawText } = await this.llm.generateJson<{ jdRawText: string }>({
      systemPrompt: `You are a job description formatter. Extract and clean the job description from the raw text provided by the user.

Return JSON with a single key "jdRawText" containing well-formatted HTML.
Use only these tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
Structure the content into clear sections: role overview, responsibilities, requirements, nice-to-have skills, benefits.
Remove all navigation bars, cookie notices, ads, social media links, and unrelated page content.
Keep all actual job-related content intact. Output valid HTML only — no markdown, no code fences.`,
      userPrompt: rawText.slice(0, 12000),
      temperature: 0.1,
    });

    return { jdRawText };
  }

  private async scrapeUrlWithTavily(url: string): Promise<string> {
    const apiKey = this.config.get<string>('TAVILY_API_KEY')?.trim();
    if (!apiKey) throw new BadRequestException('TAVILY_API_KEY is not configured on the server.');

    const res = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, urls: [url] }),
    });

    if (!res.ok) {
      this.logger.warn(`Tavily extract failed: ${res.status} ${res.statusText}`);
      throw new BadRequestException('Failed to fetch the URL. Check that it is publicly accessible.');
    }

    const data = await res.json() as { results?: Array<{ raw_content?: string }> };
    const content = data.results?.[0]?.raw_content ?? '';
    if (!content) throw new BadRequestException('No content found at the provided URL.');
    return content;
  }
}
