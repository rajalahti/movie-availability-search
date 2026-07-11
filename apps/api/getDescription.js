const { getOrSet } = require("./cache");
const { fetchFullDescription, normalizeComparableTitle } = require("./omdb");

const DESCRIPTION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const readDescriptionTtlMs = () => {
  const value = Number(process.env.DESCRIPTION_CACHE_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : DESCRIPTION_CACHE_TTL_MS;
};

exports.getDescription = async (event) => {
  const title = event.queryStringParameters?.title?.trim();
  const year = Number(event.queryStringParameters?.year);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };

  if (!title || !Number.isInteger(year) || year < 1888 || year > 2200) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Valid title and year query parameters are required" }),
    };
  }

  try {
    const { value, cacheStatus } = await getOrSet(
      `description:${normalizeComparableTitle(title)}:${year}`,
      () => fetchFullDescription(title, year),
      { ttlMs: readDescriptionTtlMs() }
    );

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "X-Description-Cache": cacheStatus,
      },
      body: JSON.stringify(value),
    };
  } catch (error) {
    if (error.code === "OMDB_NOT_CONFIGURED") {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: "Full descriptions are not configured" }),
      };
    }

    if (error.code === "OMDB_EXACT_MATCH_NOT_FOUND") {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "No exact full description was found" }),
      };
    }

    console.error("OMDb description request failed", {
      message: error.message,
      status: error.response?.status,
    });
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Error fetching full description" }),
    };
  }
};
