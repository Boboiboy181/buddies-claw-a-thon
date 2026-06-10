import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCandidateDto) {
    const existing = await this.prisma.candidate.findUnique({ where: { email: dto.email } });
    if (existing) return existing;
    return this.prisma.candidate.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        cvFileUrl: dto.cvFileUrl,
        cvParsedText: dto.cvText,
      },
    });
  }

  async findAll() {
    return this.prisma.candidate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { interviews: true } } },
    });
  }

  async findOne(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        interviews: {
          include: { job: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async update(id: string, data: Partial<CreateCandidateDto>) {
    await this.findOne(id);
    return this.prisma.candidate.update({ where: { id }, data });
  }
}
