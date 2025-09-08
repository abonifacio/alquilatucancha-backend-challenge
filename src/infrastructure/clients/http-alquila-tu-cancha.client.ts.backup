import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';

import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { Club, Court, Slot } from '../../domain/model';
import { RedisService } from './redis.service';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(HTTPAlquilaTuCanchaClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'ATC_BASE_URL',
      'http://localhost:4000',
    );
  }

  private async getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    const cachedData = await this.redisService.get(key);
    if (cachedData) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return JSON.parse(cachedData);
    }

    this.logger.debug(`Cache miss for key: ${key}`);
    const data = await fetchFn();
    await this.redisService.set(key, JSON.stringify(data), 300);
    return data;
  }

  async getClubs(placeId: string): Promise<Club[]> {
    return this.getCachedOrFetch(`clubs:${placeId}`, () =>
      this.httpService.axiosRef
        .get<Club[]>('clubs', {
          baseURL: this.baseUrl,
          params: { placeId },
        })
        .then((res) => res.data),
    );
  }

  async getCourts(clubId: number): Promise<Court[]> {
    return this.getCachedOrFetch(`courts:${clubId}`, () =>
      this.httpService.axiosRef
        .get<Court[]>(`/clubs/${clubId}/courts`, {
          baseURL: this.baseUrl,
        })
        .then((res) => res.data),
    );
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return this.getCachedOrFetch(
      `slots:${clubId}:${courtId}:${formattedDate}`,
      () =>
        this.httpService.axiosRef
          .get<Slot[]>(`/clubs/${clubId}/courts/${courtId}/slots`, {
            baseURL: this.baseUrl,
            params: { date: formattedDate },
          })
          .then((res) => res.data),
    );
  }
}
