const axios = require("axios");

const OMDB_URL = "https://www.omdbapi.com/";

const readPositiveInteger = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const normalizeComparableTitle = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const readReleaseYear = (value) => {
  const match = String(value || "").match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
};

const hasUsablePlot = (value) =>
  typeof value === "string" && value.trim().length > 0 && value !== "N/A";

const isExactMovieMatch = (movie, title, year) =>
  movie?.Response === "True" &&
  movie?.Type === "movie" &&
  normalizeComparableTitle(movie.Title) === normalizeComparableTitle(title) &&
  readReleaseYear(movie.Year) === Number(year);

const requestOmdb = async (params) => {
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    const error = new Error("OMDB_API_KEY is not configured");
    error.code = "OMDB_NOT_CONFIGURED";
    throw error;
  }

  const response = await axios.get(OMDB_URL, {
    params: {
      apikey: apiKey,
      r: "json",
      ...params,
    },
    timeout: readPositiveInteger("OMDB_TIMEOUT_MS", 8000),
  });

  return response.data;
};

const toDescriptionResult = (movie) => ({
  title: movie.Title,
  year: readReleaseYear(movie.Year),
  imdbId: movie.imdbID,
  description: movie.Plot.trim(),
  source: "omdb",
});

const fetchFullDescription = async (title, year) => {
  const directMatch = await requestOmdb({
    t: title,
    y: year,
    type: "movie",
    plot: "full",
  });

  if (isExactMovieMatch(directMatch, title, year) && hasUsablePlot(directMatch.Plot)) {
    return toDescriptionResult(directMatch);
  }

  const searchResult = await requestOmdb({
    s: title,
    y: year,
    type: "movie",
  });
  const exactSearchMatch = (searchResult.Search || []).find(
    (movie) =>
      movie.Type === "movie" &&
      normalizeComparableTitle(movie.Title) === normalizeComparableTitle(title) &&
      readReleaseYear(movie.Year) === Number(year)
  );

  if (exactSearchMatch?.imdbID) {
    const idMatch = await requestOmdb({
      i: exactSearchMatch.imdbID,
      type: "movie",
      plot: "full",
    });

    if (isExactMovieMatch(idMatch, title, year) && hasUsablePlot(idMatch.Plot)) {
      return toDescriptionResult(idMatch);
    }
  }

  const error = new Error(`No exact OMDb movie match for ${title} (${year})`);
  error.code = "OMDB_EXACT_MATCH_NOT_FOUND";
  throw error;
};

module.exports = {
  fetchFullDescription,
  isExactMovieMatch,
  normalizeComparableTitle,
  readReleaseYear,
};
