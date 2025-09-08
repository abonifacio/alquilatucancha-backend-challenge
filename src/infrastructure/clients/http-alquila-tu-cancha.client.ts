import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import * as moment from 'moment';
import { AxiosError } from 'axios';

import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { Club, Court, Slot } from '../../domain/model';
import { RedisService } from './redis.service';
import { AdvancedCacheService } from '../services/advanced-cache.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { RequestBatcherService } from '../services/request-batcher.service';

/**
 * Cliente HTTP optimizado para AlquilaTuCancha con:
 * - Circuit breaker para tolerancia a fallos
 * - Cache inteligente con fallback a datos desactualizados
 * - Batching de requests para evitar duplicados
 * - Prefetch de datos relacionados
 * - Manejo graceful de errores
 */
@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(HTTPAlquilaTuCanchaClient.name);

  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly RATE_LIMIT = 60;
  private readonly RATE_WINDOW = 60000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly advancedCache: AdvancedCacheService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly requestBatcher: RequestBatcherService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'ATC_BASE_URL',
      'http://localhost:4000',
    );
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const cacheKey = this.advancedCache.generateKey('clubs', placeId);
    const staleKey = this.advancedCache.generateStaleKey('clubs', placeId);

    return this.circuitBreaker.execute(
      () =>
        this.requestBatcher.executeBatched(
          cacheKey,
          () => this.fetchClubsFromAPI(placeId),
          `clubs:${placeId}`,
        ),
      async () => {
        const { data } = await this.advancedCache.getWithFallback<Club[]>(
          cacheKey,
          staleKey,
        );
        if (data) {
          this.logger.warn(`Using stale data for clubs in place: ${placeId}`);
          return data;
        }
        throw new Error('No cached data available for clubs');
      },
    );
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const cacheKey = this.advancedCache.generateKey('courts', clubId);
    const staleKey = this.advancedCache.generateStaleKey('courts', clubId);

    return this.circuitBreaker.execute(
      () =>
        this.requestBatcher.executeBatched(
          cacheKey,
          () => this.fetchCourtsFromAPI(clubId),
          `courts:${clubId}`,
        ),
      async () => {
        const { data } = await this.advancedCache.getWithFallback<Court[]>(
          cacheKey,
          staleKey,
        );
        if (data) {
          this.logger.warn(`Using stale data for courts in club: ${clubId}`);
          return data;
        }
        throw new Error('No cached data available for courts');
      },
    );
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const formattedDate = moment(date).format('YYYY-MM-DD');
    const cacheKey = this.advancedCache.generateKey(
      'slots',
      clubId,
      courtId,
      formattedDate,
    );
    const staleKey = this.advancedCache.generateStaleKey(
      'slots',
      clubId,
      courtId,
      formattedDate,
    );

    return this.circuitBreaker.execute(
      () =>
        this.requestBatcher.executeBatched(
          cacheKey,
          () => this.fetchSlotsFromAPI(clubId, courtId, date),
          `slots:${clubId}:${courtId}:${formattedDate}`,
        ),
      async () => {
        const { data } = await this.advancedCache.getWithFallback<Slot[]>(
          cacheKey,
          staleKey,
        );
        if (data) {
          this.logger.warn(
            `Using stale data for slots in club: ${clubId}, court: ${courtId}`,
          );
          return data;
        }
        throw new Error('No cached data available for slots');
      },
    );
  }

  /**
   * Método optimizado para obtener disponibilidad completa
   * con prefetch y batching inteligente
   */
  async getAvailabilityOptimized(
    placeId: string,
    date: Date,
  ): Promise<{ clubs: Club[]; courts: Court[][]; slots: Slot[][][] }> {
    const clubs = await this.getClubs(placeId);
    const courtsPromises = clubs.map((club) => () => this.getCourts(club.id));
    const courts = await this.requestBatcher.executeConcurrent(
      courtsPromises,
      5,
    );
    const slotsPromises: Array<() => Promise<Slot[]>> = [];
    const slotMappings: { clubId: number; courtId: number; index: number }[] =
      [];
    clubs.forEach((club, clubIndex) => {
      courts[clubIndex].forEach((court, courtIndex) => {
        const promiseIndex = slotsPromises.length;
        slotsPromises.push(() =>
          this.getAvailableSlots(club.id, court.id, date),
        );
        slotMappings.push({
          clubId: club.id,
          courtId: court.id,
          index: promiseIndex,
        });
      });
    });
    const allSlots = await this.requestBatcher.executeConcurrent(
      slotsPromises,
      10,
    );
    const slots: Slot[][][] = [];
    let slotIndex = 0;
    clubs.forEach((club, clubIndex) => {
      slots[clubIndex] = [];
      courts[clubIndex].forEach((court, courtIndex) => {
        slots[clubIndex][courtIndex] = allSlots[slotIndex] || [];
        slotIndex++;
      });
    });

    return { clubs, courts, slots };
  }

  private async fetchClubsFromAPI(placeId: string): Promise<Club[]> {
    await this.checkRateLimit();

    try {
      const response = await this.httpService.axiosRef.get<Club[]>('clubs', {
        baseURL: this.baseUrl,
        params: { placeId },
        timeout: 10000,
      });

      const clubs = response.data;

      const cacheKey = this.advancedCache.generateKey('clubs', placeId);
      const staleKey = this.advancedCache.generateStaleKey('clubs', placeId);
      await this.advancedCache.setWithIntelligentTTL(
        cacheKey,
        clubs,
        'CLUBS',
        staleKey,
      );
      this.prefetchCourtsForClubs(clubs);
      return clubs;
    } catch (error) {
      this.handleAPIError(error, 'getClubs', { placeId });
      throw error;
    }
  }

  private async fetchCourtsFromAPI(clubId: number): Promise<Court[]> {
    await this.checkRateLimit();

    try {
      const response = await this.httpService.axiosRef.get<Court[]>(
        `/clubs/${clubId}/courts`,
        {
          baseURL: this.baseUrl,
          timeout: 10000,
        },
      );
      const courts = response.data;
      const cacheKey = this.advancedCache.generateKey('courts', clubId);
      const staleKey = this.advancedCache.generateStaleKey('courts', clubId);
      await this.advancedCache.setWithIntelligentTTL(
        cacheKey,
        courts,
        'COURTS',
        staleKey,
      );
      return courts;
    } catch (error) {
      this.handleAPIError(error, 'getCourts', { clubId });
      throw error;
    }
  }

  private async fetchSlotsFromAPI(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    await this.checkRateLimit();
    const formattedDate = moment(date).format('YYYY-MM-DD');
    try {
      const response = await this.httpService.axiosRef.get<Slot[]>(
        `/clubs/${clubId}/courts/${courtId}/slots`,
        {
          baseURL: this.baseUrl,
          params: { date: formattedDate },
          timeout: 10000,
        },
      );
      const slots = response.data;
      const cacheKey = this.advancedCache.generateKey(
        'slots',
        clubId,
        courtId,
        formattedDate,
      );
      const staleKey = this.advancedCache.generateStaleKey(
        'slots',
        clubId,
        courtId,
        formattedDate,
      );
      await this.advancedCache.setWithIntelligentTTL(
        cacheKey,
        slots,
        'SLOTS',
        staleKey,
      );
      return slots;
    } catch (error) {
      this.handleAPIError(error, 'getAvailableSlots', {
        clubId,
        courtId,
        date: formattedDate,
      });
      throw error;
    }
  }

  private async prefetchCourtsForClubs(clubs: Club[]): Promise<void> {
    setImmediate(async () => {
      try {
        const courtPromises = clubs.map((club) => this.getCourts(club.id));
        try {
          await Promise.all(courtPromises);
        } catch (error) {
          this.logger.warn('Some court prefetch operations failed:', error);
        }
        this.logger.debug(`Prefetched courts for ${clubs.length} clubs`);
      } catch (error) {
        this.logger.error('Error prefetching courts:', error);
      }
    });
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.lastResetTime >= this.RATE_WINDOW) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    if (this.requestCount >= this.RATE_LIMIT) {
      const waitTime = this.RATE_WINDOW - (now - this.lastResetTime);
      this.logger.warn(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise<void>((resolve) =>
        setTimeout(() => resolve(), waitTime),
      );
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }
    this.requestCount++;
  }

  private handleAPIError(error: any, operation: string, context: any): void {
    if (error instanceof AxiosError) {
      this.logger.error(`API Error in ${operation}: ${error.message}`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        context,
      });
    } else {
      this.logger.error(`Unexpected error in ${operation}:`, error);
    }
  }

  /**
   * Obtiene métricas del cliente
   */
  getMetrics() {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      redis: this.redisService.getMetrics(),
      rateLimit: {
        current: this.requestCount,
        limit: this.RATE_LIMIT,
        window: this.RATE_WINDOW,
        resetTime: this.lastResetTime,
      },
    };
  }
}
