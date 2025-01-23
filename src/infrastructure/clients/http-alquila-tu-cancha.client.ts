import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { RedisService } from '../services/redis.service';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  constructor(private httpService: HttpService, config: ConfigService, @Inject(RedisService) private redisService: RedisService) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<Club[]> {

    const cacheKey = `clubs:${placeId}`;
    const cachedClubs = await this.redisService.get(cacheKey);

    if(cachedClubs) {
        return JSON.parse(cachedClubs);
    }

    const clubs = await this.httpService.axiosRef
      .get('clubs', {
        baseURL: this.base_url,
        params: { placeId },
      })
      .then((res) => res.data);

    await this.redisService.set(cacheKey, JSON.stringify(clubs), 60);
    return clubs;
  }

  async getCourts(clubId: number): Promise<Court[]> {
    
    const cacheKey = `courts:${clubId}`
    const cachedCourts = await this.redisService.get(cacheKey);

    if(cachedCourts) {
        return JSON.parse(cachedCourts);
    }

    const courts = await this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts`, {
        baseURL: this.base_url,
      })
      .then((res) => res.data);
    
    await this.redisService.set(cacheKey, JSON.stringify(courts), 60);
    return courts;
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {

    const cacheKey = `slots:${clubId}:${courtId}:${moment(date).format('YYYY-MM-DD')}`;
    const cachedSlots = await this.redisService.get(cacheKey);

    if(cachedSlots) {
        return JSON.parse(cachedSlots);
    }

    const slots = await this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
        baseURL: this.base_url,
        params: { date: moment(date).format('YYYY-MM-DD') },
      })
      .then((res) => res.data);

    await this.redisService.set(cacheKey, JSON.stringify(slots), 60);
    return slots;
  }
}
