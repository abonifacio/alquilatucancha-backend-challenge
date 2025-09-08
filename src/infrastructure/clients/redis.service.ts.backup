import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    };

    this.client = new Redis(redisConfig);

    this.client.on('error', (error) => {
      this.logger.error('Redis Client Error:', error);
    });

    this.client.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      return value;
    } catch (error) {
      this.logger.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key} in Redis:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from Redis:`, error);
    }
  }

  async flushDb(): Promise<void> {
    try {
      await this.client.flushdb();
      this.logger.log('Redis database flushed successfully');
    } catch (error) {
      this.logger.error('Error flushing Redis database:', error);
    }
  }

  async quit(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.log('Redis connection closed successfully');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
    }
  }
}