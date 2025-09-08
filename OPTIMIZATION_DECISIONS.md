# Decisiones Técnicas - Optimización AlquilaTuCancha

## Resumen de Optimizaciones Implementadas

Este documento describe las decisiones técnicas tomadas para optimizar el servicio de búsqueda de disponibilidad de canchas, cumpliendo con los requisitos de:

- Respuesta más rápida
- Tolerancia a alto tráfico
- Datos actualizados cuando sea posible
- Manejo de eventos
- Preferencia por datos cacheados antes que no devolver nada
- Tolerancia a fallos de la API mock

## 1. Estrategia de Caching Avanzado

### Decisiones:

- **TTL Dinámico**: Diferentes TTLs según el tipo de datos:

  - Clubs: 1 hora (datos relativamente estables)
  - Courts: 30 minutos (cambian con menos frecuencia)
  - Slots: 5 minutos (datos más dinámicos)
  - Availability: 3 minutos (consultas compuestas)

- **Fallback a Datos Desactualizados**:

  - TTL de 2 horas para datos "stale"
  - Preferencia por devolver datos desactualizados antes que fallar

- **Invalidación Selectiva**:
  - Solo se invalida el cache afectado por eventos específicos
  - Patrones de invalidación optimizados

### Supuestos:

- Los datos de clubs cambian menos frecuentemente que slots
- Es mejor devolver datos desactualizados que no devolver nada
- La invalidación selectiva es más eficiente que limpiar todo el cache

## 2. Circuit Breaker para Tolerancia a Fallos

### Decisiones:

- **Umbral de Fallos**: 5 fallos consecutivos para abrir el circuit
- **Timeout de Recuperación**: 1 minuto antes de intentar recuperación
- **Estado Half-Open**: 3 éxitos para cerrar el circuit

### Supuestos:

- La API mock puede fallar temporalmente
- Es mejor usar cache que fallar completamente
- La recuperación automática es preferible al reinicio manual

## 3. Batching de Requests

### Decisiones:

- **Delay de Batching**: 50ms para agrupar requests similares
- **Concurrencia Limitada**: Máximo 5-10 requests concurrentes
- **Reutilización de Promesas**: Evitar requests duplicados

### Supuestos:

- Los requests duplicados son comunes en alto tráfico
- La latencia de 50ms es aceptable para el batching
- Limitar concurrencia previene sobrecarga de la API mock

## 4. Rate Limiting

### Decisiones:

- **Límite**: 60 requests por minuto (respetando límite de API mock)
- **Window**: 1 minuto deslizante
- **Estrategia**: Esperar hasta el siguiente window si se alcanza el límite

### Supuestos:

- La API mock tiene límite estricto de 60 requests/minuto
- Es mejor esperar que fallar por rate limiting
- El window deslizante es más eficiente que ventanas fijas

## 5. Prefetch Inteligente

### Decisiones:

- **Prefetch de Courts**: Cuando se obtienen clubs
- **Prefetch de Slots**: Para combinaciones club-court frecuentes
- **Background Processing**: Prefetch no bloquea la respuesta principal

### Supuestos:

- Los usuarios frecuentemente consultan courts después de clubs
- El prefetch en background mejora la experiencia sin afectar latencia
- Es mejor precargar datos que esperar a que se soliciten

## 6. Manejo de Eventos Optimizado

### Decisiones:

- **Invalidación Selectiva**: Solo invalida cache afectado
- **Procesamiento Asíncrono**: Eventos no bloquean la respuesta
- **Fallback Graceful**: Errores en eventos no afectan el sistema principal

### Supuestos:

- Los eventos son críticos para mantener datos actualizados
- Es mejor procesar eventos de forma asíncrona
- Los errores en eventos no deben afectar la disponibilidad del servicio

## 7. Métricas y Monitoreo

### Decisiones:

- **Métricas de Cache**: Hit rate, miss rate, errores
- **Métricas de Circuit Breaker**: Estado, fallos, tiempo de recuperación
- **Métricas de Eventos**: Procesados, errores, tasa de éxito
- **Health Checks**: Estado general del sistema

### Supuestos:

- El monitoreo es esencial para operación en producción
- Las métricas deben ser accesibles vía API
- Los health checks deben ser simples y rápidos

## 8. Arquitectura Hexagonal

### Decisiones:

- **Separación de Responsabilidades**: Domain, Infrastructure, Application
- **Inyección de Dependencias**: Fácil testing y mantenimiento
- **Interfaces**: Contratos claros entre capas

### Supuestos:

- La arquitectura hexagonal facilita testing y mantenimiento
- La separación de responsabilidades mejora la escalabilidad
- Las interfaces permiten cambios de implementación sin afectar el dominio

## 9. Manejo de Errores

### Decisiones:

- **Graceful Degradation**: Siempre devolver algo, aunque sea datos desactualizados
- **Logging Detallado**: Para debugging y monitoreo
- **Circuit Breaker**: Prevenir cascadas de fallos

### Supuestos:

- Es mejor devolver datos desactualizados que no devolver nada
- El logging detallado es esencial para debugging
- Los circuit breakers previenen cascadas de fallos

## 10. Testing

### Decisiones:

- **Tests Unitarios**: Para servicios críticos
- **Mocks**: Para dependencias externas
- **Cobertura**: Enfocada en lógica de negocio crítica

### Supuestos:

- Los tests unitarios son esenciales para confiabilidad
- Los mocks permiten testing aislado
- La cobertura debe enfocarse en código crítico

## Consideraciones de Producción

### Escalabilidad:

- Redis puede ser clusterizado para mayor capacidad
- Los servicios pueden ser desplegados independientemente
- El circuit breaker puede ser configurado por ambiente

### Seguridad:

- Las métricas no exponen información sensible
- Los logs no incluyen datos personales
- Las conexiones Redis pueden ser encriptadas

### Mantenimiento:

- Las configuraciones son externalizables vía variables de entorno
- Los servicios son independientes y pueden ser actualizados por separado
- Las métricas facilitan el debugging y optimización
