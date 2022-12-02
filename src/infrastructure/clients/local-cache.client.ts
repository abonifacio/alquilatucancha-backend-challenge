import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { CacheClient } from '../../domain/ports/cache.client';

@Injectable()
export class LocalCacheClient implements CacheClient {
  private cacheManagerConfig = { ttl: 60 };

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getClubs(placeId: string): Promise<Club[] | undefined> {
    return await this.cacheManager.get<Club[]>(placeId);
  }

  async setClubs(placeId: string, clubs: Club[]): Promise<void> {
    await this.cacheManager.set(placeId, clubs, this.cacheManagerConfig);
  }

  async resetCache(): Promise<void> {
    await this.cacheManager.reset();
  }

  async getCourts(clubId: number): Promise<Court[] | undefined> {
    return await this.cacheManager.get<Court[]>(`${clubId}`);
  }

  async setCourts(clubId: number, courts: Court[]): Promise<void> {
    await this.cacheManager.set(`${clubId}`, courts, this.cacheManagerConfig);
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[] | undefined> {
    const dateFormated = moment(date).format('YYYY-MM-DD');

    return await this.cacheManager.get<Slot[]>(
      `${clubId}-${courtId}-${dateFormated}`,
    );
  }

  async setAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
    slots: Slot[],
  ): Promise<void> {
    const dateFormated = moment(date).format('YYYY-MM-DD');

    await this.cacheManager.set(
      `${clubId}-${courtId}-${dateFormated}`,
      slots,
      this.cacheManagerConfig,
    );
  }
}
