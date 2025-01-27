import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SlotBookedEvent } from '../events/slot-booked.event';
import { CACHE_SERVICE, CacheService } from '../ports/cache.service';
import { generateCacheKey } from '../helpers/cache-key.helper';

@EventsHandler(SlotBookedEvent)
export class SlotBookedHandler implements IEventHandler<SlotBookedEvent> {
  private readonly logger = new Logger(SlotBookedHandler.name);

  constructor(
    @Inject(CACHE_SERVICE) private readonly cacheService: CacheService,
  ) {}

  async handle(event: SlotBookedEvent) {
    const slotsKey = generateCacheKey.slots(event.clubId, event.courtId, new Date(event.slot.datetime));
    
    await this.cacheService.delete(slotsKey);

    this.logger.log(`Slot booked for court ${event.courtId} in club ${event.clubId}`);
  }
}
