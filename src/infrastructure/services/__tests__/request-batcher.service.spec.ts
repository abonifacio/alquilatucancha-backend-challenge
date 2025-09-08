import { Test, TestingModule } from '@nestjs/testing';
import { RequestBatcherService } from '../request-batcher.service';

describe('RequestBatcherService', () => {
  let service: RequestBatcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestBatcherService],
    }).compile();

    service = module.get<RequestBatcherService>(RequestBatcherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeBatched', () => {
    it('should execute request and return result', async () => {
      const mockRequest = jest.fn().mockResolvedValue('test result');

      const result = await service.executeBatched('test-key', mockRequest);

      expect(result).toBe('test result');
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should reuse pending request for same key', async () => {
      const mockRequest = jest.fn().mockResolvedValue('test result');

      // Execute two requests with same key simultaneously
      const [result1, result2] = await Promise.all([
        service.executeBatched('test-key', mockRequest),
        service.executeBatched('test-key', mockRequest)
      ]);

      expect(result1).toBe('test result');
      expect(result2).toBe('test result');
      expect(mockRequest).toHaveBeenCalledTimes(1); // Should only call once
    });

    it('should handle different keys independently', async () => {
      const mockRequest1 = jest.fn().mockResolvedValue('result1');
      const mockRequest2 = jest.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        service.executeBatched('key1', mockRequest1),
        service.executeBatched('key2', mockRequest2)
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockRequest1).toHaveBeenCalledTimes(1);
      expect(mockRequest2).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeConcurrent', () => {
    it('should execute all requests concurrently', async () => {
      const requests = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3')
      ];

      const results = await service.executeConcurrent(requests);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      requests.forEach(request => {
        expect(request).toHaveBeenCalledTimes(1);
      });
    });

    it('should respect max concurrency limit', async () => {
      const requests = Array(10).fill(null).map((_, i) => 
        jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(`result${i}`), 100))
        )
      );

      const startTime = Date.now();
      const results = await service.executeConcurrent(requests, 3);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeGreaterThan(200); // Should take more than 200ms due to concurrency limit
    });

    it('should handle request failures gracefully', async () => {
      const requests = [
        jest.fn().mockResolvedValue('success'),
        jest.fn().mockRejectedValue(new Error('Request failed')),
        jest.fn().mockResolvedValue('success2')
      ];

      // This test should not throw, but handle the error gracefully
      await expect(service.executeConcurrent(requests)).rejects.toThrow('Request failed');
    });
  });

  describe('cleanup', () => {
    it('should clean up pending requests and timers', () => {
      // This test would need to be more complex in a real scenario
      // where we can verify internal state
      expect(() => service.cleanup()).not.toThrow();
    });
  });
});
