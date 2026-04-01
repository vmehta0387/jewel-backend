interface AvatarProps {
  name: string | null | undefined;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function Avatar({ name, src, size = 'sm', className = '' }: AvatarProps) {
  const getInitials = (raw: string | null | undefined) => {
    const n = typeof raw === 'string' ? raw.trim() : '';
    if (!n) {
      return 'NA';
    }

    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0]?.charAt(0) || '';
      const last = parts[parts.length - 1]?.charAt(0) || '';
      const value = `${first}${last}`.trim();
      return (value || n.slice(0, 2)).toUpperCase();
    }

    return n.slice(0, 2).toUpperCase();
  };

  const safeName = typeof name === 'string' && name.trim() ? name.trim() : 'Unknown User';

  return (
    <div 
      className={`avatar-ring ${sizeClasses[size]} ${className}`.trim()}
      title={safeName}
    >
      {src ? (
        <img src={src} alt={safeName} className="h-full w-full object-cover" />
      ) : (
        <span className="avatar-text">{getInitials(name)}</span>
      )}
    </div>
  );
}
