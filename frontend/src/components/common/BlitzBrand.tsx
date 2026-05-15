interface BlitzBrandProps {
  compact?: boolean;
  className?: string;
  subtitle?: string;
}

export default function BlitzBrand({
  compact = false,
  className = '',
  subtitle = 'Built for closers',
}: BlitzBrandProps) {
  return (
    <div className={`blitz-brand ${compact ? 'blitz-brand-compact' : ''} ${className}`.trim()}>
      <div className="blitz-brand-row">
        <span className="blitz-bolt" aria-hidden>
          <svg className="blitz-bolt-icon" viewBox="0 0 24 24" fill="currentColor" focusable="false">
            <path d="M13.2 2.2 4.9 13.1c-.4.5 0 1.2.6 1.2h4l-1.1 7.5c-.1.7.8 1.1 1.3.6l8.3-10.9c.4-.5 0-1.2-.6-1.2h-4l1.1-7.5c.1-.7-.8-1.1-1.3-.6Z" />
          </svg>
        </span>
        <span className="blitz-wordmark">BLITZ NYC</span>
      </div>
      {!compact ? <span className="blitz-subtitle">{subtitle}</span> : null}
    </div>
  );
}
