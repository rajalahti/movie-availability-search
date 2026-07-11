import { Calendar, Loader2, Search, Trash2 } from 'lucide-react';
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
      <div className="status-panel" role="status">
        <Loader2 className="spin" size={30} />
        <p>Loading your watchlist…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="status-panel">
        <h2>Your watchlist is empty</h2>
        <p>Save a movie from the search results to find it here.</p>
      </div>
    );
  }

  return (
    <section className="watchlist" aria-labelledby="watchlist-title">
      <h1 id="watchlist-title">My watchlist <span>{items.length}</span></h1>
      <div className="watchlist__grid">
        {items.map((item) => (
          <article className="watchlist-item" key={item.movieId}>
            <button type="button" className="watchlist-item__poster" onClick={() => onSearchMovie(item.title)}>
              <img src={item.poster} alt="" />
            </button>
            <div className="watchlist-item__content">
              <div>
                <h2>{item.title}</h2>
                <p><Calendar size={14} /> {item.year}</p>
              </div>
              <div className="watchlist-item__actions">
                <button type="button" onClick={() => onSearchMovie(item.title)} aria-label={`Search ${item.title}`}>
                  <Search size={18} />
                </button>
                <button type="button" onClick={() => onRemove(item.movieId)} aria-label={`Remove ${item.title} from watchlist`}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
