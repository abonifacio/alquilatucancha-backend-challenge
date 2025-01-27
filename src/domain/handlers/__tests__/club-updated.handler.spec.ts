import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ClubUpdatedHandler } from '../club-updated.handler';
import { ClubUpdatedEvent } from '../../events/club-updated.event';
import { CACHE_SERVICE, CacheService } from '../../ports/cache.service';

describe('ClubUpdatedHandler', () => {
  let handler: ClubUpdatedHandler;
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
        ClubUpdatedHandler,
        {
          provide: CACHE_SERVICE,
          useValue: cacheServiceMock,
        },
      ],
    }).compile();

    handler = moduleRef.get<ClubUpdatedHandler>(ClubUpdatedHandler);
    cacheService = moduleRef.get(CACHE_SERVICE);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete club cache and club_ids pattern when club is updated', async () => {
    const event = new ClubUpdatedEvent(1, ['attributes']);

    await handler.handle(event);

    expect(cacheService.delete).toHaveBeenCalledWith('club:1');
    expect(cacheService.deleteByPattern).toHaveBeenCalledWith('club_ids:*');
  });

  it('should also delete courts cache when openhours field is updated', async () => {
    const event = new ClubUpdatedEvent(1, ['openhours']);

    await handler.handle(event);

    expect(cacheService.delete).toHaveBeenCalledWith('club:1');
    expect(cacheService.delete).toHaveBeenCalledWith('courts:1');
    expect(cacheService.deleteByPattern).toHaveBeenCalledWith('club_ids:*');
  });
});
