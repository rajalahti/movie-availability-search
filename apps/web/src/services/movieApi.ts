import axios from 'axios';
import { MOVIE_API_BASE } from '../aws-config';

const API_KEY = import.meta.env.VITE_API_KEY;

const apiClient = axios.create({
  baseURL: MOVIE_API_BASE,
  ...(API_KEY
    ? {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    : {}),
});

// API response types (actual backend format)
interface ApiOffer {
  provider: string;
  url: string;
}

interface ApiMovieResult {
  movieId?: string;
  objectType?: string;
  country: string;
  countryCode: string;
  foundTitle: string;
  year: number;
  shortDescription: string;
  genres: string[];
  runtime: number;
  posterUrl: string;
  offers: ApiOffer[];
}

interface ApiCountryAvailability {
  country: string;
  countryCode: string;
  offers: ApiOffer[];
}

interface ApiMovieGroup {
  id: string;
  objectType?: string;
  title: string;
  year: number;
  description: string;
  genres: string[];
  runtime: number;
  posterUrl: string;
  countries: ApiCountryAvailability[];
}

interface ApiSearchResponse {
  movies?: ApiMovieGroup[];
  found?: ApiMovieResult[];
  notFoundIn?: string[];
  not_found?: string[];
}

interface ApiSimilarMovie {
  title: string;
  year: string;
  description: string;
}

// Similar API returns array directly, not wrapped in object
type ApiSimilarResponse = ApiSimilarMovie[];

// Frontend types (normalized)
export interface Provider {
  name: string;
  url: string;
}

export interface MovieResult {
  id?: string;
  title: string;
  year: number;
  duration: number;
  description: string;
  genres: string[];
  poster: string;
  country: string;
  countryName: string;
  providers: Provider[];
}

export interface CountryAvailability {
  country: string;
  countryName: string;
  providers: Provider[];
}

export interface MovieAvailabilityGroup {
  id: string;
  title: string;
  year: number;
  duration: number;
  description: string;
  genres: string[];
  poster: string;
  countries: CountryAvailability[];
}

export interface SearchResponse {
  movies: MovieAvailabilityGroup[];
  results: MovieResult[];
  notAvailableIn: string[];
}

export interface SimilarMovie {
  title: string;
  year: number;
  poster: string;
  description: string;
}

export interface SimilarResponse {
  recommendations: SimilarMovie[];
}

export interface FullDescriptionResponse {
  title: string;
  year: number;
  imdbId: string;
  description: string;
  source: 'omdb';
}

export const PROVIDERS = [
  'Netflix',
  'Max',
  'Amazon Prime Video',
  'Pluto TV',
  'BBC iPlayer',
  'SkyShowtime',
  'Yle Areena',
  'Disney Plus',
  'MTV Katsomo',
] as const;

export type ProviderName = (typeof PROVIDERS)[number];

const POSTER_BASE = 'https://images.justwatch.com';

function normalizePosterUrl(posterUrl: string): string {
  return posterUrl.startsWith('http') ? posterUrl : POSTER_BASE + posterUrl;
}

function normalizeMovieGroups(apiResponse: ApiSearchResponse): MovieAvailabilityGroup[] {
  if (apiResponse.movies) {
    return apiResponse.movies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      duration: movie.runtime,
      description: movie.description,
      genres: movie.genres,
      poster: normalizePosterUrl(movie.posterUrl),
      countries: movie.countries.map((country) => ({
        country: country.countryCode,
        countryName: country.country,
        providers: country.offers.map((offer) => ({
          name: offer.provider,
          url: offer.url,
        })),
      })),
    }));
  }

  const legacyGroups = new Map<string, MovieAvailabilityGroup>();

  (apiResponse.found ?? []).forEach((item) => {
    const id = item.movieId || `${item.foundTitle.toLowerCase()}-${item.year}`;
    const group = legacyGroups.get(id) || {
      id,
      title: item.foundTitle,
      year: item.year,
      duration: item.runtime,
      description: item.shortDescription,
      genres: item.genres,
      poster: normalizePosterUrl(item.posterUrl),
      countries: [],
    };

    group.countries.push({
      country: item.countryCode,
      countryName: item.country,
      providers: item.offers.map((offer) => ({
        name: offer.provider,
        url: offer.url,
      })),
    });
    legacyGroups.set(id, group);
  });

  return Array.from(legacyGroups.values());
}

// Transform API response to frontend format
function transformSearchResponse(apiResponse: ApiSearchResponse): SearchResponse {
  const movies = normalizeMovieGroups(apiResponse);

  return {
    movies,
    results: movies.flatMap((movie) =>
      movie.countries.map((country) => ({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        duration: movie.duration,
        description: movie.description,
        genres: movie.genres,
        poster: movie.poster,
        country: country.country,
        countryName: country.countryName,
        providers: country.providers,
      }))
    ),
    notAvailableIn: apiResponse.notFoundIn || apiResponse.not_found || [],
  };
}

function transformSimilarResponse(apiResponse: ApiSimilarResponse): SimilarResponse {
  // API returns array directly
  const items = Array.isArray(apiResponse) ? apiResponse : [];
  return {
    recommendations: items.map((item) => ({
      title: item.title,
      year: parseInt(item.year) || 0,
      poster: '', // No poster from this API - will use placeholder
      description: item.description || '',
    })),
  };
}

export async function searchMovies(
  title: string,
  providers: ProviderName[] = [...PROVIDERS]
): Promise<SearchResponse> {
  // Don't use URLSearchParams as it encodes commas - API expects raw commas
  const queryString = `title=${encodeURIComponent(title)}&providers=${providers.join(',')}`;

  const response = await apiClient.get<ApiSearchResponse>(`/search?${queryString}`);
  return transformSearchResponse(response.data);
}

export async function getSimilarMovies(title: string): Promise<SimilarResponse> {
  const response = await apiClient.get<ApiSimilarResponse>(
    `/similar?title=${encodeURIComponent(title)}`
  );
  return transformSimilarResponse(response.data);
}

export async function getFullDescription(
  title: string,
  year: number
): Promise<FullDescriptionResponse> {
  const response = await apiClient.get<FullDescriptionResponse>(
    `/description?title=${encodeURIComponent(title)}&year=${year}`
  );
  return response.data;
}
