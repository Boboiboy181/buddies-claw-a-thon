import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_REPORT_GENERATION, QUEUE_TRANSCRIPTION, QUEUE_TTS } from './queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_REPORT_GENERATION }),
    BullModule.registerQueue({ name: QUEUE_TRANSCRIPTION }),
    BullModule.registerQueue({ name: QUEUE_TTS }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
