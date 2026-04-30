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
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-[14px] transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed hover-lift';
  
  const variants = {
    primary: 'bg-[#171311] text-white hover:bg-[#2a221d] focus-visible:ring-[#b98e45]/40 shadow-sm border border-[#171311]',
    secondary: 'bg-[#f7f2ea] border border-[#d8c8b3] text-[#5f5347] hover:bg-[#efe5d6] hover:text-[#2f2620] focus-visible:ring-[#d7c6aa] shadow-sm',
    danger: 'bg-[#b34b4b] text-white hover:bg-[#9f3f3f] focus-visible:ring-[#b34b4b]/45 shadow-sm border border-[#a34242]'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-w-[5rem]',
    md: 'px-4 py-2 text-sm min-w-[5.5rem]',
    lg: 'px-5 py-2.5 text-sm min-w-[6.25rem]'
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
