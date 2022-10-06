import { CACHE_MANAGER } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as moment from 'moment';
import { Cache } from 'cache-manager';

import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { GetAvailabilityQuery } from '../commands/get-availaiblity.query';
import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import { GetAvailabilityHandler } from './get-availability.handler';

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let client: FakeAlquilaTuCanchaClient;

  beforeEach(async () => {
  
  let cache: Cache
    const app = await Test.createTestingModule({
      providers: [
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => jest.fn(),
            set: () => jest.fn(),
          },
        },
      ],
    })
    .compile();
    cache = app.get(CACHE_MANAGER);
    client = new FakeAlquilaTuCanchaClient();

    handler = new GetAvailabilityHandler(client,cache);
  });

  it('returns the availability', async () => {
    client.clubs = {
      '123': [{ id: 1 }],
    };
    client.courts = {
      '1': [{ id: 1 }],
    };
    client.slots = {
      '1_1_2022-12-05': [],
    };
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
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
      `${clubId}_${courtId}_${moment(date).format('YYYY-MM-DD')}`
    ];
  }
}
