import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CourtUpdatedHandler } from '../court-updated.handler';
import { CourtUpdatedEvent } from '../../events/court-updated.event';
import { CACHE_SERVICE, CacheService } from '../../ports/cache.service';

describe('CourtUpdatedHandler', () => {
  let handler: CourtUpdatedHandler;
  let cacheService: jest.Mocked<CacheService>;

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
        CourtUpdatedHandler,
        {
          provide: CACHE_SERVICE,
          useValue: cacheServiceMock,
        },
      ],
    }).compile();

    handler = moduleRef.get<CourtUpdatedHandler>(CourtUpdatedHandler);
    cacheService = moduleRef.get(CACHE_SERVICE);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete courts cache when court is updated', async () => {
    const event = new CourtUpdatedEvent(1, 2, ['name']);

    await handler.handle(event);

    expect(cacheService.delete).toHaveBeenCalledWith('courts:1');
  });
});
