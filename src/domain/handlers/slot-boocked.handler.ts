import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { SlotBookedEvent } from '../events/slot-booked.event';
import { CACHE_CLIENT, CacheClient } from '../ports/cache.client';

@EventsHandler(SlotBookedEvent)
export class SlotBookedHandler implements IEventHandler<SlotBookedEvent> {
  private readonly logger = new Logger(SlotBookedHandler.name);

  constructor(@Inject(CACHE_CLIENT) private cacheClient: CacheClient) {}

  async handle(event: SlotBookedEvent) {
    // await this.cacheClient.resetCache();
    this.logger.log(`Slot booked ${event.slot.datetime}`);
  }
}
