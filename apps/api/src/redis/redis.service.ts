import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  enabled = true;

  private lastWarnAt = 0;

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 2) return null;
        return Math.min(1000 * times, 5000);
      },
    });
    this.client.on('error', (err) => {
      const now = Date.now();
      if (now - this.lastWarnAt > 30000) {
        this.lastWarnAt = now;
        this.logger.warn(`Redis unavailable (${err.message}) — degraded to in-memory/no cache.`);
      }
      this.enabled = false;
    });
    this.client.on('connect', () => {
      this.lastWarnAt = 0;
      this.enabled = true;
      this.logger.log('Redis connected');
    });
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit().catch(() => null);
  }

  async get(key: string): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      /* noop */
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.del(...keys);
    } catch {
      /* noop */
    }
  }

  async cached<T>(key: string, fn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        /* fallthrough */
      }
    }
    const value = await fn();
    await this.set(key, JSON.stringify(value), ttlSeconds);
    return value;
  }

  async invalidate(prefix: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const keys = await this.client.keys(`${prefix}:*`);
      if (keys.length) await this.client.del(...keys);
    } catch {
      /* noop */
    }
  }
}