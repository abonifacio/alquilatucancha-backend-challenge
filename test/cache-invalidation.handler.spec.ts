import { CacheInvalidationHandler } from '../src/domain/handlers/cache-invalidation.handler';
import { SlotBookedEvent } from '../src/domain/events/slot-booked.event';
import { ClubUpdatedEvent } from '../src/domain/events/club-updated.event';
import { CourtUpdatedEvent } from '../src/domain/events/court-updated.event';

describe('CacheInvalidationHandler', () => {
  let handler: CacheInvalidationHandler;
  let fakeRepo: any;

  beforeEach(() => {
    fakeRepo = {
      clearSlots: jest.fn().mockResolvedValue(undefined),
      clearAll: jest.fn().mockResolvedValue(undefined),
    };
    handler = new CacheInvalidationHandler(fakeRepo);
  });

  it('debe borrar los slots específicos cuando ocurre un SlotBookedEvent', async () => {
    const event = new SlotBookedEvent(1, 140, {
      price: 2000,
      duration: 60,
      datetime: '2022-08-25T10:30:00Z',
      start: '10:30',
      end: '11:30',
      _priority: 1,
    });

    await handler.handle(event);

    expect(fakeRepo.clearSlots).toHaveBeenCalledWith(1, 140, '2022-08-25');
    expect(fakeRepo.clearAll).not.toHaveBeenCalled();
  });

  it('debe borrar toda la caché cuando ocurre un ClubUpdatedEvent', async () => {
    const event = new ClubUpdatedEvent(1, ['openhours']);

    await handler.handle(event);

    expect(fakeRepo.clearAll).toHaveBeenCalled();
    expect(fakeRepo.clearSlots).not.toHaveBeenCalled();
  });

  it('debe borrar toda la caché cuando ocurre un CourtUpdatedEvent', async () => {
    const event = new CourtUpdatedEvent(1, 140, ['name']);

    await handler.handle(event);

    expect(fakeRepo.clearAll).toHaveBeenCalled();
    expect(fakeRepo.clearSlots).not.toHaveBeenCalled();
  });
});
