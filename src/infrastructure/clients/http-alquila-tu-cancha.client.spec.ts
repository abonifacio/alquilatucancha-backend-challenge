import * as redis from 'redis';

// redis.js
const redisClient = redis.createClient();
redisClient.connect().catch(console.error);

describe('AlquilaTuCanchaClient test', () => {
  it('redis set test', async () => {
    const key = 'test';
    const value = 'test';
    const redisCall = await redisClient.set(key, value);
    // assert the last one
    expect(redisCall).toBe('OK');
  });
  it('redis get test', async () => {
    const key = 'test';
    const redisCall = await redisClient.get(key);
    // assert the last one
    expect(redisCall).toBe('test');
  });
});
