import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';

export const CACHE_CLIENT = 'CACHE_CLIENT';
export interface CacheClient {
  getClubs(placeId: string): Promise<Club[] | undefined>;
  setClubs(placeId: string, clubs: Club[]): Promise<void>;
  resetCache(): Promise<void>;
  getCourts(clubId: number): Promise<Court[] | undefined>;
  setCourts(clubId: number, courts: Court[]): Promise<void>;
  getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[] | undefined>;
  setAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
    slots: Slot[],
  ): Promise<void>;
}
