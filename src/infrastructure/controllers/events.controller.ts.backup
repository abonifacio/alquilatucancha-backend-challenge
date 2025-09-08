import { Body, Controller, Post } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { UseZodGuard } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

import {
  ClubUpdatedEvent,
  CourtUpdatedEvent,
  SlotAvailableEvent,
  SlotBookedEvent,
} from '../../domain/events';
import { RedisService } from './redis.service';

const SlotSchema = z.object({
  price: z.number(),
  duration: z.number(),
  datetime: z.string(),
  start: z.string(),
  end: z.string(),
  _priority: z.number(),
});

export const ExternalEventSchema = z.discriminatedUnion('type', [
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
    private readonly eventBus: EventBus,
    private readonly redisService: RedisService,
  ) {}

  @Post()
  @UseZodGuard('body', ExternalEventSchema)
  async receiveEvent(@Body() externalEvent: ExternalEventDTO): Promise<void> {
    const eventMap = {
      booking_created: () =>
        new SlotBookedEvent(
          externalEvent.clubId,
          externalEvent.courtId,
          externalEvent.slot,
        ),
      booking_cancelled: () =>
        new SlotAvailableEvent(
          externalEvent.clubId,
          externalEvent.courtId,
          externalEvent.slot,
        ),
      club_updated: () =>
        new ClubUpdatedEvent(externalEvent.clubId, externalEvent.fields),
      court_updated: () =>
        new CourtUpdatedEvent(
          externalEvent.clubId,
          externalEvent.courtId,
          externalEvent.fields,
        ),
    };

    const event = eventMap[externalEvent.type]();
    await this.eventBus.publish(event);

    // Invalidar caché selectivamente
    await this.invalidateCache(externalEvent);
  }

  private async invalidateCache(event: ExternalEventDTO): Promise<void> {
    const { clubId, type } = event;
    const placeId = await this.redisService.get(`clubToPlace:${clubId}`);

    if (type === 'club_updated' || type === 'court_updated') {
      await this.redisService.del(`clubs:${placeId}`);
      await this.redisService.del(`courts:${clubId}`);
    }

    if (type === 'booking_created' || type === 'booking_cancelled') {
      const { courtId, slot } = event;
      const date = new Date(slot.datetime);
      const formattedDate = format(date, 'yyyy-MM-dd');
      await this.redisService.del(
        `slots:${clubId}:${courtId}:${formattedDate}`,
      );
    }
  }
}
