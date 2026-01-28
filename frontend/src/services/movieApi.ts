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

// Priority countries - shown first in results
export const PRIORITY_COUNTRIES = ['FI', 'GB', 'US'] as const;

// Country metadata: flags and full names
export const COUNTRY_DATA: Record<string, { flag: string; name: string }> = {
  FI: { flag: '🇫🇮', name: 'Finland' },
  US: { flag: '🇺🇸', name: 'United States' },
  GB: { flag: '🇬🇧', name: 'United Kingdom' },
  AU: { flag: '🇦🇺', name: 'Australia' },
  CA: { flag: '🇨🇦', name: 'Canada' },
  IE: { flag: '🇮🇪', name: 'Ireland' },
  NZ: { flag: '🇳🇿', name: 'New Zealand' },
  AR: { flag: '🇦🇷', name: 'Argentina' },
  AT: { flag: '🇦🇹', name: 'Austria' },
  BE: { flag: '🇧🇪', name: 'Belgium' },
  BR: { flag: '🇧🇷', name: 'Brazil' },
  CL: { flag: '🇨🇱', name: 'Chile' },
  CO: { flag: '🇨🇴', name: 'Colombia' },
  CZ: { flag: '🇨🇿', name: 'Czech Republic' },
  DK: { flag: '🇩🇰', name: 'Denmark' },
  FR: { flag: '🇫🇷', name: 'France' },
  DE: { flag: '🇩🇪', name: 'Germany' },
  GR: { flag: '🇬🇷', name: 'Greece' },
  HK: { flag: '🇭🇰', name: 'Hong Kong' },
  HU: { flag: '🇭🇺', name: 'Hungary' },
  IN: { flag: '🇮🇳', name: 'India' },
  ID: { flag: '🇮🇩', name: 'Indonesia' },
  IL: { flag: '🇮🇱', name: 'Israel' },
  IT: { flag: '🇮🇹', name: 'Italy' },
  JP: { flag: '🇯🇵', name: 'Japan' },
  KR: { flag: '🇰🇷', name: 'South Korea' },
  MY: { flag: '🇲🇾', name: 'Malaysia' },
  MX: { flag: '🇲🇽', name: 'Mexico' },
  NL: { flag: '🇳🇱', name: 'Netherlands' },
  NO: { flag: '🇳🇴', name: 'Norway' },
  PH: { flag: '🇵🇭', name: 'Philippines' },
  PL: { flag: '🇵🇱', name: 'Poland' },
  PT: { flag: '🇵🇹', name: 'Portugal' },
  RO: { flag: '🇷🇴', name: 'Romania' },
  RU: { flag: '🇷🇺', name: 'Russia' },
  SG: { flag: '🇸🇬', name: 'Singapore' },
  ZA: { flag: '🇿🇦', name: 'South Africa' },
  ES: { flag: '🇪🇸', name: 'Spain' },
  SE: { flag: '🇸🇪', name: 'Sweden' },
  CH: { flag: '🇨🇭', name: 'Switzerland' },
  TH: { flag: '🇹🇭', name: 'Thailand' },
  TR: { flag: '🇹🇷', name: 'Turkey' },
  UA: { flag: '🇺🇦', name: 'Ukraine' },
  AE: { flag: '🇦🇪', name: 'United Arab Emirates' },
};

// Get country flag emoji
export function getCountryFlag(countryCode: string): string {
  return COUNTRY_DATA[countryCode]?.flag || '🏳️';
}

// Get country full name
export function getCountryName(countryCode: string): string {
  return COUNTRY_DATA[countryCode]?.name || countryCode;
}

// Sort results with priority countries first
function sortByPriority(results: MovieResult[]): MovieResult[] {
  return [...results].sort((a, b) => {
    const aIndex = PRIORITY_COUNTRIES.indexOf(a.country as typeof PRIORITY_COUNTRIES[number]);
    const bIndex = PRIORITY_COUNTRIES.indexOf(b.country as typeof PRIORITY_COUNTRIES[number]);
    
    // Both are priority countries - sort by priority order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // Only a is priority - a comes first
    if (aIndex !== -1) return -1;
    // Only b is priority - b comes first
    if (bIndex !== -1) return 1;
    // Neither is priority - sort alphabetically by country name
    return a.countryName.localeCompare(b.countryName);
  });
}

// Transform API response to frontend format
function transformSearchResponse(apiResponse: ApiSearchResponse): SearchResponse {
  const results = apiResponse.found.map((item) => ({
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
  }));

  return {
    results: sortByPriority(results),
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
