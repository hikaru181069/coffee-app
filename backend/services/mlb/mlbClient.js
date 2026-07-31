const cache = require("../cacheService");

const MLB_CACHE_TTL = 60 * 60; // 1時間

const fetchMlbResponse = async (url) => {
  return fetch(url);
};

const fetchFromMlbApi = async (
  url,
  errorMessage = "Failed to fetch MLB Stats API",
) => {
  const cached = await cache.get(url);
  if (cached) return cached;

  const response = await fetchMlbResponse(url);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const data = await response.json();
  await cache.set(url, data, MLB_CACHE_TTL);
  return data;
};

const safelyFetchFromMlbApi = async ({
  url,
  notOkValue = {},
  catchValue = [],
  logMessage = "MLB API fetch error",
}) => {
  const cached = await cache.get(url);
  if (cached) return cached;

  try {
    const response = await fetchMlbResponse(url);

    if (!response.ok) {
      return notOkValue;
    }

    const data = await response.json();
    await cache.set(url, data, MLB_CACHE_TTL);
    return data;
  } catch (error) {
    console.error(`${logMessage}:`, error.message);
    return catchValue;
  }
};

module.exports = {
  fetchFromMlbApi,
  fetchMlbResponse,
  safelyFetchFromMlbApi,
};
