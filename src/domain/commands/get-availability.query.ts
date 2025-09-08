import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';

export class GetAvailabilityQuery {
  constructor(readonly placeId: string, readonly date: Date) {}
}

export interface ClubWithAvailability extends Club {
  courts: (Court & {
    available: Slot[];
  })[];
}
