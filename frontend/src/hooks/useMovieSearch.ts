import { useQuery } from '@tanstack/react-query';
import { searchMovies, getSimilarMovies, ProviderName } from '../services/movieApi';

export function useMovieSearch(title: string, providers: ProviderName[]) {
  return useQuery({
    queryKey: ['movies', 'search', title, providers],
    queryFn: () => searchMovies(title, providers),
    enabled: title.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useSimilarMovies(title: string) {
  return useQuery({
    queryKey: ['movies', 'similar', title],
    queryFn: () => getSimilarMovies(title),
    enabled: title.length > 0,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
}
