import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ClubUpdatedHandler } from './domain/handlers/club-updated.handler';
import { GetAvailabilityHandler } from './domain/handlers/get-availability.handler';
import { SlotBookedHandler } from './domain/handlers/slot-booked.handler';
import { SlotAvailableHandler } from './domain/handlers/slot-available.handler';
import { CourtUpdatedHandler } from './domain/handlers/court-updated.handler';
import { ALQUILA_TU_CANCHA_CLIENT } from './domain/ports/alquila-tu-cancha.client';
import { HTTPAlquilaTuCanchaClient } from './infrastructure/clients/http-alquila-tu-cancha.client';
import { EventsController } from './infrastructure/controllers/events.controller';
import { SearchController } from './infrastructure/controllers/search.controller';
import { CACHE_SERVICE } from './domain/ports/cache.service';
import { RedisService } from './infrastructure/cache/redis.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

const EventHandlers = [
  GetAvailabilityHandler,
  ClubUpdatedHandler,
  SlotBookedHandler,
  SlotAvailableHandler,
  CourtUpdatedHandler,
];

@Module({
  imports: [
    HttpModule,
    CqrsModule,
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),
  ],
  controllers: [SearchController, EventsController],
  providers: [
    {
      provide: ALQUILA_TU_CANCHA_CLIENT,
      useClass: HTTPAlquilaTuCanchaClient,
    },
    {
      provide: CACHE_SERVICE,
      useClass: RedisService,
    },
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
    ...EventHandlers,
  ],
})
export class AppModule {}
