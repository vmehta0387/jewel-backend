import { useState } from 'react';

type ExpandableTextProps = {
  text?: string | null;
  collapsedLength?: number;
  className?: string;
};

export default function ExpandableText({
  text,
  collapsedLength = 60,
  className = '',
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const value = String(text || '').trim();

  if (!value || value === '-') {
    return <span>-</span>;
  }

  const canExpand = value.length > collapsedLength;

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <span
        title={expanded ? undefined : value}
        style={
          canExpand && !expanded
            ? {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {value}
      </span>
      {canExpand ? (
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-amber-700 transition-colors hover:text-amber-900"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
          aria-expanded={expanded}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      ) : null}
    </div>
  );
}
