import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import * as redisStore from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';

import { ClubUpdatedHandler } from './domain/handlers/club-updated.handler';
import { GetAvailabilityHandler } from './domain/handlers/get-availability.handler';
import { SlotBookedHandler } from './domain/handlers/slot-boocked.handler';
import { SlotCancelledHandler } from './domain/handlers/slot-cancelled.handler';
import { ALQUILA_TU_CANCHA_CLIENT } from './domain/ports/aquila-tu-cancha.client';
import { CACHE_CLIENT } from './domain/ports/cache.client';
import { HTTPAlquilaTuCanchaClient } from './infrastructure/clients/http-alquila-tu-cancha.client';
import { LocalCacheClient } from './infrastructure/clients/local-cache.client';
import { EventsController } from './infrastructure/controllers/events.controller';
import { SearchController } from './infrastructure/controllers/search.controller';

@Module({
  imports: [
    HttpModule,
    CqrsModule,
    ConfigModule.forRoot(),

    // Sin Redis
    // CacheModule.register({ isGlobal: true }),

    // Con Redis
    CacheModule.register<RedisClientOptions>({
      isGlobal: true,
      store: redisStore,
      url: 'redis://redis:6379',
    }),
  ],
  controllers: [SearchController, EventsController],
  providers: [
    {
      provide: ALQUILA_TU_CANCHA_CLIENT,
      useClass: HTTPAlquilaTuCanchaClient,
    },
    {
      provide: CACHE_CLIENT,
      useClass: LocalCacheClient,
    },
    GetAvailabilityHandler,
    ClubUpdatedHandler,
    SlotCancelledHandler,
    SlotBookedHandler,
  ],
})
export class AppModule {}
