import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { GatewayModule } from './gateway/gateway.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // Serve the built React SPA from the same process (combined single-container
    // deploy, e.g. AgentBase). CLIENT_DIST_PATH overrides the location; defaults to
    // ../../client relative to the compiled backend (where the Docker image copies it).
    // API, health, and socket.io paths are excluded so they fall through to Nest.
    ServeStaticModule.forRoot({
      rootPath: process.env.CLIENT_DIST_PATH || join(__dirname, '..', '..', 'client'),
      exclude: ['/api/{*path}', '/health', '/socket.io/{*path}'],
    }),
    // Global rate limit: 100 requests / minute / IP. Stricter per-route limits
    // (e.g. login) are applied with @Throttle on the controller.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    GatewayModule,
    OrchestratorModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
