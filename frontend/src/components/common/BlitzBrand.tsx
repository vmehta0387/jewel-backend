import iconImg from '../../assets/icon.png';

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
          <img src={iconImg} alt="Blitz Bolt" className="blitz-bolt-icon" />
        </span>
        <span className="blitz-wordmark">BLITZ NYC</span>
      </div>
      {!compact ? <span className="blitz-subtitle">{subtitle}</span> : null}
    </div>
  );
}
