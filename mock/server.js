/* eslint-disable @typescript-eslint/no-var-requires */
const fastify = require('fastify')({
  logger: true,
});
const axios = require('axios');
const { setTimeout } = require('timers/promises');
const data = require('./data');
const EVENT_INTERVAL_SECONDS =
  parseInt(process.env.EVENT_INTERVAL_SECONDS) || 10;
const REQUESTS_PER_MINUTE = parseInt(process.env.REQUESTS_PER_MINUTE) || 60;
const EVENT_PUBLISHER_URL =
  process.env.EVENT_PUBLISHER_URL || 'http://localhost:3000/events';

let request_count = 0;

fastify.addHook('onRequest', function (request, reply, done) {
  request_count++;
  if (request_count > REQUESTS_PER_MINUTE) {
    reply.code(429);
    done(new Error('Too many requests'));
    return;
  }
  console.log('Available requests:', REQUESTS_PER_MINUTE - request_count);
  setTimeout(60 * 1000).then(() => {
    console.log('Available requests:', REQUESTS_PER_MINUTE - request_count);
    request_count--;
  });
  done();
});

fastify.get('/zones', async () => {
  return data.getZones();
});

fastify.get(
  '/clubs',
  {
    schema: {
      query: {
        type: 'object',
        required: ['placeId'],
        properties: { placeId: { type: 'string' } },
      },
    },
  },
  async (request) => {
    const clubs = data.getClubs(request.query.placeId);
    await setTimeout(3000);
    return clubs.map(omit('courts'));
  },
);

fastify.get(
  '/clubs/:id',
  {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'number' } },
      },
    },
  },
  async (request, reply) => {
    const club = data.getClub(request.params.id);
    await setTimeout(300);
    if (!club) {
      return reply.code(404).send();
    }
    return omit('courts')(club);
  },
);

fastify.get(
  '/clubs/:clubId/courts',
  {
    schema: {
      params: {
        type: 'object',
        required: ['clubId'],
        properties: { clubId: { type: 'number' } },
      },
    },
  },
  async (request, reply) => {
    const courts = data.getCourts(request.params.clubId);
    await setTimeout(1000);
    if (!courts.length) {
      return reply.code(404).send();
    }
    return courts.map(omit('available'));
  },
);

fastify.get(
  '/clubs/:clubId/courts/:courtId',
  {
    schema: {
      params: {
        type: 'object',
        required: ['clubId', 'courtId'],
        properties: { clubId: { type: 'number' }, courtId: { type: 'number' } },
      },
    },
  },
  async (request, reply) => {
    const court = [];
    court.push(data.getCourt(request.params.clubId, request.params.courtId));
    if (!court.length) {
      return reply.code(404).send(); // Esto me daba siempre error porque nunca devuelve un array. Para no cambiarlo, agregue algo. No se si es correcto esto
    }
    return omit('available')(court[0]); // No se si esta bien hacer esto
  },
);

fastify.get(
  '/clubs/:clubId/courts/:courtId/slots',
  {
    query: {
      type: 'object',
      required: ['date'],
      properties: { date: { type: 'string', format: 'date' } },
    },
    schema: {
      params: {
        type: 'object',
        required: ['clubId', 'courtId'],
        properties: { clubId: { type: 'number' }, courtId: { type: 'number' } },
      },
    },
  },
  async (request, reply) => {
    const slots = data.getSlots(
      request.params.clubId,
      request.params.courtId,
      request.query.date,
    );
    await setTimeout(500);
    if (!slots.length) {
      return reply.code(404).send();
    }
    return slots;
  },
);

fastify.get(
  '/test',
  {
    schema: {
      query: {
        type: 'object',
        required: ['date', 'placeId'],
        properties: {
          date: {
            type: 'string',
            format: 'date',
          },
          placeId: {
            type: 'string',
          },
          clubId: {
            type: 'number',
          },
          courtId: {
            type: 'number',
          },
        },
      },
    },
  },
  async (request) => {
    const { placeId, date, clubId, courtId } = request.query;
    return data.search({ placeId, date, clubId, courtId });
  },
);

function updateRandomClub() {
  const club = data.getRandomClub();

  axios
    .post(EVENT_PUBLISHER_URL, {
      type: 'club_updated',
      fields: ['attributes', 'openhours', 'logo_url', 'background_url'].filter(
        () => Math.random() > 0.5,
      ),
      clubId: club.id,
    })
    .catch((err) => console.log('updateRandomClub', err.message));
}

function updateRandomCourt() {
  const { club, court } = data.getRandomCourt();

  axios
    .post(EVENT_PUBLISHER_URL, {
      type: 'court_updated',
      fields: ['attributes', 'name'].filter(() => Math.random() > 0.5),
      clubId: club.id,
      courtId: court.id,
    })
    .catch((err) => console.log('updateRandomCourt', err.message));
}

function bookOrCancelRandomSlot() {
  const { club, court, slot } = data.getRandomSlot();
  const event = {
    type: slot.booked ? 'booking_cancelled' : 'booking_created',
    clubId: club.id,
    courtId: court.id,
    slot,
  };
  if (slot.booked) {
    data.cancel(slot);
  } else {
    data.book(slot);
  }
  axios
    .post(EVENT_PUBLISHER_URL, event)
    .catch((err) => console.log('bookOrCancelRandomSlot', err.message));
}

function emitRandomEvent() {
  const random = Math.random();
  if (random < 0.6) {
    return bookOrCancelRandomSlot();
  }
  if (random < 0.9) {
    return updateRandomCourt();
  }
  return updateRandomClub();
}

/**
 * Run the server!
 */
const start = async () => {
  setInterval(emitRandomEvent, EVENT_INTERVAL_SECONDS * 1000);
  try {
    await fastify.listen({ port: process.env.PORT || 4000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();

function omit(key) {
  return (object) => ({ ...object, [key]: undefined });
}
