import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReportsService } from './reports.service';
import { QUEUE_REPORT_GENERATION, JOB_GENERATE_REPORT } from '../queue/queue.constants';

@Processor(QUEUE_REPORT_GENERATION)
export class ReportGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportGenerationProcessor.name);

  constructor(private reportsService: ReportsService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === JOB_GENERATE_REPORT) {
      const { interviewId } = job.data;
      this.logger.log(`Generating report for interview ${interviewId}`);
      return this.reportsService.generateReport(interviewId);
    }
  }
}
