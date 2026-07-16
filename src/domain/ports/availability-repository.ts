import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';

export const AVAILABILITY_REPOSITORY = 'AVAILABILITY_REPOSITORY';

export interface AvailabilityRepository {
    getClubs(placeId: string): Promise<Club[] | undefined>;
    setClubs(placeId: string, clubs: Club[]): Promise<void>;

    getCourts(clubId: number): Promise<Court[] | undefined>;
    setCourts(clubId: number, courts: Court[]): Promise<void>;

    getSlots(clubId: number, courtId: number, date: string): Promise<Slot[] | undefined>;
    setSlots(clubId: number, courtId: number, date: string, slots: Slot[]): Promise<void>;

    clearSlots(clubId: number, courtId: number, date: string): Promise<void>;
    clearAll(): Promise<void>;
}
