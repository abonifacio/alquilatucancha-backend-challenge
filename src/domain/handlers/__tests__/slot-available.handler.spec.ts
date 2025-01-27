import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SlotAvailableHandler } from '../slot-available.handler';
import { SlotAvailableEvent } from '../../events/slot-cancelled.event';
import { CACHE_SERVICE, CacheService } from '../../ports/cache.service';

describe('SlotAvailableHandler', () => {
  let handler: SlotAvailableHandler;
  let cacheService: jest.Mocked<CacheService>;

  const mockSlot = {
    price: 1000,
    duration: 60,
    datetime: '2025-01-27T10:00:00',
    start: '10:00',
    end: '11:00',
    _priority: 1,
  };

  beforeEach(async () => {
    const cacheServiceMock = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      deleteByPattern: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SlotAvailableHandler,
        {
          provide: CACHE_SERVICE,
          useValue: cacheServiceMock,
        },
      ],
    }).compile();

    handler = moduleRef.get<SlotAvailableHandler>(SlotAvailableHandler);
    cacheService = moduleRef.get(CACHE_SERVICE);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete slots cache when slot becomes available', async () => {
    const event = new SlotAvailableEvent(1, 2, mockSlot);

    await handler.handle(event);

    expect(cacheService.delete).toHaveBeenCalledWith('slots:1:2:2025-01-27');
  });
});
