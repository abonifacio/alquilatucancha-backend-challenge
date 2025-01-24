import { Cache } from 'cache-manager';

export async function _deleteCacheByPattern(
  pattern: string,
  cacheManager: Cache,
) {
  const keys = await cacheManager.store.keys(pattern);
  if (keys) {
    for (const key of keys) {
      await cacheManager.del(key);
    }
  }
}
