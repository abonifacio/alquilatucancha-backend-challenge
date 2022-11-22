import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { Cache } from 'cache-manager';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  constructor(private httpService: HttpService, config: ConfigService, @Inject(CACHE_MANAGER) private cacheService: Cache,) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<any> {
    const cachedData = await this.cacheService.get(placeId)
    if (cachedData) {
      return cachedData;
    }
    const clubs = await this.httpService.axiosRef
      .get('clubs', {
        baseURL: this.base_url,
        params: { placeId },
      })
      .then((res) => res.data);
    await this.cacheService.set(placeId, clubs, 1000);
    return clubs;
  }

  async getCourts(clubId: number): Promise<any> {
    const cachedData = await this.cacheService.get(clubId.toString())
    if (cachedData) {
      return cachedData;
    }
    const courts = await this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts`, {
        baseURL: this.base_url,
      })
      .then((res) => res.data);
    await this.cacheService.set(clubId.toString(), courts, 1000);
    return courts;
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<any> {
    const cachedData = await this.cacheService.get(`${clubId.toString()}-${courtId.toString()}`)
    if (cachedData) {
      return cachedData;
    }
    const slots = this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
        baseURL: this.base_url,
        params: { date: moment(date).format('YYYY-MM-DD') },
      })
      .then((res) => res.data);
      await this.cacheService.set(`${clubId.toString()}-${courtId.toString()}`, slots, 1000);
      return slots;
  }
}
