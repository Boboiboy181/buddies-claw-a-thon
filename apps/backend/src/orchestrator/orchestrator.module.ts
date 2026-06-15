import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TtsModule } from '../tts/tts.module';
import { SttModule } from '../stt/stt.module';
import { StorageModule } from '../storage/storage.module';
import { DailyModule } from '../daily/daily.module';
import { LivekitModule } from '../livekit/livekit.module';
import { GatewayModule } from '../gateway/gateway.module';
import { LlmModule } from '../llm/llm.module';
import { QUEUE_REPORT_GENERATION } from '../queue/queue.constants';
import { InterviewOrchestratorService } from './orchestrator.service';
import { ConversationService } from './conversation.service';
import { OrchestratorController } from './orchestrator.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_REPORT_GENERATION }),
    TtsModule,
    SttModule,
    StorageModule,
    DailyModule,
    LivekitModule,
    GatewayModule,
    LlmModule,
  ],
  controllers: [OrchestratorController],
  providers: [InterviewOrchestratorService, ConversationService],
  exports: [InterviewOrchestratorService],
})
export class OrchestratorModule {}
