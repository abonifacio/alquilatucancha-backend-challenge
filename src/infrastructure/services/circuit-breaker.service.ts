import { Injectable, Logger } from '@nestjs/common';

/**
 * Circuit Breaker para manejar fallos de la API mock
 * 
 * Estados:
 * - CLOSED: Funcionamiento normal
 * - OPEN: API fallando, usar cache
 * - HALF_OPEN: Probando si la API se recuperó
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  
  // Configuración del circuit breaker
  private readonly FAILURE_THRESHOLD = 5; // Fallos consecutivos para abrir
  private readonly TIMEOUT = 60000; // 1 minuto para intentar recuperación
  private readonly SUCCESS_THRESHOLD = 3; // Éxitos para cerrar

  /**
   * Ejecuta una operación con circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.logger.log('Circuit breaker entering HALF_OPEN state');
      } else {
        this.logger.warn('Circuit breaker is OPEN, using fallback');
        if (fallback) {
          return fallback();
        }
        throw new Error('Circuit breaker is OPEN and no fallback provided');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      this.logger.error(`Operation failed: ${error.message}`);
      
      if (fallback) {
        this.logger.log('Using fallback due to operation failure');
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Verifica si el circuit breaker está abierto
   */
  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  /**
   * Obtiene el estado actual del circuit breaker
   */
  getState(): string {
    return this.state;
  }

  /**
   * Obtiene métricas del circuit breaker
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      timeSinceLastFailure: Date.now() - this.lastFailureTime
    };
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.logger.log('Circuit breaker CLOSED after successful recovery');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.state = 'OPEN';
      this.logger.warn(`Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.TIMEOUT;
  }
}
