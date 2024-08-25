import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { SlotAvailableEvent } from '../events/slot-cancelled.event';
import { CACHE_CLIENT, CacheClient } from '../ports/cache.client';

@EventsHandler(SlotAvailableEvent)
export class SlotCancelledHandler implements IEventHandler<SlotAvailableEvent> {
  private readonly logger = new Logger(SlotCancelledHandler.name);

  constructor(@Inject(CACHE_CLIENT) private cacheClient: CacheClient) {}

  async handle(event: SlotAvailableEvent) {
    // TODO: Se puede mejorar, moviemtno las dos funciones asincronas a una sola del cacheClient
    let slotsAvailableInCache = await this.cacheClient.getAvailableSlots(
      event.clubId,
      event.courtId,
      new Date(event.slot.datetime),
    );
    if (!slotsAvailableInCache) slotsAvailableInCache = [];
    slotsAvailableInCache.push(event.slot);
    await this.cacheClient.setAvailableSlots(
      event.clubId,
      event.courtId,
      new Date(event.slot.datetime),
      slotsAvailableInCache,
    );
    this.logger.log(`New slot available ${event.slot.datetime}`);
  }
}
