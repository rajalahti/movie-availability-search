import axios from 'axios';
import { MOVIE_API_BASE } from '../aws-config';

// API Key for the movie search backend
const API_KEY = 'djps0aJkn96SdWWgmDXXd95s81uFEINta7LJgCqJ';

// Create axios instance with API key header
const apiClient = axios.create({
  baseURL: MOVIE_API_BASE,
  headers: {
    'x-api-key': API_KEY,
  },
});

// API response types (actual backend format)
interface ApiOffer {
  provider: string;
  url: string;
}

interface ApiMovieResult {
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

interface ApiSearchResponse {
  found: ApiMovieResult[];
  notFoundIn?: string[];
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

export interface SearchResponse {
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

// Transform API response to frontend format
function transformSearchResponse(apiResponse: ApiSearchResponse): SearchResponse {
  return {
    results: apiResponse.found.map((item) => ({
      title: item.foundTitle,
      year: item.year,
      duration: item.runtime,
      description: item.shortDescription,
      genres: item.genres,
      poster: item.posterUrl.startsWith('http') ? item.posterUrl : POSTER_BASE + item.posterUrl,
      country: item.countryCode,
      countryName: item.country,
      providers: item.offers.map((offer) => ({
        name: offer.provider,
        url: offer.url,
      })),
    })),
    notAvailableIn: apiResponse.notFoundIn || [],
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
