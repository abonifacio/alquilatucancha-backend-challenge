import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { AvailabilityRepository } from '../../domain/ports/availability-repository';
import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';

@Injectable()
export class RedisAvailabilityRepository implements AvailabilityRepository {
    // 8 días de TTL en SEGUNDOS (versión 4)
    private readonly TTL = 8 * 24 * 60 * 60;

    // Aquí usamos el CACHE_MANAGER oficial
    constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache) { }

    async getClubs(placeId: string): Promise<Club[] | undefined> {
        return this.cacheManager.get<Club[]>(`clubs:${placeId}`);
    }

    async setClubs(placeId: string, clubs: Club[]): Promise<void> {
        await this.cacheManager.set(`clubs:${placeId}`, clubs, { ttl: this.TTL });
    }

    async getCourts(clubId: number): Promise<Court[] | undefined> {
        return this.cacheManager.get<Court[]>(`courts:${clubId}`);
    }

    async setCourts(clubId: number, courts: Court[]): Promise<void> {
        await this.cacheManager.set(`courts:${clubId}`, courts, { ttl: this.TTL });
    }

    async getSlots(clubId: number, courtId: number, date: string): Promise<Slot[] | undefined> {
        return this.cacheManager.get<Slot[]>(`slots:${clubId}:${courtId}:${date}`);
    }

    async setSlots(clubId: number, courtId: number, date: string, slots: Slot[]): Promise<void> {
        await this.cacheManager.set(`slots:${clubId}:${courtId}:${date}`, slots, { ttl: this.TTL });
    }

    async clearSlots(clubId: number, courtId: number, date: string): Promise<void> {
        await this.cacheManager.del(`slots:${clubId}:${courtId}:${date}`);
    }

    async clearAll(): Promise<void> {
        await this.cacheManager.reset();
    }
}
