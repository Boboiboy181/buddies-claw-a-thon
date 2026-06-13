import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private client: Redis;

  constructor(private readonly healthIndicatorService: HealthIndicatorService) {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      if (this.client.status !== 'ready') await this.client.connect();
      const pong = await this.client.ping();
      if (pong !== 'PONG') throw new Error(`Unexpected reply: ${pong}`);
      return indicator.up();
    } catch (err) {
      return indicator.down({ message: (err as Error).message });
    }
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}
