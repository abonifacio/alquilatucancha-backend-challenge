import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Cache } from 'cache-manager';

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

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]|any> {
    const keyClubCache= `${query.placeId}-${query.date}`
    const cacheData:ClubWithAvailability[]|undefined= await this.cacheManager.get(keyClubCache)
    if(cacheData?.length){
      console.log("cache")
      return cacheData
    }
    const clubs_with_availability: ClubWithAvailability[] = [];
    const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);
    // en este espacio se hacen varios llamados a la api y cuestan mucho tanto para el servicio como la db
    const newClub= await Promise.all(clubs.map(async club=>{
      const courts = await this.alquilaTuCanchaClient.getCourts(club.id);
      const availableCourts= await Promise.all(courts.map( async court=>{
        const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
          club.id,
          court.id,
          query.date,
          );
          return{
            ...court,
            available: slots,
          }
        }))
        return{
          ...club,
          courts:availableCourts
        }
      }))
      // for (const club of clubs) {
        //   const courts = await this.alquilaTuCanchaClient.getCourts(club.id);
        //   const courts_with_availability: ClubWithAvailability['courts'] = [];
    //   for (const court of courts) {
    //     const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
    //       club.id,
    //       court.id,
    //       query.date,
    //     );
    //     courts_with_availability.push({
    //       ...court,
    //       available: slots,
    //     });
    //   }
    //   clubs_with_availability.push({
    //     ...club,
    //     courts: courts_with_availability,
    //   });
    // }
    await this.cacheManager.set(keyClubCache,newClub,{ttl:100})
    
    return newClub;
  }
}
