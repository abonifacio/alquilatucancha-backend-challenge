import { BadRequestException } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import {
  _addDaysToDate,
  _formatDate,
  _setDate,
} from '../../shared/helpers/date.helper';
import { GetAvailabilityQuery } from '../commands/get-availaiblity.query';
import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import { GetAvailabilityHandler } from './get-availability.handler';

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let client: FakeAlquilaTuCanchaClient;
  let cacheManager: Cache;

  beforeEach(() => {
    client = new FakeAlquilaTuCanchaClient();
    cacheManager = new FakeCacheManager() as any;
    handler = new GetAvailabilityHandler(client, cacheManager);
  });

  it('returns Invalid Date', async () => {
    const placeId = '123';
    const date = _setDate('2022-12-05');

    await expect(handler.execute({ placeId, date })).rejects.toThrow(
      BadRequestException,
    );
  });
  it('returns availabilities from API', async () => {
    const date = _addDaysToDate(new Date(), 1);
    const formatedDate = _formatDate(date, 'YYYY-MM-DD');

    const slot = `1_1_${formatedDate}`;

    client.clubs = {
      '123': [{ id: 1 }],
    };
    client.courts = {
      '1': [{ id: 1 }],
    };
    client.slots = {
      [slot]: [],
    };

    const placeId = '123';

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
    expect(cacheManager.set).toHaveBeenCalled();
  });

  it('returns availabilities from cache', async () => {
    const date = _addDaysToDate(new Date(), 1);
    const formatedDate = _formatDate(date, 'YYYY-MM-DD');

    const slot = `1_1_${formatedDate}`;

    client.clubs = {
      '123': [{ id: 1 }],
    };
    client.courts = {
      '1': [{ id: 1 }],
    };
    client.slots = {
      [slot]: [],
    };

    const placeId = '123';

    const emptyCache = await cacheManager.get('club:1');
    expect(emptyCache).toEqual(undefined);

    await handler.execute(new GetAvailabilityQuery(placeId, date));
    const cachedClubs = await cacheManager.get('club:1');
    const cachedCourts = await cacheManager.get('court:1');

    expect(cachedClubs).toEqual({ id: 1 });
    expect(cachedCourts).toEqual({ id: 1 });
  });
});

class FakeAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  clubs: Record<string, Club[]> = {};
  courts: Record<string, Court[]> = {};
  slots: Record<string, Slot[]> = {};
  async getClubs(placeId: string): Promise<Club[]> {
    return this.clubs[placeId];
  }
  async getCourts(clubId: number): Promise<Court[]> {
    return this.courts[String(clubId)];
  }
  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    return this.slots[
      `${clubId}_${courtId}_${_formatDate(date, 'YYYY-MM-DD')}`
    ];
  }
}

interface MockCache {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
}

class FakeCacheManager implements MockCache {
  private cache = new Map<string, any>();

  get = jest.fn(async (key: string) => {
    return this.cache.get(key);
  });

  set = jest.fn(async (key: string, value: any): Promise<void> => {
    this.cache.set(key, value);
  });
}
