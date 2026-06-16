import { Module } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
