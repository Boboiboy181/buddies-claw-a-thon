import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { $Enums } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

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
}
