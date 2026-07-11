import { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe2,
  PlayCircle,
} from 'lucide-react';
import { MovieAvailabilityGroup } from '../services/movieApi';
import { MovieDescription } from './MovieDescription';

interface Props {
  movies: MovieAvailabilityGroup[];
  selectedMovieId: string;
  onSelectMovie: (movieId: string) => void;
  notAvailableIn: string[];
  isAuthenticated: boolean;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
}

export function MovieResults({
  movies,
  selectedMovieId,
  onSelectMovie,
  notAvailableIn,
  isAuthenticated,
  isInWatchlist,
  onToggleWatchlist,
}: Props) {
  const selectedMovie =
    movies.find((movie) => movie.id === selectedMovieId) ?? movies[0];
  const [expandedCountry, setExpandedCountry] = useState(
    selectedMovie?.countries[0]?.country ?? ''
  );

  if (!selectedMovie) {
    return null;
  }

  function handleMovieSelection(movie: MovieAvailabilityGroup) {
    onSelectMovie(movie.id);
    setExpandedCountry(movie.countries[0]?.country ?? '');
  }

  return (
    <div className="results-view">
      {movies.length > 1 && (
        <section className="movie-picker" aria-labelledby="movie-picker-title">
          <div className="movie-picker__heading">
            <h1 id="movie-picker-title">Choose a movie</h1>
            <p>{movies.length} matches</p>
          </div>

          <div className="movie-picker__rail" role="list" aria-label="Matching movies">
            {movies.map((movie) => {
              const isSelected = movie.id === selectedMovie.id;
              const countryCount = movie.countries.length;

              return (
                <div key={movie.id} className="movie-option-item" role="listitem">
                  <button
                    type="button"
                    className={`movie-option ${isSelected ? 'movie-option--selected' : ''}`}
                    onClick={() => handleMovieSelection(movie)}
                    aria-pressed={isSelected}
                  >
                    <img src={movie.poster} alt="" />
                    <span className="movie-option__title">{movie.title}</span>
                    <span className="movie-option__meta">{movie.year}</span>
                    <span className="movie-option__meta">
                      {countryCount} {countryCount === 1 ? 'country' : 'countries'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section
        key={selectedMovie.id}
        className="movie-summary"
        aria-labelledby="movie-title"
      >
        <img className="movie-summary__poster" src={selectedMovie.poster} alt="" />

        <div className="movie-summary__content">
          <div className="movie-summary__heading">
            <div>
              <h1 id="movie-title">{selectedMovie.title}</h1>
              <p className="movie-meta">
                <span>{selectedMovie.year}</span>
                {selectedMovie.duration > 0 && <span>{selectedMovie.duration} min</span>}
                {selectedMovie.genres.length > 0 && (
                  <span>{selectedMovie.genres.slice(0, 2).join(', ')}</span>
                )}
              </p>
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={onToggleWatchlist}
                className={`bookmark-button ${isInWatchlist ? 'bookmark-button--active' : ''}`}
                aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                aria-pressed={isInWatchlist}
              >
                {isInWatchlist ? <BookmarkCheck size={27} /> : <Bookmark size={27} />}
              </button>
            )}
          </div>

          <MovieDescription
            key={selectedMovie.id}
            title={selectedMovie.title}
            year={selectedMovie.year}
            shortDescription={selectedMovie.description}
          />
        </div>
      </section>

      <section className="availability-section" aria-labelledby="availability-title">
        <h2 id="availability-title">Where to watch</h2>

        <div className="country-ledger">
          {selectedMovie.countries.map((country) => {
            const isExpanded = country.country === expandedCountry;
            const panelId = `country-${selectedMovie.id}-${country.country}`;

            return (
              <article
                key={`${selectedMovie.id}-${country.country}`}
                className={`country-row ${isExpanded ? 'country-row--expanded' : ''}`}
              >
                <button
                  type="button"
                  className="country-row__trigger"
                  onClick={() => setExpandedCountry(isExpanded ? '' : country.country)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                >
                  <span className="country-row__identity">
                    <Globe2 size={23} aria-hidden="true" />
                    <span>{country.countryName}</span>
                  </span>
                  <span className="country-row__summary">
                    {!isExpanded && (
                      <span>
                        {country.providers.length}{' '}
                        {country.providers.length === 1 ? 'service' : 'services'}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="provider-list" id={panelId}>
                    {country.providers.map((provider) => (
                      <a
                        key={`${provider.name}-${provider.url}`}
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="provider-row"
                      >
                        <PlayCircle size={27} aria-hidden="true" />
                        <span className="provider-row__label">
                          <strong>{provider.name}</strong>
                          <span>Open service</span>
                        </span>
                        <ExternalLink size={22} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {notAvailableIn.length > 0 && (
          <details className="unavailable-countries">
            <summary>Not found in {notAvailableIn.length} countries</summary>
            <p>{notAvailableIn.join(', ')}</p>
          </details>
        )}
      </section>
    </div>
  );
}
