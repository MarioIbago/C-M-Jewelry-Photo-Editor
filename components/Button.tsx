import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  loading = false,
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center transition-all duration-300 ease-out font-sans font-medium tracking-wide disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-white text-black hover:bg-gray-200 active:scale-95 px-6 py-3 rounded-md shadow-[0_0_15px_rgba(255,255,255,0.1)]",
    secondary: "bg-luxury-card border border-luxury-border text-white hover:border-luxury-silver hover:text-white hover:bg-luxury-charcoal active:scale-95 px-6 py-3 rounded-md",
    ghost: "bg-transparent text-gray-400 hover:text-white px-4 py-2",
    icon: "p-3 rounded-full bg-luxury-card border border-luxury-border text-white hover:bg-luxury-charcoal hover:border-luxury-silver transition-colors"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
};