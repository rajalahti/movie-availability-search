const axios = require("axios");

const GRAPHQL_URL = "https://apis.justwatch.com/graphql";
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const readNonNegativeInteger = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
};

const readPositiveInteger = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const buildTitleSelection = (countryVariable) => `
  content(country: ${countryVariable}, language: $language) {
    title
    originalReleaseYear
    runtime
    shortDescription
    genres {
      shortName
    }
    posterUrl(profile: $profile, format: $formatPoster)
  }
  offers(country: ${countryVariable}, platform: WEB, filter: $filter) {
    package {
      clearName
    }
    standardWebURL
  }
`;

const GRAPHQL_SEARCH_QUERY = `
query GetSearchTitles(
  $searchTitlesFilter: TitleFilter!
  $country: Country!
  $language: Language!
  $first: Int!
  $formatPoster: ImageFormat
  $profile: PosterProfile
  $filter: OfferFilter!
) {
  popularTitles(
    country: $country
    filter: $searchTitlesFilter
    first: $first
    sortBy: POPULAR
    sortRandomSeed: 0
  ) {
    edges {
      node {
        ${buildTitleSelection("$country")}
      }
    }
  }
}
`;

const isRetryableError = (error) => {
  if (error.retryable === false) {
    return false;
  }

  const status = error.response?.status;
  return !status || RETRYABLE_STATUS_CODES.has(status);
};

const queryGraphQL = async (query, variables) => {
  const timeout = readPositiveInteger("JUSTWATCH_TIMEOUT_MS", 8000);
  const maxRetries = readNonNegativeInteger("JUSTWATCH_MAX_RETRIES", 2);
  const retryBaseMs = readPositiveInteger("JUSTWATCH_RETRY_BASE_MS", 250);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await axios.post(
        GRAPHQL_URL,
        { query, variables },
        { timeout }
      );

      if (response.data.errors) {
        const error = new Error("JustWatch GraphQL query failed");
        error.retryable = false;
        error.graphqlErrors = response.data.errors;
        throw error;
      }

      return response.data.data;
    } catch (error) {
      const shouldRetry = attempt < maxRetries && isRetryableError(error);

      if (!shouldRetry) {
        console.error("JustWatch request failed", {
          message: error.message,
          status: error.response?.status,
          attempts: attempt + 1,
        });
        throw error;
      }

      const delay = retryBaseMs * 2 ** attempt;
      console.warn("Retrying JustWatch request", {
        attempt: attempt + 1,
        delay,
        status: error.response?.status,
      });
      await sleep(delay);
    }
  }

  throw new Error("JustWatch request failed unexpectedly");
};

const buildBatchedSearchQuery = (countries) => {
  const countryVariables = countries
    .map((_, index) => `$country_${index}: Country!`)
    .join("\n  ");

  const countryQueries = countries
    .map(
      (_, index) => `
  country_${index}: popularTitles(
    country: $country_${index}
    filter: $searchTitlesFilter
    first: $first
    sortBy: POPULAR
    sortRandomSeed: 0
  ) {
    edges {
      node {
        ${buildTitleSelection(`$country_${index}`)}
      }
    }
  }`
    )
    .join("\n");

  return `
query GetSearchTitlesBatch(
  $searchTitlesFilter: TitleFilter!
  $language: Language!
  $first: Int!
  $formatPoster: ImageFormat
  $profile: PosterProfile
  $filter: OfferFilter!
  ${countryVariables}
) {
${countryQueries}
}
`;
};

const buildSearchVariables = (title) => ({
  searchTitlesFilter: { searchQuery: title },
  language: "en",
  first: 1,
  formatPoster: "JPG",
  profile: "S718",
  filter: { bestOnly: false },
});

const queryPopularTitlesByCountries = async (title, countries) => {
  const query = buildBatchedSearchQuery(countries);
  const variables = buildSearchVariables(title);

  countries.forEach((country, index) => {
    variables[`country_${index}`] = country;
  });

  const data = await queryGraphQL(query, variables);

  return countries.map((country, index) => ({
    country,
    edges: data[`country_${index}`]?.edges || [],
  }));
};

module.exports = {
  GRAPHQL_SEARCH_QUERY,
  queryGraphQL,
  queryPopularTitlesByCountries,
};
