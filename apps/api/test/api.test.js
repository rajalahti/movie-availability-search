const assert = require("node:assert/strict");
const test = require("node:test");

const axios = require("axios");
const { getSimilarMovies } = require("../getSimilarMovies");
const { queryGraphQL } = require("../graphql");
const { searchMovie } = require("../searchMovie");

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

test("similar search degrades gracefully without an OpenAI key", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const response = await getSimilarMovies({
      queryStringParameters: { title: "Inception" },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), []);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
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
