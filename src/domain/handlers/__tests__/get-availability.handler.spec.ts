import * as moment from 'moment';
import { AlquilaTuCanchaClient } from '../../ports/alquila-tu-cancha.client';
import { GetAvailabilityQuery } from '../../commands/get-availability.query';
import { Club } from '../../model/club';
import { Court } from '../../model/court';
import { Slot } from '../../model/slot';
import { GetAvailabilityHandler } from '../get-availability.handler';
import { BadRequestException } from '@nestjs/common';
import { CacheService } from 'src/domain/ports/cache.service';

class FakeAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  clubs: Record<string, Club[]> = {};
  courts: Record<string, Court[]> = {};
  slots: Record<string, Slot[]> = {};
  getClubsCalls = 0;

  async getClubs(placeId: string): Promise<Club[]> {
    this.getClubsCalls++;
    return this.clubs[placeId] || [];
  }

  async getCourts(clubId: number): Promise<Court[]> {
    return this.courts[String(clubId)] || [];
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    return (
      this.slots[`${clubId}_${courtId}_${moment(date).format('YYYY-MM-DD')}`] ||
      []
    );
  }
}

class FakeCacheService implements CacheService {
  get = jest.fn();
  set = jest.fn();
  delete = jest.fn();
  clear = jest.fn();
  deleteByPattern = jest.fn();
}

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let client: FakeAlquilaTuCanchaClient;
  let cacheService: FakeCacheService;

  const placeId = '123';
  const date = moment().add(1, 'day').toDate();
  const club = { id: 1, name: 'Test Club' };
  const court = { id: 1, name: 'Court 1' };
  const slots = [
    {
      price: 1000,
      duration: 60,
      datetime: '2025-01-27T10:00:00',
      start: '10:00',
      end: '11:00',
      _priority: 1,
    },
  ];

  beforeEach(() => {
    client = new FakeAlquilaTuCanchaClient();
    cacheService = new FakeCacheService();
    handler = new GetAvailabilityHandler(cacheService, client);
    
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should throw BadRequestException when date is more than 7 days in the future', async () => {
      const futureDate = moment().add(8, 'days').toDate();

      await expect(
        handler.execute(new GetAvailabilityQuery(placeId, futureDate)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fetch and cache data when cache is empty', async () => {
      cacheService.get.mockResolvedValue(null);
      
      client.clubs = { [placeId]: [club] };
      client.courts = { '1': [court] };
      client.slots = {
        [`1_1_${moment(date).format('YYYY-MM-DD')}`]: slots,
      };

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toEqual([
        {
          ...club,
          courts: [{ ...court, available: slots }],
        },
      ]);
    });

    it('should return clubs with availability from cache when available', async () => {
      cacheService.get.mockImplementation((key: string) => {
        const cacheData = {
          [`club_ids:${placeId}`]: [1],
          [`club:1`]: club,
          [`courts:1`]: [court],
          [`slots:1:1:${date.toISOString().split('T')[0]}`]: slots,
        };
        return Promise.resolve(cacheData[key] || null);
      });

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toEqual([
        {
          ...club,
          courts: [{ ...court, available: slots }],
        },
      ]);
      
      expect(client.getClubsCalls).toBe(0);
      
      expect(cacheService.get).toHaveBeenCalledWith(`club_ids:${placeId}`);
      expect(cacheService.get).toHaveBeenCalledWith(`club:1`);
      expect(cacheService.get).toHaveBeenCalledWith(`courts:1`);
      expect(cacheService.get).toHaveBeenCalledWith(`slots:1:1:${date.toISOString().split('T')[0]}`);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle empty results gracefully', async () => {
      cacheService.get.mockResolvedValue(null);
      
      client.clubs = { [placeId]: [] };

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toEqual([]);
    });
  });
});
