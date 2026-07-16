import * as moment from 'moment';

import { AlquilaTuCanchaClient } from '../src/domain/ports/aquila-tu-cancha.client';
import { GetAvailabilityQuery } from '../src/domain/commands/get-availaiblity.query';
import { Club } from '../src/domain/model/club';
import { Court } from '../src/domain/model/court';
import { Slot } from '../src/domain/model/slot';
import { GetAvailabilityHandler } from '../src/domain/handlers/get-availability.handler';

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let client: FakeAlquilaTuCanchaClient;
  let fakeRepo: any;

  beforeEach(() => {
    client = new FakeAlquilaTuCanchaClient();
    fakeRepo = {
      getClubs: jest.fn().mockResolvedValue(undefined),
      setClubs: jest.fn(),
      getCourts: jest.fn().mockResolvedValue(undefined),
      setCourts: jest.fn(),
      getSlots: jest.fn().mockResolvedValue(undefined),
      setSlots: jest.fn(),
      clearSlots: jest.fn(),
      clearAll: jest.fn(),
    };
    handler = new GetAvailabilityHandler(client, fakeRepo as any);
  });

  it('returns the availability (Cache Miss)', async () => {
    client.clubs = { '123': [{ id: 1 }] };
    client.courts = { '1': [{ id: 1 }] };
    client.slots = { '1_1_2022-12-05': [] };
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    // Spies para verificar si llamó al cliente real
    const getClubsSpy = jest.spyOn(client, 'getClubs');
    const getCourtsSpy = jest.spyOn(client, 'getCourts');

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
    expect(getClubsSpy).toHaveBeenCalledWith('123');
    expect(fakeRepo.setClubs).toHaveBeenCalledWith('123', [{ id: 1 }]);
  });

  it('returns the availability from cache (Cache Hit) without calling the client', async () => {
    // Simulamos que el repositorio ya tiene los datos cacheados
    fakeRepo.getClubs.mockResolvedValue([{ id: 1 }]);
    fakeRepo.getCourts.mockResolvedValue([{ id: 1 }]);
    fakeRepo.getSlots.mockResolvedValue([]);

    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const getClubsSpy = jest.spyOn(client, 'getClubs');
    const getCourtsSpy = jest.spyOn(client, 'getCourts');

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
    
    // Verificamos que NUNCA llamó al cliente porque usó la caché
    expect(getClubsSpy).not.toHaveBeenCalled();
    expect(getCourtsSpy).not.toHaveBeenCalled();
    
    // Y no tuvo necesidad de guardarlo de nuevo
    expect(fakeRepo.setClubs).not.toHaveBeenCalled();
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
