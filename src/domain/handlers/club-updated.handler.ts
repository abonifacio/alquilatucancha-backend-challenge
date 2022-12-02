import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { ClubUpdatedEvent } from '../events/club-updated.event';
import { CACHE_CLIENT, CacheClient } from '../ports/cache.client';

@EventsHandler(ClubUpdatedEvent)
export class ClubUpdatedHandler implements IEventHandler<ClubUpdatedEvent> {
  private readonly logger = new Logger(ClubUpdatedHandler.name);

  constructor(@Inject(CACHE_CLIENT) private cacheClient: CacheClient) {}

  async handle(event: ClubUpdatedEvent) {
    if (event.fields.includes('openhours')) await this.cacheClient.resetCache();
    this.logger.log(`Club ${event.clubId}  updated`);
  }
}
