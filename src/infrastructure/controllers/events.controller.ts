import { Body, CACHE_MANAGER, Controller, Inject, Post } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Cache } from 'cache-manager';
import { UseZodGuard } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

import { ClubUpdatedEvent } from '../../domain/events/club-updated.event';
import { CourtUpdatedEvent } from '../../domain/events/court-updated.event';
import { SlotBookedEvent } from '../../domain/events/slot-booked.event';
import { SlotAvailableEvent } from '../../domain/events/slot-cancelled.event';
import { _deleteCacheByPattern } from '../../shared/helpers/cache.helper';

const SlotSchema = z.object({
  price: z.number(),
  duration: z.number(),
  datetime: z.string(),
  start: z.string(),
  end: z.string(),
  _priority: z.number(),
});

export const ExternalEventSchema = z.union([
  z.object({
    type: z.enum(['booking_cancelled', 'booking_created']),
    clubId: z.number().int(),
    courtId: z.number().int(),
    slot: SlotSchema,
  }),
  z.object({
    type: z.literal('club_updated'),
    clubId: z.number().int(),
    fields: z.array(
      z.enum(['attributes', 'openhours', 'logo_url', 'background_url']),
    ),
  }),
  z.object({
    type: z.literal('court_updated'),
    clubId: z.number().int(),
    courtId: z.number().int(),
    fields: z.array(z.enum(['attributes', 'name'])),
  }),
]);

export type ExternalEventDTO = z.infer<typeof ExternalEventSchema>;

@Controller('events')
export class EventsController {
  constructor(
    private eventBus: EventBus,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  @UseZodGuard('body', ExternalEventSchema)
  async receiveEvent(@Body() externalEvent: ExternalEventDTO) {
    switch (externalEvent.type) {
      case 'booking_created':
        await this._handleSlotBooking(
          externalEvent.clubId,
          externalEvent.courtId,
          externalEvent.slot.datetime,
        );
        this.eventBus.publish(
          new SlotBookedEvent(
            externalEvent.clubId,
            externalEvent.courtId,
            externalEvent.slot,
          ),
        );
        break;
      case 'booking_cancelled':
        await this._handleSlotAvailability(
          externalEvent.clubId,
          externalEvent.courtId,
          externalEvent.slot.datetime,
        );
        this.eventBus.publish(
          new SlotAvailableEvent(
            externalEvent.clubId,
            externalEvent.courtId,
            externalEvent.slot,
          ),
        );
        break;
      case 'club_updated':
        this._handleClubUpdate(externalEvent.clubId, externalEvent.fields);
        this.eventBus.publish(
          new ClubUpdatedEvent(externalEvent.clubId, externalEvent.fields),
        );
        break;
      case 'court_updated':
        await this._handleCourtUpdate(externalEvent.courtId);
        this.eventBus.publish(
          new CourtUpdatedEvent(
            externalEvent.clubId,
            externalEvent.courtId,
            externalEvent.fields,
          ),
        );
        break;
    }
  }

  private async _handleSlotBooking(
    clubId: number,
    courtId: number,
    datetime: string,
  ) {
    const cacheKey = `clubId:${clubId}:courtId:${courtId}:date:${datetime}:slots`;
    await this.cacheManager.del(cacheKey);
  }

  private async _handleSlotAvailability(
    clubId: number,
    courtId: number,
    datetime: string,
  ) {
    const cacheKey = `clubId:${clubId}:courtId:${courtId}:date:${datetime}:slots`;
    await this.cacheManager.del(cacheKey);
  }

  private async _handleClubUpdate(clubId: number, fields: string[]) {
    const cacheKey = `club:${clubId}`;
    await this.cacheManager.del(cacheKey);

    if (fields.includes('openhours'))
      await _deleteCacheByPattern(`clubId:${clubId}:*`, this.cacheManager);
  }

  private async _handleCourtUpdate(courtId: number) {
    const cacheKey = `court:${courtId}`;
    await this.cacheManager.del(cacheKey);
  }
}
