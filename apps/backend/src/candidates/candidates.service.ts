import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CandidatesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async create(dto: CreateCandidateDto) {
    const existing = await this.prisma.candidate.findUnique({ where: { email: dto.email } });
    if (existing) {
      if (dto.cvFileUrl || dto.cvText) {
        return this.prisma.candidate.update({
          where: { id: existing.id },
          data: {
            ...(dto.cvFileUrl ? { cvFileUrl: dto.cvFileUrl } : {}),
            ...(dto.cvText ? { cvParsedText: dto.cvText } : {}),
          },
        });
      }
      return existing;
    }
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
    return {
      ...candidate,
      cvFileUrl: await this.resolveCvUrl(candidate.cvFileUrl),
    };
  }

  async update(id: string, data: Partial<CreateCandidateDto>) {
    await this.findOne(id);
    return this.prisma.candidate.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        cvFileUrl: data.cvFileUrl,
        cvParsedText: data.cvText,
      },
    });
  }

  async remove(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: { _count: { select: { interviews: true } } },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (candidate._count.interviews > 0) {
      throw new BadRequestException('Candidate has interview history and cannot be deleted.');
    }

    await this.prisma.candidate.delete({ where: { id } });
    if (candidate.cvFileUrl && !/^(https?:|blob:|data:)/i.test(candidate.cvFileUrl)) {
      this.storage.delete(candidate.cvFileUrl).catch(() => undefined);
    }
    return { id };
  }

  private async resolveCvUrl(cvFileUrl?: string | null) {
    if (!cvFileUrl) return cvFileUrl;
    if (/^(https?:|blob:|data:)/i.test(cvFileUrl)) return cvFileUrl;
    return this.storage.getSignedDownloadUrl(cvFileUrl, 24 * 60 * 60);
  }
}
