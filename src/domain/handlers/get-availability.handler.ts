import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Cache } from 'cache-manager';
import { Get_Club_With_Availability } from 'src/infrastructure/constants';
import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@Injectable()
@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]| undefined> {
    const cacheData:ClubWithAvailability[]|undefined= await this.cacheManager.get(Get_Club_With_Availability)
    if(cacheData){
      return cacheData
    }
    const clubs_with_availability: ClubWithAvailability[] = [];
    const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);
    for (const club of clubs) {
      const courts = await this.alquilaTuCanchaClient.getCourts(club.id);
      const courts_with_availability: ClubWithAvailability['courts'] = [];
      for (const court of courts) {
        const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
          club.id,
          court.id,
          query.date,
        );
        courts_with_availability.push({
          ...court,
          available: slots,
        });
      }
      clubs_with_availability.push({
        ...club,
        courts: courts_with_availability,
      });
    }
    await this.cacheManager.set(Get_Club_With_Availability,clubs_with_availability,{ttl:100})
    
    return clubs_with_availability;
  }
}
