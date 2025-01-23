import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { SearchController } from './search.controller';
import { GetAvailabilityQuery } from '../../domain/commands/get-availaiblity.query';
import * as moment from 'moment';

describe('SearchController', () => {
  let controller: SearchController;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchAvailability', () => {
    it('should call queryBus.execute with the correct arguments', async () => {
      const placeId = 'test-place-id';
      const date = new Date('2025-01-01');
      const expectedDate = moment(date).toDate();

      const mockResult = [{ clubId: '123', availableSlots: 5 }];

      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockResult);

      const result = await controller.searchAvailability({ placeId, date });

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetAvailabilityQuery(placeId, expectedDate),
      );

      expect(result).toEqual(mockResult);
    });

    it('should throw an error if queryBus.execute fails', async () => {
      const placeId = 'test-place-id';
      const date = new Date('2025-01-01');

      jest.spyOn(queryBus, 'execute').mockRejectedValue(new Error('Query failed'));

      await expect(controller.searchAvailability({ placeId, date })).rejects.toThrow('Query failed');
    });
  });
});
