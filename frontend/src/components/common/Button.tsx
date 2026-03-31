interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold rounded-xl transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed hover-lift';
  
  const variants = {
    primary: 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 focus-visible:ring-indigo-500/50 shadow-sm border border-indigo-400/20',
    secondary: 'bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-md focus-visible:ring-slate-300 shadow-sm',
    danger: 'bg-gradient-to-tr from-rose-500 to-rose-600 text-white hover:shadow-lg hover:shadow-rose-500/30 focus-visible:ring-rose-500/50 shadow-sm border border-rose-400/20'
  };
  
  const sizes = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm min-w-[5.5rem]',
    lg: 'px-5 py-2.5 text-base min-w-[6rem]'
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
