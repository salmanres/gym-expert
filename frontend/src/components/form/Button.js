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
    const baseStyle = "flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all text-sm outline-none focus:ring-2 focus:ring-offset-1";
    
    const variants = {
        primary: "text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
        secondary: "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 focus:ring-slate-200",
        danger: "text-white bg-rose-500 hover:bg-rose-600 focus:ring-rose-500",
        dangerOutline: "text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white focus:ring-rose-500",
        ghost: "text-slate-600 bg-transparent hover:bg-slate-100 shadow-none",
    };
    
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyle} ${variants[variant] || variants.primary} ${fullWidth ? 'w-full' : 'w-full sm:w-auto'} ${(disabled || loading) ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
        >
            {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
            ) : icon ? (
                <span className="text-lg shrink-0">{icon}</span>
            ) : null}
            {children}
        </button>
    );
}
