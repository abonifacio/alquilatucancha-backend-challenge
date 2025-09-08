import { Injectable, Logger } from '@nestjs/common';

/**
 * Servicio de batching para evitar requests duplicados
 * Agrupa requests similares y los ejecuta en lotes
 */
@Injectable()
export class RequestBatcherService {
  private readonly logger = new Logger(RequestBatcherService.name);
  
  // Mapas para almacenar requests pendientes
  private pendingRequests = new Map<string, Promise<any>>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  
  // Configuración de batching
  private readonly BATCH_DELAY = 50; // 50ms para agrupar requests
  private readonly MAX_BATCH_SIZE = 10; // Máximo requests por lote

  /**
   * Ejecuta un request con batching automático
   */
  async executeBatched<T>(
    key: string,
    requestFn: () => Promise<T>,
    batchKey?: string
  ): Promise<T> {
    const batchId = batchKey || key;

    // Si ya hay un request pendiente para esta clave, reutilizar la promesa
    if (this.pendingRequests.has(key)) {
      this.logger.debug(`Reusing pending request for key: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Crear nueva promesa para el request
    const requestPromise = this.executeWithBatching(key, requestFn, batchId);
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Limpiar la promesa pendiente
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Ejecuta múltiples requests en paralelo con límite de concurrencia
   */
  async executeConcurrent<T>(
    requests: Array<() => Promise<T>>,
    maxConcurrency = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      const promise = request().then(result => {
        results[i] = result;
      });

      executing.push(promise);

      // Si alcanzamos el límite de concurrencia, esperar
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        // Remover promesas completadas
        for (let j = executing.length - 1; j >= 0; j--) {
          const promise = executing[j];
          if (promise) {
            try {
              await promise;
              executing.splice(j, 1);
            } catch (error) {
              executing.splice(j, 1);
            }
          }
        }
      }
    }

    // Esperar a que terminen todos los requests restantes
    await Promise.all(executing);
    return results;
  }

  /**
   * Limpia timers y requests pendientes
   */
  cleanup(): void {
    // Limpiar timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    
    // Limpiar requests pendientes
    this.pendingRequests.clear();
    
    this.logger.log('Request batcher cleaned up');
  }

  private async executeWithBatching<T>(
    key: string,
    requestFn: () => Promise<T>,
    batchId: string
  ): Promise<T> {
    // Si no hay timer para este batch, crear uno
    if (!this.batchTimers.has(batchId)) {
      const timer = setTimeout(() => {
        this.batchTimers.delete(batchId);
      }, this.BATCH_DELAY);
      
      this.batchTimers.set(batchId, timer);
    }

    // Ejecutar el request
    return requestFn();
  }
}
