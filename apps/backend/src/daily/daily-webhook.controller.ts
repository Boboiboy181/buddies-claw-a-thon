import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums } from '@prisma/client';

@ApiTags('webhooks')
@Controller('webhooks')
export class DailyWebhookController {
  private readonly logger = new Logger(DailyWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post('daily')
  async handleDailyWebhook(@Body() payload: any, @Headers() headers: any) {
    this.logger.log(`Daily webhook: ${payload.action}`);

    if (payload.action === 'recording.ready-to-download') {
      const roomName = payload.room_name as string;
      const recordingUrl = payload.download_url as string;
      const interviewId = roomName?.replace('interview-', '');

      if (interviewId) {
        await this.prisma.interview.updateMany({
          where: { id: interviewId },
          data: {
            recordingUrl,
            recordingId: payload.recording_id,
            status: $Enums.InterviewStatus.REPORT_GENERATING,
          },
        });
        this.logger.log(`Recording ready for interview ${interviewId}`);
      }
    }

    return { received: true };
  }
}
