import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import * as moment from 'moment';
import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { Club } from 'src/domain/model/club';
import { Court } from 'src/domain/model/court';
import { Slot } from 'src/domain/model/slot';
import { Zone } from 'src/domain/model/zone';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../../domain/commands/get-availaiblity.query';
import { HTTPAlquilaTuCanchaClient } from '../clients/http-alquila-tu-cancha.client';

const GetAvailabilitySchema = z.object({
  placeId: z.string(),
  date: z
    .string()
    .regex(/\d{4}-\d{2}-\d{2}/)
    .refine((date) => moment(date).isValid())
    .transform((date) => moment(date).toDate()),
});

class GetAvailabilityDTO extends createZodDto(GetAvailabilitySchema) {}

@Controller('search')
export class SearchController {
  constructor(
    private queryBus: QueryBus,
    private alquilaTuCanchaClient: HTTPAlquilaTuCanchaClient,
  ) {}

  @Get()
  @UsePipes(ZodValidationPipe)
  searchAvailability(
    @Query() query: GetAvailabilityDTO,
  ): Promise<ClubWithAvailability[]> {
    return this.queryBus.execute(
      new GetAvailabilityQuery(query.placeId, query.date),
    );
  }

  @Get('zones')
  getZones(): Promise<Zone[]> {
    return this.alquilaTuCanchaClient.getZones();
  }

  @Get('clubs')
  getClubs(@Query('placeId') palceId: string): Promise<Club[]> {
    return this.alquilaTuCanchaClient.getClubs(palceId);
  }

  @Get('clubs/:id')
  getClub(@Param('id') id: number): Promise<Club> {
    return this.alquilaTuCanchaClient.getClub(id);
  }

  @Get('clubs/:id/courts')
  getCourts(@Param('id') id: number): Promise<Court[]> {
    return this.alquilaTuCanchaClient.getCourts(id);
  }

  @Get('clubs/:clubId/courts/:courtId')
  getCourt(
    @Param('clubId') clubId: number,
    @Param('courtId') courtId: number,
  ): Promise<Court> {
    return this.alquilaTuCanchaClient.getCourt(clubId, courtId);
  }
  @Get('clubs/:clubId/courts/:courtId/slots')
  getAvailableSlots(
    @Param('clubId') clubId: number,
    @Param('courtId') courtId: number,
    @Query('date') date: Date,
  ): Promise<Slot[]> {
    return this.alquilaTuCanchaClient.getAvailableSlots(clubId, courtId, date);
  }
}
