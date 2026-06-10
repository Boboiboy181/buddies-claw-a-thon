import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InterviewsModule } from './interviews/interviews.module';
import { CandidatesModule } from './candidates/candidates.module';
import { JobsModule } from './jobs/jobs.module';
import { QuestionSetsModule } from './question-sets/question-sets.module';
import { DailyModule } from './daily/daily.module';
import { TtsModule } from './tts/tts.module';
import { SttModule } from './stt/stt.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
      },
    }),
    PrismaModule,
    AuthModule,
    InterviewsModule,
    CandidatesModule,
    JobsModule,
    QuestionSetsModule,
    DailyModule,
    TtsModule,
    SttModule,
    ReportsModule,
    StorageModule,
    QueueModule,
    DashboardModule,
  ],
})
export class AppModule {}
