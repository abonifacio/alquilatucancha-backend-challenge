import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import * as moment from 'moment';

import { ClubUpdatedEvent } from '../events/club-updated.event';
import { CourtUpdatedEvent } from '../events/court-updated.event';
import { SlotBookedEvent } from '../events/slot-booked.event';
import { SlotAvailableEvent } from '../events/slot-cancelled.event';
import {
  AvailabilityRepository,
} from '../ports/availability-repository';

@EventsHandler(SlotBookedEvent, SlotAvailableEvent, ClubUpdatedEvent, CourtUpdatedEvent)
export class CacheInvalidationHandler implements IEventHandler<any> {
  constructor(
    @Inject('AVAILABILITY_REPOSITORY')
    private availabilityRepository: AvailabilityRepository,
  ) {}

  async handle(event: any) {
    if (
      event instanceof SlotBookedEvent ||
      event instanceof SlotAvailableEvent
    ) {
      const dateString = moment(event.slot.datetime).format('YYYY-MM-DD');
      await this.availabilityRepository.clearSlots(
        event.clubId,
        event.courtId,
        dateString,
      );
    }

    if (event instanceof ClubUpdatedEvent || event instanceof CourtUpdatedEvent) {
      // Si cambia cualquier dato del club o de la cancha, borramos toda la caché para asegurar que los datos estáticos estén al día.
      await this.availabilityRepository.clearAll();
    }
  }
}
