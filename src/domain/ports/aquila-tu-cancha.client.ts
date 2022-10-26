import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import { Zone } from '../model/zone';

export const ALQUILA_TU_CANCHA_CLIENT = 'ALQUILA_TU_CANCHA_CLIENT';
export interface AlquilaTuCanchaClient {
  getZones(): Promise<Zone[]>;
  getClubs(placeId: string): Promise<Club[]>;
  getCourts(clubId: number): Promise<Court[]>;
  getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]>;
}
