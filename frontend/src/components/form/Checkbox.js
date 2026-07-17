import React from 'react';

export default function Checkbox({ label, error, className = '', containerClassName = '', ...props }) {
    return (
        <div className={containerClassName}>
            <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer group">
                <input 
                    type="checkbox" 
                    className={`w-4 h-4 rounded border-slate-300 focus:ring-emerald-500 ${error ? 'text-rose-600 focus:ring-rose-500' : 'text-emerald-600 focus:ring-emerald-500'} ${className}`}
                    {...props}
                />
                {label && <span className={`transition-colors ${error ? 'text-rose-500 group-hover:text-rose-600' : 'group-hover:text-slate-900'}`}>{label}</span>}
            </label>
            {error && <p className="text-[10px] font-bold text-rose-500 mt-1">{error}</p>}
        </div>
    );
}
