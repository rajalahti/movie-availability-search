import { Trash2, Calendar, Loader2 } from 'lucide-react';
import { WatchlistItem } from '../services/watchlistApi';

interface Props {
  items: WatchlistItem[];
  isLoading: boolean;
  onRemove: (movieId: string) => void;
  onSearchMovie: (title: string) => void;
}

export function WatchlistView({ items, isLoading, onRemove, onSearchMovie }: Props) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Your watchlist is empty</p>
        <p className="text-gray-500 mt-2">Search for movies and add them to your watchlist</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">My Watchlist ({items.length})</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.movieId}
            className="bg-gray-800 rounded-lg overflow-hidden group relative"
          >
            <img
              src={item.poster}
              alt={item.title}
              className="w-full h-56 object-cover cursor-pointer"
              onClick={() => onSearchMovie(item.title)}
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 
                          transition-opacity flex flex-col justify-end p-3">
              <button
                onClick={() => onRemove(item.movieId)}
                className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-full
                         transition-colors"
                title="Remove from watchlist"
              >
                <Trash2 size={16} />
              </button>
              
              <button
                onClick={() => onSearchMovie(item.title)}
                className="w-full py-2 bg-primary hover:bg-red-700 rounded text-sm
                         transition-colors"
              >
                Check Availability
              </button>
            </div>
            
            <div className="p-3">
              <h3 className="font-semibold text-sm truncate" title={item.title}>
                {item.title}
              </h3>
              <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                <Calendar size={12} />
                {item.year}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
