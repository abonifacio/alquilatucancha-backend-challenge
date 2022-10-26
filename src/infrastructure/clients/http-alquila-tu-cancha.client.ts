import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import { Zone } from 'src/domain/model/zone';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';

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

  async getZones(): Promise<Zone[]> {
    const zones: Zone[] | undefined = await this.cacheManager.get('zones');
    if (zones) {
      return zones;
    }
    return this.httpService.axiosRef
      .get('zones', { baseURL: this.base_url })
      .then(async (res) => {
        await this.cacheManager.set('zones', res.data);
        return res.data;
      });
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const clubs: Club[] | undefined = await this.cacheManager.get(placeId);
    if (clubs) {
      return clubs;
    }
    return this.httpService.axiosRef
      .get('clubs', {
        baseURL: this.base_url,
        params: { placeId },
      })
      .then(async (res) => {
        await this.cacheManager.set(placeId, res.data);
        return res.data;
      });
  }

  async getClub(clubId: number): Promise<Club> {
    const club: Club | undefined = await this.cacheManager.get(clubId);
    if (club) {
      return club;
    }
    return this.httpService.axiosRef
      .get(`clubs/${clubId}`, { baseURL: this.base_url })
      .then(async (res) => {
        await this.cacheManager.set(clubId, res.data);
        return res.data;
      });
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const courts: Court[] | undefined = await this.cacheManager.get(
      `${clubId}_courts`,
    );
    if (courts) {
      return courts;
    }
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts`, {
        baseURL: this.base_url,
      })
      .then(async (res) => {
        await this.cacheManager.set(`${clubId}_courts`, res.data);
        return res.data;
      });
  }

  async getCourt(clubId: number, courtId: number): Promise<Court> {
    const court: Court | undefined = await this.cacheManager.get(courtId);
    if (court) {
      return court;
    }
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts/${courtId}`, {
        baseURL: this.base_url,
      })
      .then(async (res) => {
        await this.cacheManager.set(courtId, res.data);
        return res.data;
      });
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const slot: Slot[] | undefined = await this.cacheManager.get(date);
    if (slot) {
      return slot;
    }
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
        baseURL: this.base_url,
        params: { date: moment(date).format('YYYY-MM-DD') },
      })
      .then(async (res) => {
        await this.cacheManager.set(date, res.data);
        return res.data;
      });
  }
}
