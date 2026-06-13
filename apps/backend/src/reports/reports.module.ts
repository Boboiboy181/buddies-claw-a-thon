import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LlmModule } from '../llm/llm.module';
import { MailModule } from '../mail/mail.module';
import { ReportsService } from './reports.service';
import { ReportGenerationProcessor } from './report-generation.processor';
import { QUEUE_REPORT_GENERATION } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_REPORT_GENERATION }), LlmModule, MailModule],
  providers: [ReportsService, ReportGenerationProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
