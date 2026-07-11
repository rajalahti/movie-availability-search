import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  WatchlistItem,
} from '../services/watchlistApi';

export function useWatchlist() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    staleTime: 30 * 1000, // 30 sec
  });

  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const isInWatchlist = (movieId: string) => 
    items.some((item) => item.movieId === movieId);

  return {
    items,
    isLoading,
    error,
    addToWatchlist: (movie: Omit<WatchlistItem, 'addedAt'>) => addMutation.mutate(movie),
    removeFromWatchlist: (movieId: string) => removeMutation.mutate(movieId),
    isInWatchlist,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
