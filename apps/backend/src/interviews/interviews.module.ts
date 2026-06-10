import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { QUEUE_REPORT_GENERATION } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_REPORT_GENERATION })],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
