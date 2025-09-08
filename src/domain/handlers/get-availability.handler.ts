import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';
import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availability.query';
import { AdvancedCacheService } from '../../infrastructure/services/advanced-cache.service';
import { HTTPAlquilaTuCanchaClient } from '../../infrastructure/clients/http-alquila-tu-cancha.client';

/**
 * Handler optimizado para consultas de disponibilidad con:
 * - Cache inteligente con fallback a datos desactualizados
 * - Prefetch de datos relacionados
 * - Manejo graceful de errores
 * - Métricas de rendimiento
 */
@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  private readonly logger = new Logger(GetAvailabilityHandler.name);

  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private readonly client: AlquilaTuCanchaClient,
    private readonly advancedCache: AdvancedCacheService,
    private readonly httpClient: HTTPAlquilaTuCanchaClient,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const { placeId, date } = query;
    const startTime = Date.now();

    this.logger.log(
      `Processing availability query for place: ${placeId}, date: ${
        date.toISOString().split('T')[0]
      }`,
    );

    try {
      const availabilityResult = await this.getCachedAvailability(
        placeId,
        date,
      );
      if (availabilityResult) {
        const duration = Date.now() - startTime;
        this.logger.log(`Cache hit for availability query (${duration}ms)`);
        return availabilityResult;
      }

      const optimizedData = await this.fetchOptimizedAvailability(
        placeId,
        date,
      );

      await this.cacheAvailabilityResult(placeId, date, optimizedData);

      const duration = Date.now() - startTime;
      this.logger.log(`Availability query completed (${duration}ms)`);

      return optimizedData;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Error fetching availability after ${duration}ms: ${error.message}`,
        error.stack,
      );
      return this.getFallbackAvailability(placeId, date);
    }
  }

  private async getCachedAvailability(
    placeId: string,
    date: Date,
  ): Promise<ClubWithAvailability[] | null> {
    const cacheKey = this.advancedCache.generateKey(
      'availability',
      placeId,
      date.toISOString().split('T')[0],
    );
    const staleKey = this.advancedCache.generateStaleKey(
      'availability',
      placeId,
      date.toISOString().split('T')[0],
    );

    const { data, isStale } = await this.advancedCache.getWithFallback<
      ClubWithAvailability[]
    >(cacheKey, staleKey);

    if (data) {
      if (isStale) {
        this.logger.warn(`Using stale availability data for place: ${placeId}`);
      }
      return data;
    }

    return null;
  }

  private async fetchOptimizedAvailability(
    placeId: string,
    date: Date,
  ): Promise<ClubWithAvailability[]> {
    if (this.httpClient instanceof HTTPAlquilaTuCanchaClient) {
      const { clubs, courts, slots } =
        await this.httpClient.getAvailabilityOptimized(placeId, date);
      return clubs.map((club, clubIndex) => ({
        ...club,
        courts: courts[clubIndex].map((court, courtIndex) => ({
          ...court,
          available: slots[clubIndex]?.[courtIndex] || [],
        })),
      }));
    }
    return this.fetchAvailabilityOriginal(placeId, date);
  }

  private async fetchAvailabilityOriginal(
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
            return { ...court, available: slots };
          }),
        );
        return { ...club, courts: courtsWithAvailability };
      }),
    );
  }

  private async cacheAvailabilityResult(
    placeId: string,
    date: Date,
    result: ClubWithAvailability[],
  ): Promise<void> {
    const cacheKey = this.advancedCache.generateKey(
      'availability',
      placeId,
      date.toISOString().split('T')[0],
    );
    const staleKey = this.advancedCache.generateStaleKey(
      'availability',
      placeId,
      date.toISOString().split('T')[0],
    );

    await this.advancedCache.setWithIntelligentTTL(
      cacheKey,
      result,
      'AVAILABILITY',
      staleKey,
    );
  }

  private async getFallbackAvailability(
    placeId: string,
    date: Date,
  ): Promise<ClubWithAvailability[]> {
    this.logger.warn(
      `Attempting fallback for place: ${placeId}, date: ${
        date.toISOString().split('T')[0]
      }`,
    );

    try {
      const staleKey = this.advancedCache.generateStaleKey(
        'availability',
        placeId,
        date.toISOString().split('T')[0],
      );
      const staleData = await this.advancedCache.getWithFallback<
        ClubWithAvailability[]
      >(staleKey);

      if (staleData.data) {
        this.logger.warn(`Using stale fallback data for place: ${placeId}`);
        return staleData.data;
      }
      this.logger.error(`No fallback data available for place: ${placeId}`);
      return [];
    } catch (error) {
      this.logger.error(`Fallback failed for place: ${placeId}:`, error);
      return [];
    }
  }

  /**
   * Método para invalidar cache cuando llegan eventos
   */
  async invalidateCacheForPlace(placeId: string, date?: Date): Promise<void> {
    try {
      if (date) {
        const cacheKey = this.advancedCache.generateKey(
          'availability',
          placeId,
          date.toISOString().split('T')[0],
        );
        const staleKey = this.advancedCache.generateStaleKey(
          'availability',
          placeId,
          date.toISOString().split('T')[0],
        );

        await this.advancedCache.invalidateByPattern(cacheKey);
        await this.advancedCache.invalidateByPattern(staleKey);
      } else {
        await this.advancedCache.invalidateByPattern(
          `availability:${placeId}:*`,
        );
      }

      this.logger.debug(`Invalidated availability cache for place: ${placeId}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating cache for place: ${placeId}:`,
        error,
      );
    }
  }

  /**
   * Obtiene métricas del handler
   */
  getMetrics() {
    return {
      client:
        this.httpClient instanceof HTTPAlquilaTuCanchaClient
          ? this.httpClient.getMetrics()
          : null,
      cache: this.advancedCache,
    };
  }
}
