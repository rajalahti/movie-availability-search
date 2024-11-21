const axios = require("axios");
const { GRAPHQL_SEARCH_QUERY, queryGraphQL } = require("./graphql");
const { COUNTRIES, COUNTRY_NAMES, PROVIDERS, GENRE_MAP } = require("./constants");
const { filterProviders, limitConcurrentRequests } = require("./utils");

const searchMovieInCountry = async (title, country) => {
  const variables = {
    searchTitlesFilter: { searchQuery: title },
    country: country,
    language: "en",
    first: 1,
    formatPoster: "JPG",
    formatOfferIcon: "PNG",
    profile: "S718",
    backdropProfile: "S1920",
    filter: { bestOnly: false },
  };
  const data = await queryGraphQL(GRAPHQL_SEARCH_QUERY, variables);
  return data.popularTitles.edges;
};

exports.searchMovie = async (event) => {
  const title = event.queryStringParameters.title;
  const providersParam = event.queryStringParameters.providers;
  const userProviders = providersParam ? providersParam.split(',') : [];
  const foundResults = [];
  const notFoundCountries = [];

  const tasks = COUNTRIES.map((country) => async () => {
    const movies = await searchMovieInCountry(title, country);

    if (movies.length === 0) {
      notFoundCountries.push(COUNTRY_NAMES[country]);
      return;
    }

    const movie = movies[0].node;
    const offers = (movie.offers || []).filter((offer) =>
      userProviders.includes(offer.package.clearName)
    );

    if (offers.length === 0) {
      notFoundCountries.push(COUNTRY_NAMES[country]);
    } else {
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
    }
  });

  await limitConcurrentRequests(tasks, 5); // Limit concurrent requests to 5

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify({
      found: foundResults,
      not_found: notFoundCountries,
    }),
  };
};