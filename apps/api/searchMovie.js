const {
  GRAPHQL_SEARCH_QUERY,
  queryGraphQL,
  queryPopularTitlesByCountries,
} = require("./graphql");
const { COUNTRIES, COUNTRY_NAMES, GENRE_MAP } = require("./constants");
const { getOrSet } = require("./cache");
const { limitConcurrentRequests } = require("./utils");

const searchMovieInCountry = async (title, country) => {
  const variables = {
    searchTitlesFilter: { searchQuery: title },
    country: country,
    language: "en",
    first: 1,
    formatPoster: "JPG",
    profile: "S718",
    filter: { bestOnly: false },
  };
  const data = await queryGraphQL(GRAPHQL_SEARCH_QUERY, variables);
  return data.popularTitles.edges;
};

const DEFAULT_BATCH_SIZE = 8;
const DEFAULT_BATCH_CONCURRENCY = 3;
const DEFAULT_FALLBACK_CONCURRENCY = 2;

const getBatchSize = () => {
  const value = Number(process.env.SEARCH_BATCH_SIZE);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BATCH_SIZE;
};

const getBatchConcurrency = () => {
  const value = Number(process.env.SEARCH_BATCH_CONCURRENCY);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BATCH_CONCURRENCY;
};

const getFallbackConcurrency = () => {
  const value = Number(process.env.SEARCH_FALLBACK_CONCURRENCY);
  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_FALLBACK_CONCURRENCY;
};

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const normalizeTitle = (title) => title.trim().toLowerCase();

const loadCountrySearchResults = async (title) => {
  const countryBatches = chunk(COUNTRIES, getBatchSize());
  const tasks = countryBatches.map((countryBatch) => async () => {
    try {
      return await queryPopularTitlesByCountries(title, countryBatch);
    } catch (error) {
      console.warn(
        `Batched search failed for countries ${countryBatch.join(",")}, falling back to single-country requests.`,
        error.message
      );

      const fallbackTasks = countryBatch.map((country) => async () => ({
        country,
        edges: await searchMovieInCountry(title, country),
      }));

      return limitConcurrentRequests(
        fallbackTasks,
        getFallbackConcurrency()
      );
    }
  });

  const batchResults = await limitConcurrentRequests(tasks, getBatchConcurrency());
  return batchResults.flat();
};

const buildSearchResponse = (countryResults, selectedProviders) => {
  const providerSet = new Set(selectedProviders);
  const foundResults = [];
  const notFoundCountries = [];

  countryResults.forEach(({ country, edges }) => {
    if (!edges || edges.length === 0) {
      notFoundCountries.push(COUNTRY_NAMES[country]);
      return;
    }

    const movie = edges[0].node;
    const offers = (movie.offers || []).filter(
      (offer) => providerSet.size === 0 || providerSet.has(offer.package.clearName)
    );

    if (offers.length === 0) {
      notFoundCountries.push(COUNTRY_NAMES[country]);
      return;
    }

    const result = {
      country: COUNTRY_NAMES[country],
      countryCode: country,
      foundTitle: movie.content.title,
      year: movie.content.originalReleaseYear,
      shortDescription: movie.content.shortDescription,
      genres: movie.content.genres.map(
        (genre) => GENRE_MAP[genre.shortName] || genre.shortName
      ),
      runtime: movie.content.runtime,
      posterUrl: movie.content.posterUrl,
      offers: [],
    };

    const uniqueOffers = new Map();
    offers.forEach((offer) => {
      if (!uniqueOffers.has(offer.standardWebURL)) {
        uniqueOffers.set(offer.standardWebURL, offer.package.clearName);
      }
    });

    uniqueOffers.forEach((provider, url) => {
      result.offers.push({ provider, url });
    });

    foundResults.push(result);
  });

  return {
    foundResults,
    notFoundCountries,
  };
};

exports.searchMovie = async (event) => {
  const title = event.queryStringParameters?.title;
  const providersParam = event.queryStringParameters?.providers;

  if (!title) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required query parameter: title" }),
    };
  }

  const userProviders = providersParam ? providersParam.split(',') : [];
  const { value: countryResults, cacheStatus } = await getOrSet(
    `search:${normalizeTitle(title)}`,
    () => loadCountrySearchResults(title)
  );
  const { foundResults, notFoundCountries } = buildSearchResponse(
    countryResults,
    userProviders
  );

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "X-Search-Cache": cacheStatus,
  };

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify({
      found: foundResults,
      notFoundIn: notFoundCountries,
      not_found: notFoundCountries,
    }),
  };
};
