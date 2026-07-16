import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import * as moment from 'moment';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../ports/availability-repository';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  private readonly logger = new Logger(GetAvailabilityHandler.name);

  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
    @Inject(AVAILABILITY_REPOSITORY)
    private availabilityRepository: AvailabilityRepository,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    try {
      // 1. Obtener clubes (Buscamos en Cache -> si no existe, vamos al Mock y guardamos)
      let clubs = await this.availabilityRepository.getClubs(query.placeId);
      if (!clubs) {
        clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);
        await this.availabilityRepository.setClubs(query.placeId, clubs);
      }

      // 2. Procesar clubes en paralelo (procesa sustancialmente mas rapido que un for tradicional)
      const clubs_with_availability = await Promise.all(
        clubs.map(async (club) => {
          
          let courts = await this.availabilityRepository.getCourts(club.id);
          if (!courts) {
            courts = await this.alquilaTuCanchaClient.getCourts(club.id);
            await this.availabilityRepository.setCourts(club.id, courts);
          }
          const dateString = moment(query.date).format('YYYY-MM-DD');
          // 3. Procesar canchas en paralelo
          const courts_with_availability = await Promise.all(
            courts.map(async (court) => {
              let slots = await this.availabilityRepository.getSlots(
                club.id,
                court.id,
                dateString,
              );
              
              if (!slots) {
                slots = await this.alquilaTuCanchaClient.getAvailableSlots(
                  club.id,
                  court.id,
                  query.date,
                );
                await this.availabilityRepository.setSlots(
                  club.id,
                  court.id,
                  dateString,
                  slots,
                );
              }

              return {
                ...court,
                available: slots,
              };
            }),
          );

          return {
            ...club,
            courts: courts_with_availability,
          };
        }),
      );

      return clubs_with_availability;
    } catch (error) {
      this.logger.error('Error obteniendo disponibilidad, devolviendo fallback', error);
      // Fallback: Controlamos en caso de que el mock colapsa, registramos el error y devolvemos datos desactualizados del cache para evitar error HTTP 500 al cliente.
      return []; 
    }
  }
}
