import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { CACHE_TTL } from '../../shared/constants/cache-ttl.constants';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  constructor(
    private httpService: HttpService,
    config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const cacheKey = `placeId:${placeId}:clubs`;

    return this._getFromCache<Club[]>(
      cacheKey,
      () =>
        this.httpService.axiosRef
          .get('clubs', {
            baseURL: this.base_url,
            params: { placeId },
          })
          .then((res) => res.data),
      CACHE_TTL.CLUBS,
    );
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const cacheKey = `clubId:${clubId}:courts`;

    return this._getFromCache<Court[]>(
      cacheKey,
      () =>
        this.httpService.axiosRef
          .get(`/clubs/${clubId}/courts`, {
            baseURL: this.base_url,
          })
          .then((res) => res.data),
      CACHE_TTL.COURTS,
    );
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const cacheKey = `clubId:${clubId}:courtId:${courtId}:date:${date}:slots`;

    return this._getFromCache<Slot[]>(
      cacheKey,
      () =>
        this.httpService.axiosRef
          .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
            baseURL: this.base_url,
            params: { date: moment(date).format('YYYY-MM-DD') },
          })
          .then((res) => res.data),
      CACHE_TTL.SLOTS,
    );
  }

  private async _getFromCache<T>(
    cacheKey: string,
    fn: () => Promise<T>,
    ttl: number,
  ) {
    const cachedData = await this.cacheManager.get<T>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const data = await fn();
      await this.cacheManager.set(cacheKey, data, ttl);
      return data;
    } catch (error) {
      return cachedData || [];
    }
  }
}
