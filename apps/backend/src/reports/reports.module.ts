import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService } from './reports.service';
import { ReportGenerationProcessor } from './report-generation.processor';
import { QUEUE_REPORT_GENERATION } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_REPORT_GENERATION })],
  providers: [ReportsService, ReportGenerationProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
