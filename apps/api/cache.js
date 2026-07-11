const cache = new Map();
const inflight = new Map();

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function getTtlMs() {
  const value = Number(process.env.SEARCH_CACHE_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TTL_MS;
}

function pruneExpiredEntries() {
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

async function getOrSet(cacheKey, loader, options = {}) {
  const ttlMs = options.ttlMs ?? getTtlMs();
  const now = Date.now();
  const cachedEntry = cache.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return {
      value: cachedEntry.value,
      cacheStatus: "HIT",
    };
  }

  if (inflight.has(cacheKey)) {
    return {
      value: await inflight.get(cacheKey),
      cacheStatus: "HIT",
    };
  }

  const pendingValue = Promise.resolve()
    .then(loader)
    .then((value) => {
      cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      inflight.delete(cacheKey);
      pruneExpiredEntries();
      return value;
    })
    .catch((error) => {
      inflight.delete(cacheKey);
      throw error;
    });

  inflight.set(cacheKey, pendingValue);

  return {
    value: await pendingValue,
    cacheStatus: "MISS",
  };
}

module.exports = {
  getOrSet,
};
