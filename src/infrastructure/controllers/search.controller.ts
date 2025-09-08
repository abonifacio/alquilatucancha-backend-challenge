import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import * as moment from 'moment';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../../domain/commands/get-availability.query';

const GetAvailabilitySchema = z.object({
  placeId: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => moment(date, 'YYYY-MM-DD').isValid())
    .transform((date) => moment(date, 'YYYY-MM-DD').toDate()),
});

class GetAvailabilityDTO extends createZodDto(GetAvailabilitySchema) {}

@Controller('search')
export class SearchController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @UsePipes(ZodValidationPipe)
  searchAvailability(
    @Query() query: GetAvailabilityDTO,
  ): Promise<ClubWithAvailability[]> {
    return this.queryBus.execute(
      new GetAvailabilityQuery(query.placeId, query.date),
    );
  }
}
