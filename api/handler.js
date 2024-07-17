const axios = require("axios");
const { ChatOpenAI } = require("@langchain/openai");
const { StructuredOutputParser } = require("langchain/output_parsers");
const { PromptTemplate, ChatPromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");
const { z } = require("zod");
require("dotenv").config();

const GRAPHQL_URL = "https://apis.justwatch.com/graphql";
const PROVIDERS = [
  "Netflix",
  "Max",
  "Amazon Prime Video",
  "Pluto TV",
  "BBC iPlayer",
  "SkyShowtime",
  "Yle Areena",
];

const COUNTRY_NAMES = {
  FI: "Finland",
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia",
  CA: "Canada",
  IE: "Ireland",
  NZ: "New Zealand",
  AR: "Argentina",
  AT: "Austria",
  BE: "Belgium",
  BR: "Brazil",
  CL: "Chile",
  CO: "Colombia",
  CZ: "Czech Republic",
  DK: "Denmark",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  HK: "Hong Kong",
  HU: "Hungary",
  IN: "India",
  ID: "Indonesia",
  IL: "Israel",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  MY: "Malaysia",
  MX: "Mexico",
  NL: "Netherlands",
  NO: "Norway",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  RU: "Russia",
  SG: "Singapore",
  ZA: "South Africa",
  ES: "Spain",
  SE: "Sweden",
  CH: "Switzerland",
  TH: "Thailand",
  TR: "Turkey",
  UA: "Ukraine",
  AE: "United Arab Emirates",
};

const COUNTRIES = [
  "FI",
  "US",
  "GB",
  "AU",
  "CA",
  "IE",
  "NZ",
  "AR",
  "AT",
  "BE",
  "BR",
  "CL",
  "CO",
  "CZ",
  "DK",
  "FR",
  "DE",
  "GR",
  "HK",
  "HU",
  "IN",
  "ID",
  "IL",
  "IT",
  "JP",
  "KR",
  "MY",
  "MX",
  "NL",
  "NO",
  "PH",
  "PL",
  "PT",
  "RO",
  "RU",
  "SG",
  "ZA",
  "ES",
  "SE",
  "CH",
  "TH",
  "TR",
  "UA",
  "AE",
];

const GENRE_MAP = {
  act: "Action",
  hrr: "Horror",
  trl: "Thriller",
  drm: "Drama",
  cmy: "Comedy",
  ani: "Animation",
  doc: "Documentary",
  fam: "Family",
  fan: "Fantasy",
  his: "History",
  myst: "Mystery",
  rom: "Romance",
  scf: "Science Fiction",
  spt: "Sports",
  mus: "Music",
  war: "War",
  bio: "Biography",
  adv: "Adventure",
  crm: "Crime",
  wes: "Western",
  eur: "Made in Europe",
};

const GRAPHQL_SEARCH_QUERY = `
query GetSearchTitles(
  $searchTitlesFilter: TitleFilter!,
  $country: Country!,
  $language: Language!,
  $first: Int!,
  $formatPoster: ImageFormat,
  $formatOfferIcon: ImageFormat,
  $profile: PosterProfile,
  $backdropProfile: BackdropProfile,
  $filter: OfferFilter!,
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
        ...TitleDetails
        __typename
      }
      __typename
    }
    __typename
  }
}

fragment TitleDetails on MovieOrShow {
  id
  objectId
  objectType
  content(country: $country, language: $language) {
    title
    fullPath
    originalReleaseYear
    originalReleaseDate
    runtime
    shortDescription
    genres {
      shortName
      __typename
    }
    externalIds {
      imdbId
      __typename
    }
    posterUrl(profile: $profile, format: $formatPoster)
    backdrops(profile: $backdropProfile, format: $formatPoster) {
      backdropUrl
      __typename
    }
    __typename
  }
  offers(country: $country, platform: WEB, filter: $filter) {
    ...TitleOffer
  }
  __typename
}

fragment TitleOffer on Offer {
  id
  monetizationType
  presentationType
  retailPrice(language: $language)
  retailPriceValue
  currency
  lastChangeRetailPriceValue
  type
  package {
    id
    packageId
    clearName
    technicalName
    icon(profile: S100, format: $formatOfferIcon)
    __typename
  }
  standardWebURL
  elementCount
  availableTo
  deeplinkRoku: deeplinkURL(platform: ROKU_OS)
  subtitleLanguages
  videoTechnology
  audioTechnology
  audioLanguages
  __typename
}
`;

const queryGraphQL = async (query, variables) => {
  try {
    const response = await axios.post(GRAPHQL_URL, {
      query: query,
      variables: variables,
    });
    if (response.data.errors) {
      console.error("GraphQL query failed:", response.data.errors);
      throw new Error("GraphQL query failed");
    }
    return response.data.data;
  } catch (error) {
    console.error("Error making GraphQL request:", error);
    throw error;
  }
};

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

const filterProviders = (offers) => {
  return offers.filter((offer) => PROVIDERS.includes(offer.package.clearName));
};

const limitConcurrentRequests = async (tasks, limit) => {
  const results = [];
  const executing = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);

    if (limit <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
};

exports.searchMovie = async (event) => {
  const title = event.queryStringParameters.title;
  const foundResults = [];
  const notFoundCountries = [];

  const tasks = COUNTRIES.map((country) => async () => {
    const movies = await searchMovieInCountry(title, country);

    if (movies.length === 0) {
      notFoundCountries.push(COUNTRY_NAMES[country]);
      return;
    }

    const movie = movies[0].node;
    const offers = filterProviders(movie.offers || []);

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

const parser = StructuredOutputParser.fromZodSchema(
  z.array(
    z.object({
      title: z.string().describe("Movie title"),
      year: z.string().describe("Year of release"),
      description: z.string().describe("Short description of the movie"),
    })
  )
);

const systemPrompt = new PromptTemplate({
  inputVariables: ["title"],
  template:
    "You are an AI that provides recommendations for similar movies. The user will provide a movie title and you will respond with 4 similar movies including the title, year of release, and a short description.",
});

const similarMoviesPrompt = new PromptTemplate({
  inputVariables: ["title", "format_instructions"],
  template: `User: Give me 4 movies similar to "{title}".

  {format_instructions}
  `,
});

exports.getSimilarMovies = async (event) => {
  const model = new ChatOpenAI({
    temperature: 0.9,
    modelName: process.env.MODEL_OPUS,
    maxTokens: 4000,
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  const title = event.queryStringParameters.title;

  const chatPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt.template],
    ["human", similarMoviesPrompt.template],
  ]);

  const chain = RunnableSequence.from([chatPrompt, model, parser]);

  let similarMovies = [];
  try {
    const response = await chain.invoke({
      title: title,
      format_instructions: parser.getFormatInstructions(),
    });
    similarMovies = response;
  } catch (error) {
    console.error("Error parsing:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error fetching similar movies" }),
    };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(similarMovies),
  };
};
