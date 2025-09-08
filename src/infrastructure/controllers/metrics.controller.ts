import { Controller, Get } from '@nestjs/common';
import { AdvancedCacheService } from '../services/advanced-cache.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { RequestBatcherService } from '../services/request-batcher.service';
import { RedisService } from '../clients/redis.service';
import { HTTPAlquilaTuCanchaClient } from '../clients/http-alquila-tu-cancha.client';
import { EventsController } from './events.controller';

/**
 * Controlador de métricas para monitoreo del sistema
 * Proporciona información sobre:
 * - Estado del cache Redis
 * - Métricas del circuit breaker
 * - Estadísticas de eventos procesados
 * - Rendimiento general del sistema
 */
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly redisService: RedisService,
    private readonly advancedCache: AdvancedCacheService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly requestBatcher: RequestBatcherService,
    private readonly httpClient: HTTPAlquilaTuCanchaClient,
    private readonly eventsController: EventsController,
  ) {}

  @Get()
  async getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
      redis: this.redisService.getMetrics(),
      circuitBreaker: this.circuitBreaker.getMetrics(),
      events: this.eventsController.getEventMetrics(),
      httpClient: this.httpClient.getMetrics(),
    };
  }

  @Get('health')
  async getHealth() {
    const redisHealthy = this.redisService.isHealthy();
    const circuitBreakerState = this.circuitBreaker.getState();
    
    const isHealthy = redisHealthy && circuitBreakerState !== 'OPEN';
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks: {
        redis: redisHealthy ? 'healthy' : 'unhealthy',
        circuitBreaker: circuitBreakerState,
        api: circuitBreakerState !== 'OPEN' ? 'healthy' : 'degraded',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('cache')
  async getCacheMetrics() {
    return {
      redis: this.redisService.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }
}
