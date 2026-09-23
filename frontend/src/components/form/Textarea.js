import React from 'react';

export default function Textarea({ label, required, error, className = '', containerClassName = '', rows = 3, inputRef, ...props }) {
    return (
        <div className={`flex flex-col ${containerClassName}`}>
            {label && (
                <label className={`block text-[12px] font-bold mb-1.5 tracking-tight ${error ? 'text-rose-600' : 'text-slate-700'}`}>
                    {label} {required && <span className="text-[#CA0410] ml-0.5">*</span>}
                </label>
            )}
            <textarea 
                ref={inputRef}
                rows={rows}
                required={required}
                className={`w-full p-3.5 rounded-xl border ${
                    error 
                        ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 text-rose-950 placeholder:text-rose-300' 
                        : 'border-slate-200/90 bg-white hover:border-slate-300 focus:border-[#CA0410] focus:ring-4 focus:ring-rose-500/10 text-slate-800 placeholder:text-slate-400'
                } focus:bg-white outline-none text-[13px] font-medium shadow-2xs transition-all duration-150 resize-none ${className}`}
                {...props}
            />
            {error && <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">{error}</p>}
        </div>
    );
}
