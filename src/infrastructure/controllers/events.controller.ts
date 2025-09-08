import { Body, Controller, Post } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { UseZodGuard } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import * as moment from 'moment';

import {
  ClubUpdatedEvent,
  CourtUpdatedEvent,
  SlotAvailableEvent,
  SlotBookedEvent,
} from '../../domain/events';
import { AdvancedCacheService } from '../services/advanced-cache.service';
import { GetAvailabilityHandler } from '../../domain/handlers/get-availability.handler';

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
    type: z.literal('booking_cancelled'),
    clubId: z.number().int(),
    courtId: z.number().int(),
    slot: SlotSchema,
  }),
  z.object({
    type: z.literal('booking_created'),
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

/**
 * Controlador de eventos optimizado con:
 * - Invalidación selectiva de cache
 * - Manejo de eventos en background
 * - Métricas de eventos procesados
 * - Fallback graceful en caso de errores
 */
@Controller('events')
export class EventsController {
  private eventMetrics = {
    processed: 0,
    errors: 0,
    lastProcessed: null as Date | null,
  };

  constructor(
    private readonly eventBus: EventBus,
    private readonly advancedCache: AdvancedCacheService,
    private readonly availabilityHandler: GetAvailabilityHandler,
  ) {}

  @Post()
  @UseZodGuard('body', ExternalEventSchema)
  async receiveEvent(@Body() externalEvent: ExternalEventDTO): Promise<void> {
    const startTime = Date.now();
    try {
      const event = this.createEventFromExternal(externalEvent);
      await this.eventBus.publish(event);

      await this.invalidateCacheSelectively(externalEvent);

      this.eventMetrics.processed++;
      this.eventMetrics.lastProcessed = new Date();

      const duration = Date.now() - startTime;
      console.log(`Event processed in ${duration}ms:`, {
        type: externalEvent.type,
        clubId: externalEvent.clubId,
        courtId: 'courtId' in externalEvent ? externalEvent.courtId : 'N/A',
      });
    } catch (error) {
      this.eventMetrics.errors++;
      console.error('Error processing event:', error);
    }
  }

  private createEventFromExternal(externalEvent: ExternalEventDTO) {
    if (externalEvent.type === 'booking_created') {
      return new SlotBookedEvent(
        externalEvent.clubId,
        externalEvent.courtId,
        externalEvent.slot,
      );
    }

    if (externalEvent.type === 'booking_cancelled') {
      return new SlotAvailableEvent(
        externalEvent.clubId,
        externalEvent.courtId,
        externalEvent.slot,
      );
    }

    if (externalEvent.type === 'club_updated') {
      return new ClubUpdatedEvent(externalEvent.clubId, externalEvent.fields);
    }

    if (externalEvent.type === 'court_updated') {
      return new CourtUpdatedEvent(
        externalEvent.clubId,
        externalEvent.courtId,
        externalEvent.fields,
      );
    }

    throw new Error(`Unknown event type: ${(externalEvent as any).type}`);
  }

  private async invalidateCacheSelectively(
    event: ExternalEventDTO,
  ): Promise<void> {
    const { clubId, type } = event;

    try {
      switch (type) {
        case 'club_updated':
          await this.invalidateClubCache(clubId);
          break;

        case 'court_updated':
          if ('courtId' in event) {
            await this.invalidateCourtCache(clubId, event.courtId);
          }
          break;

        case 'booking_created':
        case 'booking_cancelled':
          if ('courtId' in event && 'slot' in event) {
            await this.invalidateSlotCache(clubId, event.courtId, event.slot);
          }
          break;
      }

      await this.invalidateAvailabilityCache(clubId);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  private async invalidateClubCache(clubId: number): Promise<void> {
    await this.advancedCache.invalidateByPattern(`clubs:*`);
    await this.advancedCache.invalidateByPattern(`clubs:stale:*`);

    const courtsKey = this.advancedCache.generateKey('courts', clubId);
    const courtsStaleKey = this.advancedCache.generateStaleKey(
      'courts',
      clubId,
    );
    await this.advancedCache.invalidateByPattern(courtsKey);
    await this.advancedCache.invalidateByPattern(courtsStaleKey);
  }

  private async invalidateCourtCache(
    clubId: number,
    courtId: number,
  ): Promise<void> {
    const courtKey = this.advancedCache.generateKey('courts', clubId);
    const courtStaleKey = this.advancedCache.generateStaleKey('courts', clubId);
    await this.advancedCache.invalidateByPattern(courtKey);
    await this.advancedCache.invalidateByPattern(courtStaleKey);
  }

  private async invalidateSlotCache(
    clubId: number,
    courtId: number,
    slot: any,
  ): Promise<void> {
    const date = new Date(slot.datetime);
    const formattedDate = moment(date).format('YYYY-MM-DD');

    const slotsKey = this.advancedCache.generateKey(
      'slots',
      clubId,
      courtId,
      formattedDate,
    );
    const slotsStaleKey = this.advancedCache.generateStaleKey(
      'slots',
      clubId,
      courtId,
      formattedDate,
    );
    await this.advancedCache.invalidateByPattern(slotsKey);
    await this.advancedCache.invalidateByPattern(slotsStaleKey);
  }

  private async invalidateAvailabilityCache(clubId: number): Promise<void> {
    const today = new Date();
    const invalidatePromises: Promise<void>[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const formattedDate = date.toISOString().split('T')[0];

      const placeIds = [
        'ChIJoYUAHyvmopUR4xJzVPBE_Lw',
        'ChIJW9fXNZNTtpURV6VYAumGQOw',
      ];

      for (const placeId of placeIds) {
        invalidatePromises.push(
          this.availabilityHandler.invalidateCacheForPlace(placeId, date),
        );
      }
    }

    try {
      await Promise.all(invalidatePromises);
    } catch (error) {
      console.error('Some cache invalidation operations failed:', error);
    }
  }

  /**
   * Obtiene métricas de eventos procesados
   */
  getEventMetrics() {
    return {
      ...this.eventMetrics,
      successRate:
        this.eventMetrics.processed > 0
          ? (
              ((this.eventMetrics.processed - this.eventMetrics.errors) /
                this.eventMetrics.processed) *
              100
            ).toFixed(2) + '%'
          : '0%',
    };
  }
}
