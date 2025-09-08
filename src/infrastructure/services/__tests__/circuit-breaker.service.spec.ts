import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should execute operation successfully when circuit is closed', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockFallback = jest.fn();

      const result = await service.execute(mockOperation, mockFallback);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockFallback).not.toHaveBeenCalled();
      expect(service.getState()).toBe('CLOSED');
    });

    it('should use fallback when operation fails', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const mockFallback = jest.fn().mockResolvedValue('fallback result');

      const result = await service.execute(mockOperation, mockFallback);

      expect(result).toBe('fallback result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockFallback).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after multiple failures', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const mockFallback = jest.fn().mockResolvedValue('fallback result');

      // Execute multiple failing operations
      for (let i = 0; i < 5; i++) {
        await service.execute(mockOperation, mockFallback);
      }

      expect(service.getState()).toBe('OPEN');
      expect(service.isOpen()).toBe(true);
    });

    it('should use fallback when circuit is open', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const mockFallback = jest.fn().mockResolvedValue('fallback result');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await service.execute(mockOperation, mockFallback);
      }

      // Try to execute again
      const result = await service.execute(mockOperation, mockFallback);

      expect(result).toBe('fallback result');
      expect(mockOperation).not.toHaveBeenCalledTimes(6); // Should not call operation when open
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('state');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('lastFailureTime');
      expect(metrics).toHaveProperty('timeSinceLastFailure');
      expect(metrics.state).toBe('CLOSED');
    });
  });
});
