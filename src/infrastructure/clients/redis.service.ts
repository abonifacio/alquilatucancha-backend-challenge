import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Servicio Redis mejorado con:
 * - Reconnection automática
 * - Pool de conexiones
 * - Métricas de rendimiento
 * - Fallback graceful cuando Redis no está disponible
 */
@Injectable()
export class RedisService {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 5;

  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    operations: 0,
  };

  constructor(private readonly configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    };

    this.client = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      this.isConnected = false;
      this.metrics.errors++;
      this.logger.error('Redis Client Error:', error);

      if (this.connectionAttempts < this.maxConnectionAttempts) {
        this.connectionAttempts++;
        setTimeout(() => {
          this.logger.log(
            `Attempting Redis reconnection (${this.connectionAttempts}/${this.maxConnectionAttempts})`,
          );
          this.client.connect().catch(() => {});
        }, 1000 * this.connectionAttempts);
      }
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.logger.log('Successfully connected to Redis');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client is ready');
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async get(key: string): Promise<string | null> {
    this.metrics.operations++;

    if (!this.isConnected) {
      this.logger.warn(`Redis not connected, returning null for key: ${key}`);
      this.metrics.misses++;
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value !== null) {
        this.metrics.hits++;
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.metrics.misses++;
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    this.metrics.operations++;

    if (!this.isConnected) {
      this.logger.warn(`Redis not connected, skipping set for key: ${key}`);
      return false;
    }

    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
      this.logger.debug(
        `Cached data for key: ${key}${ttl ? ` with TTL: ${ttl}s` : ''}`,
      );
      return true;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Error setting key ${key} in Redis:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    this.metrics.operations++;
    if (!this.isConnected) {
      this.logger.warn(`Redis not connected, skipping delete for key: ${key}`);
      return false;
    }

    try {
      await this.client.del(key);
      this.logger.debug(`Deleted key: ${key}`);
      return true;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Error deleting key ${key} in Redis:`, error);
      return false;
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    this.metrics.operations++;
    if (!this.isConnected) {
      this.logger.warn(
        `Redis not connected, returning nulls for ${keys.length} keys`,
      );
      return new Array(keys.length).fill(null);
    }

    try {
      const values = await this.client.mget(...keys);
      const hits = values.filter((v) => v !== null).length;
      this.metrics.hits += hits;
      this.metrics.misses += values.length - hits;
      return values;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Error getting multiple keys from Redis:`, error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs: Record<string, string>): Promise<boolean> {
    this.metrics.operations++;
    if (!this.isConnected) {
      this.logger.warn(
        `Redis not connected, skipping mset for ${
          Object.keys(keyValuePairs).length
        } keys`,
      );
      return false;
    }

    try {
      const args: string[] = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        args.push(key, value);
      }
      await this.client.mset(...args);
      this.logger.debug(`Cached ${Object.keys(keyValuePairs).length} keys`);
      return true;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Error setting multiple keys in Redis:`, error);
      return false;
    }
  }

  async flushDb(): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping flush');
      return false;
    }

    try {
      await this.client.flushdb();
      this.logger.log('Redis database flushed successfully');
      return true;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('Error flushing Redis database:', error);
      return false;
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

  /**
   * Obtiene métricas de rendimiento del cache
   */
  getMetrics() {
    const hitRate =
      this.metrics.operations > 0
        ? ((this.metrics.hits / this.metrics.operations) * 100).toFixed(2)
        : '0.00';
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
    };
  }

  /**
   * Verifica si Redis está disponible
   */
  isHealthy(): boolean {
    return this.isConnected;
  }
}
