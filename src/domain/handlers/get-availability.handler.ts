import { BadRequestException, CACHE_MANAGER, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Cache } from 'cache-manager';
import * as moment from 'moment';

import { CACHE_TTL } from '../../shared/constants/cache-ttl.constants';
import {
  _addDaysToDate,
  _getCurrentDate,
} from '../../shared/helpers/date.helper';
import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    // improve a date validator, cannot be less than current or more than 8 days from current
    await this._validateDate(query.date);

    let clubs_with_availability: ClubWithAvailability[] = [];
    const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);

    // Improve flow using paralelism instead a sequential flow & manage erros
    clubs_with_availability = await Promise.all(
      clubs.map(async (club) => {
        // Set club in cache to improve events flow for 2 hours
        if (this.cacheManager.get(`club:${club.id}`))
          this.cacheManager.set(`club:${club.id}`, club, CACHE_TTL.CLUBS);

        const courts = await this.alquilaTuCanchaClient.getCourts(club.id);

        const courts_with_availability = await Promise.all(
          courts.map(async (court) => {
            try {
              // Set court in cache to improve events flow for 2 hours
              if (this.cacheManager.get(`court:${court.id}`))
                this.cacheManager.set(
                  `court:${court.id}`,
                  court,
                  CACHE_TTL.COURTS,
                );

              const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
                club.id,
                court.id,
                query.date,
              );

              return { ...court, available: slots };
            } catch (error) {
              // Return a result even if there was an error
              return { ...court, available: [] };
            }
          }),
        );
        return { ...club, courts: courts_with_availability };
      }),
    );

    return clubs_with_availability;
  }

  private async _validateDate(date) {
    const currentDate = _getCurrentDate();
    const nextWeek = _addDaysToDate(new Date(), 7);

    if (moment(date).isBefore(currentDate) || moment(date).isAfter(nextWeek))
      throw new BadRequestException('Invalid Date');
  }
}
