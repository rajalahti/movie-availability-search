import { Bookmark, BookmarkCheck, Clock, Calendar, ExternalLink } from 'lucide-react';
import { MovieResult, getCountryFlag, getCountryName } from '../services/movieApi';

interface Props {
  movie: MovieResult;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  isAuthenticated: boolean;
}

export function MovieCard({ movie, isInWatchlist, onToggleWatchlist, isAuthenticated }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-gray-800 rounded-lg p-4">
      {/* Poster */}
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-full sm:w-32 h-48 object-cover rounded self-center"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-xl font-bold truncate">{movie.title}</h3>
            <div className="flex flex-wrap gap-3 text-gray-400 text-sm mt-1">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {movie.year}
              </span>
              {movie.duration && (
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {movie.duration} min
                </span>
              )}
            </div>
          </div>

          {/* Country flag + name + Watchlist */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 bg-gray-700/50 px-2 py-1 rounded" title={getCountryName(movie.country)}>
              <span className="text-xl">{getCountryFlag(movie.country)}</span>
              {/* Show country code on mobile, full name on desktop */}
              <span className="text-sm text-gray-300 md:hidden">{movie.country}</span>
              <span className="text-sm text-gray-300 hidden md:inline">{getCountryName(movie.country)}</span>
            </div>
            {isAuthenticated && (
              <button
                onClick={onToggleWatchlist}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isInWatchlist ? (
                  <BookmarkCheck className="text-primary" size={24} />
                ) : (
                  <Bookmark size={24} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mt-2 line-clamp-2">{movie.description}</p>

        {/* Genres */}
        <div className="flex flex-wrap gap-2 mt-2">
          {movie.genres.map((genre) => (
            <span
              key={genre}
              className="px-2 py-1 bg-primary/20 text-primary text-xs rounded"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Providers */}
        {movie.providers.length > 0 && (
          <div className="mt-3">
            <span className="text-gray-400 text-sm">Available on:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {movie.providers.map((provider) => (
                <a
                  key={provider.name}
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600 
                           flex items-center gap-1 transition-colors"
                >
                  {provider.name}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
