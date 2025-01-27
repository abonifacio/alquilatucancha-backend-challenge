export const CACHE_SERVICE = 'CACHE_SERVICE';

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  deleteByPattern(pattern: string): Promise<void>;
}
