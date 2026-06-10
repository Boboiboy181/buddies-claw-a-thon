import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionGenerationService } from './question-generation.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { $Enums } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class QuestionSetsService {
  constructor(
    private prisma: PrismaService,
    private questionGenService: QuestionGenerationService,
  ) {}

  async generate(jobId: string, dto: GenerateQuestionsDto, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const jdHash = crypto.createHash('md5').update(job.jdRawText).digest('hex');

    // Count existing versions for this job
    const versionCount = await this.prisma.questionSet.count({ where: { jobId } });

    // Generate via LLM
    const generated = await this.questionGenService.generateFromJd({
      jdRawText: job.jdRawText,
      roleTitle: job.title,
      level: job.level ?? undefined,
      questionCount: dto.questionCount,
      categories: dto.categories,
      language: dto.language,
      includeSalaryQuestion: dto.includeSalaryQuestion,
      includeMotivationQuestion: dto.includeMotivationQuestion,
    });

    // Archive existing active sets
    await this.prisma.questionSet.updateMany({
      where: { jobId, status: $Enums.QuestionSetStatus.ACTIVE },
      data: { status: $Enums.QuestionSetStatus.ARCHIVED },
    });

    // Create new question set
    const qs = await this.prisma.questionSet.create({
      data: {
        jobId,
        name: `${job.title} - Question Set v${versionCount + 1}`,
        version: versionCount + 1,
        status: $Enums.QuestionSetStatus.ACTIVE,
        generatedFromJdHash: jdHash,
        createdBy: userId,
        questions: {
          create: generated.questions.map((q) => ({
            order: q.order,
            text: q.text,
            category: (q.category.toUpperCase() as any) in $Enums.QuestionCategory
              ? (q.category.toUpperCase() as $Enums.QuestionCategory)
              : $Enums.QuestionCategory.CUSTOM,
            expectedSignals: q.expectedSignals,
            evaluationCriteria: q.evaluationCriteria,
            maxDurationSeconds: q.maxDurationSeconds,
            isRequired: q.isRequired,
          })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    // Update job rubric if generated
    if (generated.suggestedRubric?.length) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: { rubricJson: generated.suggestedRubric, jdParsedJson: generated.extractedSkills },
      });
    }

    return { questionSetId: qs.id, questions: qs.questions };
  }

  async findByJob(jobId: string) {
    return this.prisma.questionSet.findMany({
      where: { jobId },
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(questionSetId: string) {
    const qs = await this.prisma.questionSet.findUnique({
      where: { id: questionSetId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!qs) throw new NotFoundException('Question set not found');
    return qs;
  }

  async addQuestion(questionSetId: string, dto: CreateQuestionDto) {
    await this.findOne(questionSetId);
    return this.prisma.questionBankItem.create({
      data: {
        questionSetId,
        order: dto.order,
        text: dto.text,
        category: dto.category ?? $Enums.QuestionCategory.CUSTOM,
        expectedSignals: dto.expectedSignals ?? [],
        evaluationCriteria: dto.evaluationCriteria ?? [],
        maxDurationSeconds: dto.maxDurationSeconds ?? 120,
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  async updateQuestion(questionSetId: string, questionId: string, dto: Partial<CreateQuestionDto>) {
    return this.prisma.questionBankItem.update({
      where: { id: questionId, questionSetId },
      data: dto,
    });
  }

  async deleteQuestion(questionSetId: string, questionId: string) {
    return this.prisma.questionBankItem.delete({ where: { id: questionId, questionSetId } });
  }

  async reorderQuestions(questionSetId: string, questions: { id: string; order: number }[]) {
    await Promise.all(
      questions.map((q) =>
        this.prisma.questionBankItem.update({ where: { id: q.id }, data: { order: q.order } }),
      ),
    );
    return this.findOne(questionSetId);
  }

  async activate(questionSetId: string) {
    const qs = await this.findOne(questionSetId);
    // Archive other active sets for same job
    await this.prisma.questionSet.updateMany({
      where: { jobId: qs.jobId, status: $Enums.QuestionSetStatus.ACTIVE, id: { not: questionSetId } },
      data: { status: $Enums.QuestionSetStatus.ARCHIVED },
    });
    return this.prisma.questionSet.update({
      where: { id: questionSetId },
      data: { status: $Enums.QuestionSetStatus.ACTIVE },
    });
  }

  async getActiveForJob(jobId: string) {
    return this.prisma.questionSet.findFirst({
      where: { jobId, status: $Enums.QuestionSetStatus.ACTIVE },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }
}
