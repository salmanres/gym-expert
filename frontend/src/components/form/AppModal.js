import React from 'react';

export default function AppModal({ isOpen, onClose, title, subtitle, children, footer }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
                        {subtitle && (
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2.5 rounded-full transition-colors border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <div className="p-4 sm:p-6">
                        {children}
                    </div>
                </div>
                
                {footer && (
                    <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 shrink-0 gap-4 sticky bottom-0 z-10">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
