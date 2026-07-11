import { ChevronRight, Loader2, Search } from 'lucide-react';
import { SimilarMovie } from '../services/movieApi';
import { ExpandableText } from './ExpandableText';

interface Props {
  movies: SimilarMovie[];
  isLoading: boolean;
  onSearchMovie: (title: string) => void;
}

export function RecommendationList({ movies, isLoading, onSearchMovie }: Props) {
  if (isLoading) {
    return (
      <section className="recommendations recommendations--loading" aria-label="Loading recommendations">
        <Loader2 className="spin" size={22} />
        <span>Finding similar movies…</span>
      </section>
    );
  }

  if (movies.length === 0) {
    return null;
  }

  return (
    <section className="recommendations" aria-labelledby="recommendations-title">
      <h2 id="recommendations-title">You might also like</h2>
      <div className="recommendation-list">
        {movies.slice(0, 5).map((movie) => (
          <article className="recommendation-row" key={`${movie.title}-${movie.year}`}>
            <div className="recommendation-row__content">
              <h3>
                {movie.title} <span>{movie.year || ''}</span>
              </h3>
              <ExpandableText
                text={movie.description}
                className="recommendation-row__description"
                collapsedLines={2}
                toggleThreshold={100}
                moreLabel="Read more"
                lessLabel="Show less"
              />
            </div>
            <button
              type="button"
              className="recommendation-row__action"
              onClick={() => onSearchMovie(movie.title)}
              aria-label={`Check availability for ${movie.title}`}
            >
              <Search size={20} aria-hidden="true" />
              <span>Check availability</span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
