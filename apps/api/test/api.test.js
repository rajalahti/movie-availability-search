const assert = require("node:assert/strict");
const test = require("node:test");

const axios = require("axios");
const { getSimilarMovies } = require("../getSimilarMovies");
const { getDescription } = require("../getDescription");
const { queryGraphQL } = require("../graphql");
const { fetchFullDescription, isExactMovieMatch } = require("../omdb");
const { buildSearchResponse, searchMovie } = require("../searchMovie");

test("search rejects a missing title", async () => {
  const response = await searchMovie({ queryStringParameters: {} });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    error: "Missing required query parameter: title",
  });
});

test("similar search rejects a missing title", async () => {
  const response = await getSimilarMovies({ queryStringParameters: {} });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    error: "Missing required query parameter: title",
  });
});

test("description rejects missing or invalid movie identity", async () => {
  const response = await getDescription({
    queryStringParameters: { title: "Martyrs", year: "not-a-year" },
  });

  assert.equal(response.statusCode, 400);
});

test("OMDb exact matching keeps movies with the same title and different years separate", () => {
  const movie2008 = {
    Response: "True",
    Type: "movie",
    Title: "Martyrs",
    Year: "2008",
  };

  assert.equal(isExactMovieMatch(movie2008, "Martyrs", 2008), true);
  assert.equal(isExactMovieMatch(movie2008, "Martyrs", 2015), false);
});

test("full description uses an exact title and year match", async () => {
  const originalGet = axios.get;
  const originalApiKey = process.env.OMDB_API_KEY;
  const calls = [];
  process.env.OMDB_API_KEY = "test-key";
  axios.get = async (_url, options) => {
    calls.push(options.params);
    return {
      data: {
        Response: "True",
        Type: "movie",
        Title: "Martyrs",
        Year: "2008",
        imdbID: "tt1029234",
        Plot: "Verified full plot.",
      },
    };
  };

  try {
    const result = await fetchFullDescription("Martyrs", 2008);

    assert.equal(result.imdbId, "tt1029234");
    assert.equal(result.description, "Verified full plot.");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].t, "Martyrs");
    assert.equal(calls[0].y, 2008);
    assert.equal(calls[0].plot, "full");
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.OMDB_API_KEY;
    else process.env.OMDB_API_KEY = originalApiKey;
  }
});

test("full description resolves an exact search result by IMDb id when direct lookup mismatches", async () => {
  const originalGet = axios.get;
  const originalApiKey = process.env.OMDB_API_KEY;
  let call = 0;
  process.env.OMDB_API_KEY = "test-key";
  axios.get = async (_url, options) => {
    call += 1;

    if (call === 1) {
      return {
        data: {
          Response: "True",
          Type: "movie",
          Title: "Martyrs",
          Year: "2015",
          imdbID: "tt1663655",
          Plot: "Wrong remake.",
        },
      };
    }

    if (call === 2) {
      return {
        data: {
          Response: "True",
          Search: [
            { Title: "Martyrs", Year: "2008", Type: "movie", imdbID: "tt1029234" },
          ],
        },
      };
    }

    assert.equal(options.params.i, "tt1029234");
    return {
      data: {
        Response: "True",
        Type: "movie",
        Title: "Martyrs",
        Year: "2008",
        imdbID: "tt1029234",
        Plot: "Correct original plot.",
      },
    };
  };

  try {
    const result = await fetchFullDescription("Martyrs", 2008);
    assert.equal(result.imdbId, "tt1029234");
    assert.equal(result.description, "Correct original plot.");
    assert.equal(call, 3);
  } finally {
    axios.get = originalGet;
    if (originalApiKey === undefined) delete process.env.OMDB_API_KEY;
    else process.env.OMDB_API_KEY = originalApiKey;
  }
});

test("similar search degrades gracefully without an OpenRouter key", async () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  try {
    const response = await getSimilarMovies({
      queryStringParameters: { title: "Inception" },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), []);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalApiKey;
    }
  }
});

test("search results group regional matches by stable JustWatch movie id", () => {
  const sharedContent = {
    title: "Martyrs",
    shortDescription: "Description",
    genres: [{ shortName: "hrr" }],
    runtime: 99,
    posterUrl: "/poster.jpg",
  };
  const countryResults = [
    {
      country: "FI",
      edges: [{
        node: {
          id: "tm50176",
          objectType: "MOVIE",
          content: { ...sharedContent, originalReleaseYear: 2008 },
          offers: [{ package: { clearName: "Netflix" }, standardWebURL: "https://fi.example" }],
        },
      }],
    },
    {
      country: "SE",
      edges: [{
        node: {
          id: "tm50176",
          objectType: "MOVIE",
          content: { ...sharedContent, originalReleaseYear: 2008 },
          offers: [{ package: { clearName: "Netflix" }, standardWebURL: "https://se.example" }],
        },
      }],
    },
    {
      country: "US",
      edges: [{
        node: {
          id: "tm226968",
          objectType: "MOVIE",
          content: { ...sharedContent, originalReleaseYear: 2015 },
          offers: [{ package: { clearName: "Amazon Prime Video" }, standardWebURL: "https://us.example" }],
        },
      }],
    },
  ];

  const result = buildSearchResponse(countryResults, []);

  assert.equal(result.movies.length, 2);
  assert.equal(result.foundResults.length, 3);
  assert.deepEqual(
    result.movies.map((movie) => ({
      id: movie.id,
      year: movie.year,
      countries: movie.countries.map((country) => country.countryCode),
    })),
    [
      { id: "tm50176", year: 2008, countries: ["FI", "SE"] },
      { id: "tm226968", year: 2015, countries: ["US"] },
    ]
  );
});

test("Max provider selection matches JustWatch's HBO Max provider name", () => {
  const countryResults = [
    {
      country: "FI",
      edges: [{
        node: {
          id: "ts2",
          objectType: "SHOW",
          content: {
            title: "Game of Thrones",
            originalReleaseYear: 2011,
            shortDescription: "Nine noble families fight for control.",
            genres: [{ shortName: "drm" }],
            runtime: 58,
            posterUrl: "/poster.jpg",
          },
          offers: [
            {
              package: { clearName: "HBO Max" },
              standardWebURL: "https://max.example/game-of-thrones",
            },
            {
              package: { clearName: "HBO Max Amazon Channel" },
              standardWebURL: "https://amazon.example/game-of-thrones",
            },
          ],
        },
      }],
    },
  ];

  const result = buildSearchResponse(countryResults, ["Max"]);

  assert.equal(result.movies.length, 1);
  assert.deepEqual(result.movies[0].countries[0].offers, [
    {
      provider: "HBO Max",
      url: "https://max.example/game-of-thrones",
    },
  ]);
  assert.deepEqual(result.notFoundCountries, []);
});

test("JustWatch requests retry transient failures", async () => {
  const originalPost = axios.post;
  const originalRetries = process.env.JUSTWATCH_MAX_RETRIES;
  const originalRetryBase = process.env.JUSTWATCH_RETRY_BASE_MS;
  let calls = 0;

  process.env.JUSTWATCH_MAX_RETRIES = "1";
  process.env.JUSTWATCH_RETRY_BASE_MS = "1";
  axios.post = async () => {
    calls += 1;

    if (calls === 1) {
      const error = new Error("Temporary upstream failure");
      error.response = { status: 503 };
      throw error;
    }

    return { data: { data: { popularTitles: { edges: [] } } } };
  };

  try {
    const result = await queryGraphQL("query Test { test }", {});
    assert.deepEqual(result, { popularTitles: { edges: [] } });
    assert.equal(calls, 2);
  } finally {
    axios.post = originalPost;

    if (originalRetries === undefined) {
      delete process.env.JUSTWATCH_MAX_RETRIES;
    } else {
      process.env.JUSTWATCH_MAX_RETRIES = originalRetries;
    }

    if (originalRetryBase === undefined) {
      delete process.env.JUSTWATCH_RETRY_BASE_MS;
    } else {
      process.env.JUSTWATCH_RETRY_BASE_MS = originalRetryBase;
    }
  }
});
