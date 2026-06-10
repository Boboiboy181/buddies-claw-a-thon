import { Module } from '@nestjs/common';
import { DailyService } from './daily.service';
import { DailyWebhookController } from './daily-webhook.controller';

@Module({
  controllers: [DailyWebhookController],
  providers: [DailyService],
  exports: [DailyService],
})
export class DailyModule {}
