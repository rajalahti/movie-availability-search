import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { getFullDescription } from '../services/movieApi';

interface Props {
  title: string;
  year: number;
  shortDescription: string;
}

const collapsedStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 5,
  overflow: 'hidden',
};

export function MovieDescription({ title, year, shortDescription }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullDescriptionQuery = useQuery({
    queryKey: ['movies', 'description', title, year],
    queryFn: () => getFullDescription(title, year),
    enabled: isExpanded,
    staleTime: Infinity,
    retry: 1,
  });

  const fullDescription = fullDescriptionQuery.data?.description;
  const showVerifiedFullDescription = isExpanded && Boolean(fullDescription);
  const showCompleteShortSummary = isExpanded && fullDescriptionQuery.isError;
  const description = showVerifiedFullDescription
    ? fullDescription
    : shortDescription;

  function openFullDescription() {
    setIsExpanded(true);
  }

  function closeFullDescription() {
    setIsExpanded(false);
  }

  return (
    <div className="movie-description-block" aria-live="polite">
      {showVerifiedFullDescription && (
        <p className="movie-description-block__source">Full description · OMDb</p>
      )}

      <p
        key={showVerifiedFullDescription ? 'full' : 'short'}
        className={`movie-description ${showVerifiedFullDescription ? 'movie-description--full' : ''}`}
        style={
          showVerifiedFullDescription || showCompleteShortSummary
            ? undefined
            : collapsedStyle
        }
      >
        {description}
      </p>

      {!isExpanded && (
        <button
          type="button"
          className="expandable-text__toggle"
          onClick={openFullDescription}
          aria-expanded="false"
        >
          Read full description
        </button>
      )}

      {isExpanded && fullDescriptionQuery.isFetching && (
        <button
          type="button"
          className="expandable-text__toggle expandable-text__toggle--loading"
          disabled
          aria-expanded="true"
        >
          <Loader2 className="spin" size={16} aria-hidden="true" />
          Loading full description
        </button>
      )}

      {showVerifiedFullDescription && (
        <button
          type="button"
          className="expandable-text__toggle"
          onClick={closeFullDescription}
          aria-expanded="true"
        >
          Show less
        </button>
      )}

      {isExpanded && fullDescriptionQuery.isError && (
        <div className="movie-description-block__error" role="status">
          <span>The full description isn’t available right now.</span>
          <button type="button" onClick={() => void fullDescriptionQuery.refetch()}>
            Try again
          </button>
          <button type="button" onClick={closeFullDescription}>Show less</button>
        </div>
      )}
    </div>
  );
}
