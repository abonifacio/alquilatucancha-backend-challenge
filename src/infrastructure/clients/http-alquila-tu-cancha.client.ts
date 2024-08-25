import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import { CACHE_CLIENT, CacheClient } from 'src/domain/ports/cache.client';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;

  // inject localCAche dependencies
  constructor(
    private httpService: HttpService,
    config: ConfigService,
    @Inject(CACHE_CLIENT) private localCacheClient: CacheClient,
  ) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const clubsInCache = await this.localCacheClient.getClubs(placeId);

    if (clubsInCache) return clubsInCache;

    const clubs = await this.httpService.axiosRef
      .get('clubs', {
        baseURL: this.base_url,
        params: { placeId },
      })
      .then((res) => res.data);

    await this.localCacheClient.setClubs(placeId, clubs);
    return clubs;
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const courtsInCache = await this.localCacheClient.getCourts(clubId);

    if (courtsInCache) return courtsInCache;

    const cours = await this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts`, {
        baseURL: this.base_url,
      })
      .then((res) => res.data);

    await this.localCacheClient.setCourts(clubId, cours);

    return cours;
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const availablesSlotsInCache =
      await this.localCacheClient.getAvailableSlots(clubId, courtId, date);

    if (availablesSlotsInCache) return availablesSlotsInCache;

    const availablesSlots = await this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
        baseURL: this.base_url,
        params: { date: moment(date).format('YYYY-MM-DD') },
      })
      .then((res) => res.data);

    await this.localCacheClient.setAvailableSlots(
      clubId,
      courtId,
      date,
      availablesSlots,
    );

    return availablesSlots;
  }
}
