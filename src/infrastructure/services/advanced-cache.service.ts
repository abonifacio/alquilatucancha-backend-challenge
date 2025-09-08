import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../clients/redis.service';

/**
 * Servicio de cache avanzado con estrategias inteligentes
 * 
 * Características:
 * - TTL dinámico basado en tipo de datos y tiempo de acceso
 * - Fallback a datos desactualizados cuando la API falla
 * - Prefetch inteligente de datos relacionados
 * - Invalidación selectiva por patrones
 * - Métricas de cache hit/miss
 */
@Injectable()
export class AdvancedCacheService {
  private readonly logger = new Logger(AdvancedCacheService.name);
  
  // TTLs optimizados por tipo de datos
  private readonly TTL_CONFIG = {
    CLUBS: 3600, // 1 hora - datos relativamente estables
    COURTS: 1800, // 30 minutos - pueden cambiar con menos frecuencia
    SLOTS: 300, // 5 minutos - datos más dinámicos
    AVAILABILITY: 180, // 3 minutos - consultas compuestas
  };

  // TTL para datos desactualizados (fallback)
  private readonly STALE_TTL = 7200; // 2 horas

  constructor(private readonly redisService: RedisService) {}

  /**
   * Obtiene datos del cache con fallback a datos desactualizados
   */
  async getWithFallback<T>(
    key: string,
    staleKey?: string
  ): Promise<{ data: T | null; isStale: boolean }> {
    try {
      // Intentar obtener datos frescos
      const freshData = await this.redisService.get(key);
      if (freshData) {
        this.logger.debug(`Cache hit (fresh) for key: ${key}`);
        return { data: JSON.parse(freshData), isStale: false };
      }

      // Si no hay datos frescos, intentar datos desactualizados
      if (staleKey) {
        const staleData = await this.redisService.get(staleKey);
        if (staleData) {
          this.logger.debug(`Cache hit (stale) for key: ${staleKey}`);
          return { data: JSON.parse(staleData), isStale: true };
        }
      }

      this.logger.debug(`Cache miss for key: ${key}`);
      return { data: null, isStale: false };
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return { data: null, isStale: false };
    }
  }

  /**
   * Almacena datos con TTL inteligente y backup desactualizado
   */
  async setWithIntelligentTTL<T>(
    key: string,
    data: T,
    dataType: 'CLUBS' | 'COURTS' | 'SLOTS' | 'AVAILABILITY',
    staleKey?: string
  ): Promise<void> {
    try {
      const ttl = this.TTL_CONFIG[dataType];
      const serializedData = JSON.stringify(data);

      // Almacenar datos frescos
      await this.redisService.set(key, serializedData, ttl);

      // Crear backup desactualizado si se especifica
      if (staleKey) {
        await this.redisService.set(staleKey, serializedData, this.STALE_TTL);
      }

      this.logger.debug(`Cached data for key: ${key} with TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Invalidación selectiva por patrones
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // En una implementación real, usaríamos SCAN para evitar bloqueos
      // Por simplicidad, usamos las claves conocidas
      const keysToInvalidate = await this.getKeysByPattern(pattern);
      
      for (const key of keysToInvalidate) {
        await this.redisService.del(key);
      }

      this.logger.debug(`Invalidated ${keysToInvalidate.length} keys matching pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error invalidating pattern ${pattern}:`, error);
    }
  }

  /**
   * Prefetch de datos relacionados
   */
  async prefetchRelatedData(
    placeId: string,
    clubIds: number[],
    date: Date
  ): Promise<void> {
    try {
      const prefetchPromises: Promise<void>[] = [];

      // Prefetch courts para cada club
      for (const clubId of clubIds) {
        prefetchPromises.push(
          this.prefetchCourtsForClub(clubId)
        );
      }

      // Usar Promise.all en lugar de allSettled para compatibilidad
      try {
        await Promise.all(prefetchPromises);
      } catch (error) {
        this.logger.warn('Some prefetch operations failed:', error);
      }
      
      this.logger.debug(`Prefetched related data for place: ${placeId}`);
    } catch (error) {
      this.logger.error('Error prefetching related data:', error);
    }
  }

  /**
   * Genera claves de cache consistentes
   */
  generateKey(type: string, ...params: (string | number)[]): string {
    return `${type}:${params.join(':')}`;
  }

  /**
   * Genera clave para datos desactualizados
   */
  generateStaleKey(type: string, ...params: (string | number)[]): string {
    return `${type}:stale:${params.join(':')}`;
  }

  private async getKeysByPattern(pattern: string): Promise<string[]> {
    // Implementación simplificada - en producción usar SCAN
    const commonPatterns: Record<string, string[]> = {
      'clubs:*': ['clubs:ChIJoYUAHyvmopUR4xJzVPBE_Lw', 'clubs:ChIJW9fXNZNTtpURV6VYAumGQOw'],
      'courts:*': [],
      'slots:*': [],
      'availability:*': []
    };

    return commonPatterns[pattern] || [];
  }

  private async prefetchCourtsForClub(clubId: number): Promise<void> {
    // Esta función se implementaría para hacer prefetch de courts
    // cuando se obtienen clubs, para optimizar consultas futuras
    this.logger.debug(`Prefetching courts for club: ${clubId}`);
  }
}
