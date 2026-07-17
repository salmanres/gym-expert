import React from 'react';

export default function Select({ label, required, error, options = [], children, className = '', containerClassName = '', ...props }) {
    return (
        <div className={containerClassName}>
            {label && (
                <label className={`block text-xs font-bold mb-1.5 ${error ? 'text-rose-600' : 'text-slate-600'}`}>
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            <select 
                required={required}
                className={`w-full px-3 py-2 rounded-lg border ${error ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900' : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-slate-800'} focus:bg-white focus:ring-2 outline-none text-sm transition-all font-medium ${className}`}
                {...props}
            >
                {children}
                {options.map((opt, i) => {
                    const value = typeof opt === 'object' ? opt.value : opt;
                    const displayLabel = typeof opt === 'object' ? opt.label : opt;
                    return <option key={i} value={value}>{displayLabel}</option>;
                })}
            </select>
            {error && <p className="text-[10px] font-bold text-rose-500 mt-1">{error}</p>}
        </div>
    );
}
