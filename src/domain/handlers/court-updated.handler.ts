import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { CourtUpdatedEvent } from '../events/court-updated.event';
import { CACHE_CLIENT, CacheClient } from '../ports/cache.client';

@EventsHandler(CourtUpdatedEvent)
export class CourtUpdatedHandler implements IEventHandler<CourtUpdatedEvent> {
  private readonly logger = new Logger(CourtUpdatedHandler.name);

  constructor(@Inject(CACHE_CLIENT) private cacheClient: CacheClient) {}

  async handle(event: CourtUpdatedEvent) {
    await this.cacheClient.resetCache();
    this.logger.log(`Court ${event.courtId}  updated`);
  }
}
