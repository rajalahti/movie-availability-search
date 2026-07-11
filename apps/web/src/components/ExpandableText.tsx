import { useEffect, useState, type CSSProperties } from 'react';

interface Props {
  text?: string;
  collapsedLines?: number;
  className?: string;
  toggleThreshold?: number;
}

export function ExpandableText({
  text,
  collapsedLines = 2,
  className = '',
  toggleThreshold = 120,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [text]);

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
          className="mt-1 text-xs font-medium text-primary hover:text-red-400 transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
