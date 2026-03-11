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
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#81A6C6] text-white hover:bg-[#6f93b0] focus-visible:ring-[#AACDDC]',
    secondary: 'border border-[#D2C4B4] bg-[#F3E3D0] text-slate-800 hover:bg-[#e9d8c4] focus-visible:ring-[#AACDDC]',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300'
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
