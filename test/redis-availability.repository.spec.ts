import { RedisAvailabilityRepository } from '../src/infrastructure/repositories/redis-availability.repository';
import { Club } from '../src/domain/model/club';

describe('RedisAvailabilityRepository', () => {
  let repository: RedisAvailabilityRepository;
  let cacheManagerMock: any;

  beforeEach(() => {
    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };
    repository = new RedisAvailabilityRepository(cacheManagerMock);
  });

  it('debe obtener y guardar clubes en la caché', async () => {
    const clubs: Club[] = [{ id: 1 } as any];
    
    // Test GET
    cacheManagerMock.get.mockResolvedValue(clubs);
    const result = await repository.getClubs('place_123');
    expect(cacheManagerMock.get).toHaveBeenCalledWith('clubs:place_123');
    expect(result).toEqual(clubs);

    // Test SET
    await repository.setClubs('place_123', clubs);
    // Verificar que se llama a .set con TTL
    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      'clubs:place_123',
      clubs,
      { ttl: 8 * 24 * 60 * 60 } // 8 días
    );
  });

  it('debe limpiar los slots correctamente', async () => {
    await repository.clearSlots(1, 140, '2022-08-25');
    expect(cacheManagerMock.del).toHaveBeenCalledWith('slots:1:140:2022-08-25');
  });

  it('debe limpiar toda la caché', async () => {
    await repository.clearAll();
    expect(cacheManagerMock.reset).toHaveBeenCalled();
  });
});
