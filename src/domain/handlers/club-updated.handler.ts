import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ClubUpdatedEvent } from '../events/club-updated.event';
import { CACHE_SERVICE, CacheService } from '../ports/cache.service';
import { generateCacheKey } from '../helpers/cache-key.helper';

@EventsHandler(ClubUpdatedEvent)
export class ClubUpdatedHandler implements IEventHandler<ClubUpdatedEvent> {
  private readonly logger = new Logger(ClubUpdatedHandler.name);

  constructor(
    @Inject(CACHE_SERVICE) private readonly cacheService: CacheService,
  ) {}

  async handle(event: ClubUpdatedEvent) {
    const clubKey = generateCacheKey.club(event.clubId);
    await this.cacheService.delete(clubKey);

    const clubsIdsPattern = 'club_ids:*';
    await this.cacheService.deleteByPattern(clubsIdsPattern);

    if (event.fields.includes('openhours')) {
      const courtsKey = generateCacheKey.courts(event.clubId);
      await this.cacheService.delete(courtsKey);
    }

    this.logger.log(`Club ${event.clubId} updated`);
  }
}
