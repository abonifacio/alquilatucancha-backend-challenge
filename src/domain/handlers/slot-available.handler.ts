import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SlotAvailableEvent } from '../events/slot-cancelled.event';
import { CACHE_SERVICE, CacheService } from '../ports/cache.service';
import { generateCacheKey } from '../helpers/cache-key.helper';

@EventsHandler(SlotAvailableEvent)
export class SlotAvailableHandler implements IEventHandler<SlotAvailableEvent> {
  private readonly logger = new Logger(SlotAvailableHandler.name);

  constructor(
    @Inject(CACHE_SERVICE) private readonly cacheService: CacheService,
  ) {}

  async handle(event: SlotAvailableEvent) {
    const slotsKey = generateCacheKey.slots(event.clubId, event.courtId, new Date(event.slot.datetime));
    
    await this.cacheService.delete(slotsKey);

    this.logger.log(`Slot available for court ${event.courtId} in club ${event.clubId}`);
  }
}
