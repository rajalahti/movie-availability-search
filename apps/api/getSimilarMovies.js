const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_RECOMMENDATION_MODEL = "google/gemini-2.5-flash-lite";
const SIMILAR_MOVIES_PROMPT = `Recommend exactly 10 real feature films similar to the supplied movie.

Prioritize meaningful similarities in themes, tone, genre, storytelling style, setting, or audience appeal. Include both familiar and less-obvious choices.

Every title and release year must be factual. Describe each recommended film's actual premise; never alter its plot to make it sound more similar to the source. Do not invent films, documentaries, alternate titles, or release years.`;

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

const createClient = () => {
  const defaultHeaders = {};

  if (process.env.OPENROUTER_SITE_URL) {
    defaultHeaders["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  }

  if (process.env.OPENROUTER_APP_NAME) {
    defaultHeaders["X-Title"] = process.env.OPENROUTER_APP_NAME;
  }

  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    timeout: readPositiveInteger("OPENROUTER_TIMEOUT_MS", 20000),
    maxRetries: readPositiveInteger("OPENROUTER_MAX_RETRIES", 1),
    defaultHeaders,
  });
};

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

  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY is not set, returning no recommendations.");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([]),
    };
  }

  try {
    const completion = await createClient().beta.chat.completions.parse({
      model: process.env.OPENROUTER_MODEL || DEFAULT_RECOMMENDATION_MODEL,
      temperature: 0.5,
      max_tokens: readPositiveInteger("OPENROUTER_MAX_TOKENS", 1200),
      messages: [
        {
          role: "system",
          content: SIMILAR_MOVIES_PROMPT,
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
      provider: {
        require_parameters: true,
      },
    });

    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error("OpenRouter returned no parsed recommendations");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed.movies),
    };
  } catch (error) {
    console.error("OpenRouter recommendation request failed", {
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
