import { useState, type CSSProperties } from 'react';

interface Props {
  text?: string;
  collapsedLines?: number;
  className?: string;
  toggleThreshold?: number;
  moreLabel?: string;
  lessLabel?: string;
}

export function ExpandableText({
  text,
  collapsedLines = 2,
  className = '',
  toggleThreshold = 120,
  moreLabel = 'Show more',
  lessLabel = 'Show less',
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) {
    return null;
  }

  const showToggle = text.trim().length > toggleThreshold;
  const collapsedStyle: CSSProperties | undefined = !isExpanded
    ? {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: collapsedLines,
        overflow: 'hidden',
      }
    : undefined;

  return (
    <div>
      <p className={className} style={collapsedStyle}>
        {text}
      </p>

      {showToggle && (
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="expandable-text__toggle"
          aria-expanded={isExpanded}
        >
          {isExpanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
