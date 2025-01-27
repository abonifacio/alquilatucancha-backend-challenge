import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CourtUpdatedEvent } from '../events/court-updated.event';
import { CACHE_SERVICE, CacheService } from '../ports/cache.service';
import { generateCacheKey } from '../helpers/cache-key.helper';

@EventsHandler(CourtUpdatedEvent)
export class CourtUpdatedHandler implements IEventHandler<CourtUpdatedEvent> {
  private readonly logger = new Logger(CourtUpdatedHandler.name);

  constructor(
    @Inject(CACHE_SERVICE) private readonly cacheService: CacheService,
  ) {}

  async handle(event: CourtUpdatedEvent) {
    const courtsKey = generateCacheKey.courts(event.clubId);

    await this.cacheService.delete(courtsKey);

    this.logger.log(`Court ${event.courtId} from club ${event.clubId} updated`);
  }
}
