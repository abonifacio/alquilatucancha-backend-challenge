import { CacheModule, Module } from '@nestjs/common';
// @ts-ignore
import * as redisStore from 'cache-manager-redis-store';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

import { GetAvailabilityHandler } from './domain/handlers/get-availability.handler';
import { ClubUpdatedHandler } from './domain/handlers/club-updated.handler';
import { CacheInvalidationHandler } from './domain/handlers/cache-invalidation.handler';
import { AVAILABILITY_REPOSITORY } from './domain/ports/availability-repository';
import { ALQUILA_TU_CANCHA_CLIENT } from './domain/ports/aquila-tu-cancha.client';
import { HTTPAlquilaTuCanchaClient } from './infrastructure/clients/http-alquila-tu-cancha.client';
import { EventsController } from './infrastructure/controllers/events.controller';
import { SearchController } from './infrastructure/controllers/search.controller';
import { RedisAvailabilityRepository } from './infrastructure/repositories/redis-availability.repository';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(),
    CqrsModule,
    ScheduleModule.forRoot(), // Permite crear tareas en segundo plano (Cron Jobs)
    CacheModule.register({
      store: redisStore,
      host: 'redis', // Conecta al contenedor redis de docker-compose
      port: 6379,
    }),

  ],
  controllers: [SearchController, EventsController],
  providers: [
    HTTPAlquilaTuCanchaClient,
    {
      provide: ALQUILA_TU_CANCHA_CLIENT,
      useClass: HTTPAlquilaTuCanchaClient,
    },
    {
      provide: AVAILABILITY_REPOSITORY,
      useClass: RedisAvailabilityRepository, // Aquí le decimos que use Redis para el repositorio
    },
    GetAvailabilityHandler,
    ClubUpdatedHandler,
    CacheInvalidationHandler,
  ],
})
export class AppModule { }
