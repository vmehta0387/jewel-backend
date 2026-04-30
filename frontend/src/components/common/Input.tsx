import { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[0.78rem] font-bold tracking-[0.17em] uppercase text-[#7e7368] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={currentType}
          className={`w-full px-4 py-3 bg-[#f3efea] border rounded-2xl focus:ring-2 focus:ring-[#cba86b]/35 focus:border-[#d3ba91] transition-all duration-200 hover:bg-[#f8f5ef] focus:bg-white font-semibold text-[#251d17] placeholder-[#a09384] outline-none ${
            error ? 'border-[#df9d9d] focus:border-[#c46f6f] focus:ring-[#c46f6f]/25 ring-1 ring-[#e5bbbb]' : 'border-[#ddd3c7] hover:border-[#cec1b2]'
          } ${isPassword ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#988c7d] hover:text-[#ab7f38] transition-colors focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a9.953 9.953 0 015.71-1.581c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-bold tracking-wide text-[#b34b4b]">{error}</p>}
    </div>
  );
}
