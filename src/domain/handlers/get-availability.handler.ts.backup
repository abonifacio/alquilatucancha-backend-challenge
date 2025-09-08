import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AlquilaTuCanchaClient } from '../ports/aquila-tu-cancha.client';
import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from './get-availability.query';
import { RedisService } from './redis.service';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  private readonly logger = new Logger(GetAvailabilityHandler.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly client: AlquilaTuCanchaClient,
    private readonly redisService: RedisService,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const { placeId, date } = query;
    const cacheKey = this.generateCacheKey(placeId, date);

    try {
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const clubsWithAvailability = await this.fetchAvailability(placeId, date);
      await this.cacheResult(cacheKey, clubsWithAvailability);

      return clubsWithAvailability;
    } catch (error) {
      this.logger.error(
        `Error fetching availability: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private generateCacheKey(placeId: string, date: Date): string {
    return `availability:${placeId}:${date.toISOString().split('T')[0]}`;
  }

  private async getCachedResult(
    cacheKey: string,
  ): Promise<ClubWithAvailability[] | null> {
    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Cache hit for availability query: ${cacheKey}`);
      return JSON.parse(cachedResult);
    }
    this.logger.debug(`Cache miss for availability query: ${cacheKey}`);
    return null;
  }

  private async fetchAvailability(
    placeId: string,
    date: Date,
  ): Promise<ClubWithAvailability[]> {
    const clubs = await this.client.getClubs(placeId);
    return Promise.all(
      clubs.map(async (club) => {
        const courts = await this.client.getCourts(club.id);
        const courtsWithAvailability = await Promise.all(
          courts.map(async (court) => {
            const slots = await this.client.getAvailableSlots(
              club.id,
              court.id,
              date,
            );
            return { ...court, slots };
          }),
        );
        return { ...club, courts: courtsWithAvailability };
      }),
    );
  }

  private async cacheResult(
    cacheKey: string,
    result: ClubWithAvailability[],
  ): Promise<void> {
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.CACHE_TTL,
    );
  }
}
