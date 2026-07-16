> **NOTA**: Todo el registro paso a paso de la resolución de este challenge (decisiones técnicas, arquitectura de caché, invalidación reactiva por webhooks y cobertura de tests) se encuentra detallado en el archivo [procesoChallenge.md](./procesoChallenge.md). ¡Muchas gracias por la oportunidad!

## Intro

Bienvenido/a al desafío técnico de ATC. Este proyecto simula un servicio de búsqueda de disponibilidad de canchas,
el cuál está tardando mucho y no tolera gran cantidad de solicitudes por minuto.

El objetivo de este desafío es optimizar el servicio para que responda lo más rápido posible, con información actualizada
y que soporte altos niveles de tráfico.

## El proyecto

El servicio de disponibilidad devuelve, a partir de un [Place Id](https://developers.google.com/maps/documentation/places/web-service/place-id) y fecha, todos los clubes de la zona, con sus respectivos atributos, canchas y disponibilidad. Ejemplos de respuestas se encuentran dentro de `mock/data/`.

El proyecto consta de dos partes

1. La API principal, sobre la que hay que trabajar y que está desarrollada en [NestJS](https://github.com/nestjs/nest) adaptada a una Arquitectura Hexagonal.
2. Una API mock, desarrollada en JS vanilla y que **no** debe ser modificada

La API mock es la fuente de verdad y a su vez nuestro cuello de botella. Los endpoints que expone son

- `GET /zones`: Lista todas las zones donde tenemos clubes
- `GET /clubs?placeId`: Lista los clubes por zona
- `GET /clubs/:id`: Detalla un club
- `GET /clubs/:id/courts`: Lista las canchas de un club
- `GET /clubs/:id/courts/:id`: Detalla una cancha de un club
- `GET /clubs/:id/courts/:id/slots?date`: Lista la disponibilidad una cancha para una fecha en particular

> Estos endpoints tienen un latencia alta y la API en general tiene un límite de 60 solicitudes por minuto.

A su vez, la API mock tiene la capacidad de avisar a la API principal cada vez que ocurren modificaciones. Los eventos posibles son los siguientes

- Se ocupa un lugar (`booking_created`)
- Se libera un lugar (`booking_cancelled`)
- Se actualiza un club (`club_updated`)
- Se actualiza una cancha (`court_updated`)

En algunos casos, estos eventos modifican la disponibilidad de la cancha.
Por ejemplo, cuando se ocupa un lugar en la cancha 140 el 25 de Agosto a las 10:30, la disponibilidad para esa fecha debe ser actualizada.
Lo mismo ocurre cuando se libera un lugar.

En otros casos, los eventos no modifican las disponibilidad de la cancha, pero sí la información estática. Por ejemplo, si se cambia el nombre
de la cancha 140, el servicio debe reflejar el nuevo nombre

**Atención**: cuando se actualiza un club, dependiendo de los atributos a actualizar, puede que modifique o no la disponibilidad. Hay un atributo
especial llamado `open_hours` que refleja el horario de apertura y cierre de los complejos según el día de la semana, si este cambia, puede afectar la disponibilidad. El resto de los atributos no modifican la disponibilidad

> Un evento al azar ocurre cada 10 segundos. Durante el desarrollo se puede modificar el intervalo a gusto a través de la variable
> de entorno `EVENT_INTERVAL_SECONDS`, pero la solución debe funcionar independientemente del valor

## Resolviendo el challenge

### Correr el proyecto

Clonar el repositorio e instalar las dependencias con

```bash
$ yarn
```

El proyecto se puede levantar con `docker-compose` o desde el host como lo indica la documentación de [NestJS](https://docs.nestjs.com/).
Nota: Si se corre desde el host también hay que correr en paralelo la API mock.

La versión de node utilizada se encuentra definida en el `package.json` y en `.nvmrc` en caso de que uses `nvm`.

### Modificar

Los puntos de entrada y salida de la API ya están desarrollados, aunque se espera que se le hagan modificaciones

1. `AlquilaTuCanchaClient`: donde se hace la comunicación desde la API principal a la API mock
2. `EventsController`: donde se reciben los eventos desde la API mock
3. `SearchController`: donde se inicia la consulta de disponibilidad (la lógica se encuentra en `GetAvailabilityHandler`)

Requests de ejemplo

```bash
curl "localhost:3000/search?placeId=ChIJW9fXNZNTtpURV6VYAumGQOw&date=2022-08-25"
curl "localhost:3000/search?placeId=ChIJW9fXNZNTtpURV6VYAumGQOw&date=2022-08-25"
```

### Entregar

El método de entrega es a través de un pull request a este repositorio.

1. [Hacer un fork](https://help.github.com/articles/fork-a-repo/) de este repositorio
2. [Crear un pull request](https://help.github.com/articles/creating-a-pull-request-from-a-fork/)
3. En la descripción del pull request se aprecia documentar decisiones, investigaciones, supociones o iteraciones futuras

Las consultas se pueden hacer por privado o creando un issue en este repositorio

Qué vamos a evaluar? La idea es que este desafío se asemeje lo máximo posible a una tarea del día a día, por eso proveemos un proyecto con una aplicación ya configurada y lista para modificar. Esto significa que

- Se espera que se agreguen tests que comprueben el correcto funcionamiento de lo desarrollado
- Se espera que se entienda y se respete la arquitectura de la aplicación
- Si se decide investigar técnicas y/o patrones para resolver este problema, está perfecto y nos gustaría saber los links consultados
- Son bienvenidas las consultas, como en cualquier equipo resolvemos las cosas juntos
- En caso de falta de tiempo o no se sepa como resolver alguna cuestión en particular, se valora la priorización para atacar lo más importante y documentar lo que faltaría y como lo resolverían

## Reglas y tips

- No se puede modificar la API mock para resolver el desafío
- Asumir que sólo se recibirán consultas para fechas dentro de los próximos 7 días
- Asumir que la API mock puede estar caída en todo momento
- Es preferible devolver resultados desactualizados que no devolver nada
- Se puede modificar el `docker-compose.yml` para agregar cualquier dependencia que se necesite
- No hace falta implementar lógica de disponibilidad al reaccionar a los eventos, siempre se puede consultar la disponibilidad actualizada a la API mock por cancha y fecha
- A modo de comprobación hay un endpoint en la API mock (`/test?placeId&date`) que devuelve la disponibilidad como debería ser devuelta por la API principal
- No se puede usar el endpoint de test de la API mock para resolver el desafío
