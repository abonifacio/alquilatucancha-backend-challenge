import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { RedisService } from '../services/redis.service';
import { EventsController } from './events.controller';
import { ExternalEventDTO } from './events.controller';
import { ClubUpdatedEvent } from '../../domain/events/club-updated.event';
import { CourtUpdatedEvent } from '../../domain/events/court-updated.event';
import { SlotBookedEvent } from '../../domain/events/slot-booked.event';
import { SlotAvailableEvent } from '../../domain/events/slot-cancelled.event';

describe('EventsController', () => {
  let controller: EventsController;
  let eventBus: EventBus;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    eventBus = module.get<EventBus>(EventBus);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('receiveEvent', () => {
    it('should handle booking_created event', async () => {
        const event: ExternalEventDTO = {
          type: 'booking_created',
          clubId: 1,
          courtId: 1,
          slot: {
            price: 100,
            duration: 60,
            datetime: '2023-10-01',
            start: '10:00',
            end: '11:00',
            _priority: 1,
          },
        };
    
        await controller.receiveEvent(event);
    
        expect(redisService.del).toHaveBeenCalledWith('slots:1:1:2023-10-01');
        expect(eventBus.publish).toHaveBeenCalledWith(
          new SlotBookedEvent(event.clubId, event.courtId, event.slot),
        );
      });
    });

    it('should handle booking_cancelled event', async () => {
      const event: ExternalEventDTO = {
        type: 'booking_cancelled',
        clubId: 1,
        courtId: 1,
        slot: {
          price: 100,
          duration: 60,
          datetime: '2023-10-01',
          start: '10:00',
          end: '11:00',
          _priority: 1,
        },
      };

      await controller.receiveEvent(event);

      expect(redisService.del).toHaveBeenCalledWith('slots:1:1:2023-10-01');
      expect(eventBus.publish).toHaveBeenCalledWith(
        new SlotAvailableEvent(event.clubId, event.courtId, event.slot),
      );
    });

    it('should handle club_updated event with openhours field', async () => {
      const event: ExternalEventDTO = {
        type: 'club_updated',
        clubId: 1,
        fields: ['openhours'],
      };

      await controller.receiveEvent(event);

      expect(redisService.del).toHaveBeenCalledWith('clubs:1');
      expect(eventBus.publish).toHaveBeenCalledWith(
        new ClubUpdatedEvent(event.clubId, event.fields),
      );
    });

    it('should handle court_updated event', async () => {
      const event: ExternalEventDTO = {
        type: 'court_updated',
        clubId: 1,
        courtId: 1,
        fields: ['name'],
      };

      await controller.receiveEvent(event);

      expect(redisService.del).toHaveBeenCalledWith('courts:1');
      expect(eventBus.publish).toHaveBeenCalledWith(
        new CourtUpdatedEvent(event.clubId, event.courtId, event.fields),
      );
    });
  });
