import React from 'react';

export default function Button({ 
    children, 
    onClick, 
    type = 'button', 
    variant = 'primary', 
    className = '', 
    disabled = false, 
    icon = null,
    fullWidth = false,
    loading = false
}) {
    const baseStyle = "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-150 text-[13px] outline-none select-none";
    
    const variants = {
        primary: "text-white bg-[#CA0410] hover:bg-[#a8030d] active:scale-[0.98] shadow-xs hover:shadow-md hover:shadow-rose-900/15 focus:ring-4 focus:ring-rose-500/20 cursor-pointer",
        secondary: "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] shadow-2xs focus:ring-4 focus:ring-slate-100 cursor-pointer",
        danger: "text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] shadow-xs focus:ring-4 focus:ring-rose-500/20 cursor-pointer",
        dangerOutline: "text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white active:scale-[0.98] focus:ring-4 focus:ring-rose-500/20 cursor-pointer",
        ghost: "text-slate-600 bg-transparent hover:bg-slate-100/80 active:scale-[0.98] shadow-none cursor-pointer",
    };
    
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyle} ${variants[variant] || variants.primary} ${fullWidth ? 'w-full' : 'w-full sm:w-auto'} ${(disabled || loading) ? 'opacity-60 cursor-not-allowed !active:scale-100' : ''} ${className}`}
        >
            {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
            ) : icon ? (
                <span className="text-base shrink-0">{icon}</span>
            ) : null}
            {children}
        </button>
    );
}
