import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [
      totalJobs,
      totalCandidates,
      totalInterviews,
      pendingInterviews,
      completedInterviews,
      processingReports,
      readyReports,
      recentInterviews,
      recentCandidates,
    ] = await Promise.all([
      this.prisma.job.count({ where: { status: { not: $Enums.JobStatus.ARCHIVED } } }),
      this.prisma.candidate.count(),
      this.prisma.interview.count(),
      this.prisma.interview.count({
        where: { status: { in: [$Enums.InterviewStatus.CREATED, $Enums.InterviewStatus.INVITED, $Enums.InterviewStatus.IN_PROGRESS] } },
      }),
      this.prisma.interview.count({ where: { status: $Enums.InterviewStatus.COMPLETED } }),
      this.prisma.interview.count({
        where: { status: { in: [$Enums.InterviewStatus.RECORDING_PROCESSING, $Enums.InterviewStatus.TRANSCRIPT_PROCESSING, $Enums.InterviewStatus.REPORT_GENERATING] } },
      }),
      this.prisma.interview.count({ where: { status: $Enums.InterviewStatus.REPORT_READY } }),
      this.prisma.interview.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          candidate: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
        },
      }),
      this.prisma.candidate.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalJobs,
      totalCandidates,
      totalInterviews,
      pendingInterviews,
      completedInterviews,
      processingReports,
      readyReports,
      recentInterviews,
      recentCandidates,
    };
  }
}
