const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

const similarMoviesSchema = z.object({
  movies: z
    .array(
      z.object({
        title: z.string().describe("Movie title"),
        year: z.string().describe("Four-digit release year"),
        description: z.string().describe("Short spoiler-free description"),
      })
    )
    .length(10),
});

const readPositiveInteger = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const createClient = () =>
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: readPositiveInteger("OPENAI_TIMEOUT_MS", 20000),
    maxRetries: readPositiveInteger("OPENAI_MAX_RETRIES", 1),
  });

exports.getSimilarMovies = async (event) => {
  const title = event.queryStringParameters?.title?.trim();

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };

  if (!title) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing required query parameter: title" }),
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set, returning no recommendations.");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([]),
    };
  }

  try {
    const completion = await createClient().beta.chat.completions.parse({
      model: process.env.MODEL_GPT4O_MINI || "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: readPositiveInteger("OPENAI_MAX_TOKENS", 1200),
      messages: [
        {
          role: "system",
          content:
            "Recommend exactly 10 movies similar to the supplied title. Return diverse, relevant choices with the release year and a concise spoiler-free description.",
        },
        {
          role: "user",
          content: `Give me 10 movies similar to \"${title}\".`,
        },
      ],
      response_format: zodResponseFormat(
        similarMoviesSchema,
        "similar_movies"
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error("OpenAI returned no parsed recommendations");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed.movies),
    };
  } catch (error) {
    console.error("OpenAI recommendation request failed", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Error fetching similar movies" }),
    };
  }
};
