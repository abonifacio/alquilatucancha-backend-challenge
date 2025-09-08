import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { ClubUpdatedHandler } from './domain/handlers/club-updated.handler';
import { GetAvailabilityHandler } from './domain/handlers/get-availability.handler';
import { ALQUILA_TU_CANCHA_CLIENT } from './domain/ports/aquila-tu-cancha.client';
import { HTTPAlquilaTuCanchaClient } from './infrastructure/clients/http-alquila-tu-cancha.client';
import { RedisService } from './infrastructure/clients/redis.service';
import { EventsController } from './infrastructure/controllers/events.controller';
import { MetricsController } from './infrastructure/controllers/metrics.controller';
import { SearchController } from './infrastructure/controllers/search.controller';
import { AdvancedCacheService } from './infrastructure/services/advanced-cache.service';
import { CircuitBreakerService } from './infrastructure/services/circuit-breaker.service';
import { RequestBatcherService } from './infrastructure/services/request-batcher.service';

/**
 * Módulo principal de la aplicación con todas las optimizaciones implementadas:
 * - Servicios de cache avanzado
 * - Circuit breaker para tolerancia a fallos
 * - Batching de requests
 * - Redis mejorado
 * - Endpoint de métricas para monitoreo
 */
@Module({
  imports: [
    HttpModule,
    CqrsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [SearchController, EventsController, MetricsController],
  providers: [
    RedisService,
    AdvancedCacheService,
    CircuitBreakerService,
    RequestBatcherService,
    {
      provide: ALQUILA_TU_CANCHA_CLIENT,
      useClass: HTTPAlquilaTuCanchaClient,
    },
    GetAvailabilityHandler,
    ClubUpdatedHandler,
  ],
  exports: [
    RedisService,
    AdvancedCacheService,
    CircuitBreakerService,
    RequestBatcherService,
  ],
})
export class AppModule {}
