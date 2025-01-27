import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { generateCacheKey } from '../helpers/cache-key.helper';
import { CACHE_TTL } from '../constants/cache-ttl.constants';
import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import { ClubWithAvailability, CourtWithAvailability, GetAvailabilityQuery } from '../commands/get-availability.query';
import { CACHE_SERVICE, CacheService } from '../ports/cache.service';
import { ALQUILA_TU_CANCHA_CLIENT, AlquilaTuCanchaClient } from '../ports/alquila-tu-cancha.client';
import { validateDate } from '../helpers/date.helper';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  private readonly EXPIRATION_DAYS = 7;

  constructor(
    @Inject(CACHE_SERVICE) private readonly cacheService: CacheService,
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private readonly alquilaTuCanchaClient: AlquilaTuCanchaClient,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    validateDate(query.date, { expirationDays: this.EXPIRATION_DAYS });

    const clubs = await this.getClubs(query.placeId);

    const clubsWithAvailability = await Promise.all(
      clubs.map((club) => this.getClubWithAvailability(club, query.date))
    );

    return clubsWithAvailability;
  }

  private async getClubs(placeId: string): Promise<Club[]> {
    const clubsIdsKey = generateCacheKey.clubsIds(placeId);
    let clubIds = await this.cacheService.get<number[]>(clubsIdsKey);

    if (!clubIds) {
      const clubs = await this.alquilaTuCanchaClient.getClubs(placeId);
      
      clubIds = clubs.map(club => club.id);
      await this.cacheService.set(clubsIdsKey, clubIds, CACHE_TTL.CLUBS);

      await Promise.all(
        clubs.map(club => {
          const clubKey = generateCacheKey.club(club.id);
          return this.cacheService.set(clubKey, club, CACHE_TTL.CLUBS);
        })
      );
    }

    const clubs = await Promise.all(
      clubIds.map(async (clubId) => {
        const clubKey = generateCacheKey.club(clubId);
        let cachedClub = await this.cacheService.get<Club>(clubKey);

        if (cachedClub) {
          return cachedClub;
        }

        const clubs = await this.alquilaTuCanchaClient.getClubs(placeId);
        const newClub = clubs.find(c => c.id === clubId);
        
        if (newClub) {
          await this.cacheService.set(clubKey, newClub, CACHE_TTL.CLUBS);
          return newClub;
        }

        return null;
      })
    );

    return clubs.filter((club): club is Club => club !== null);
  }

  private async getClubWithAvailability(
    club: Club,
    date: Date,
  ): Promise<ClubWithAvailability> {
    const courts = await this.getCourts(club.id);

    const courtsWithAvailability = await Promise.all(
      courts.map((court) => this.getCourtWithAvailability(club.id, court, date))
    );

    return {
      ...club,
      courts: courtsWithAvailability,
    };
  }

  private async getCourts(clubId: number): Promise<Court[]> {
    const cacheKey = generateCacheKey.courts(clubId);
    const cachedCourts = await this.cacheService.get<Court[]>(cacheKey);

    if (cachedCourts) {
      return cachedCourts;
    }

    const courts = await this.alquilaTuCanchaClient.getCourts(clubId);
    await this.cacheService.set(cacheKey, courts, CACHE_TTL.COURTS);

    return courts;
  }

  private async getCourtWithAvailability(
    clubId: number,
    court: Court,
    date: Date,
  ): Promise<CourtWithAvailability> {
    const slots = await this.getSlots(clubId, court.id, date);

    return {
      ...court,
      available: slots,
    };
  }

  private async getSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const cacheKey = generateCacheKey.slots(clubId, courtId, date);
    const cachedSlots = await this.cacheService.get<Slot[]>(cacheKey);

    if (cachedSlots) {
      return cachedSlots;
    }

    const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
      clubId,
      courtId,
      date,
    );
    await this.cacheService.set(cacheKey, slots, CACHE_TTL.SLOTS);

    return slots;
  }
}
