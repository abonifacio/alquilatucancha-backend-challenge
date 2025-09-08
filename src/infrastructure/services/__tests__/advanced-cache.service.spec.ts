import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedCacheService } from '../advanced-cache.service';
import { RedisService } from '../../clients/redis.service';

describe('AdvancedCacheService', () => {
  let service: AdvancedCacheService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedCacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AdvancedCacheService>(AdvancedCacheService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWithFallback', () => {
    it('should return fresh data when available', async () => {
      const testData = { id: 1, name: 'Test Club' };
      redisService.get.mockResolvedValueOnce(JSON.stringify(testData));

      const result = await service.getWithFallback('test-key');

      expect(result.data).toEqual(testData);
      expect(result.isStale).toBe(false);
      expect(redisService.get).toHaveBeenCalledWith('test-key');
    });

    it('should return stale data when fresh data is not available', async () => {
      const testData = { id: 1, name: 'Test Club' };
      redisService.get
        .mockResolvedValueOnce(null) // No fresh data
        .mockResolvedValueOnce(JSON.stringify(testData)); // Stale data available

      const result = await service.getWithFallback('test-key', 'stale-key');

      expect(result.data).toEqual(testData);
      expect(result.isStale).toBe(true);
      expect(redisService.get).toHaveBeenCalledTimes(2);
    });

    it('should return null when no data is available', async () => {
      redisService.get
        .mockResolvedValueOnce(null) // No fresh data
        .mockResolvedValueOnce(null); // No stale data

      const result = await service.getWithFallback('test-key', 'stale-key');

      expect(result.data).toBeNull();
      expect(result.isStale).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      redisService.get.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await service.getWithFallback('test-key');

      expect(result.data).toBeNull();
      expect(result.isStale).toBe(false);
    });
  });

  describe('setWithIntelligentTTL', () => {
    it('should set data with correct TTL for CLUBS', async () => {
      const testData = { id: 1, name: 'Test Club' };
      redisService.set.mockResolvedValueOnce(true);

      await service.setWithIntelligentTTL('test-key', testData, 'CLUBS');

      expect(redisService.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData),
        3600 // 1 hour TTL for clubs
      );
    });

    it('should set data with correct TTL for SLOTS', async () => {
      const testData = [{ id: 1, price: 100 }];
      redisService.set.mockResolvedValueOnce(true);

      await service.setWithIntelligentTTL('test-key', testData, 'SLOTS');

      expect(redisService.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData),
        300 // 5 minutes TTL for slots
      );
    });

    it('should create stale backup when staleKey is provided', async () => {
      const testData = { id: 1, name: 'Test Club' };
      redisService.set.mockResolvedValue(true);

      await service.setWithIntelligentTTL('test-key', testData, 'CLUBS', 'stale-key');

      expect(redisService.set).toHaveBeenCalledTimes(2);
      expect(redisService.set).toHaveBeenCalledWith('stale-key', JSON.stringify(testData), 7200);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent cache keys', () => {
      const key1 = service.generateKey('clubs', 'place123');
      const key2 = service.generateKey('clubs', 'place123');
      
      expect(key1).toBe('clubs:place123');
      expect(key1).toBe(key2);
    });

    it('should handle multiple parameters', () => {
      const key = service.generateKey('slots', 1, 2, '2024-01-01');
      
      expect(key).toBe('slots:1:2:2024-01-01');
    });
  });

  describe('generateStaleKey', () => {
    it('should generate stale keys with correct prefix', () => {
      const staleKey = service.generateStaleKey('clubs', 'place123');
      
      expect(staleKey).toBe('clubs:stale:place123');
    });
  });
});
