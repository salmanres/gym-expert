import React, { useEffect } from 'react';

export default function AppModal({ 
    isOpen, 
    onClose, 
    title, 
    subtitle, 
    children, 
    footer,
    maxWidth = "sm:max-w-4xl",
    headerBg = "bg-slate-50/50",
    headerTextColor = "text-slate-800",
    icon: Icon
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
            <div className={`bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl ${maxWidth} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col`}>
                
                <div className={`px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center ${headerBg} shrink-0 sticky top-0 z-10`}>
                    <div className="flex items-center gap-3 min-w-0">
                        {Icon && (
                            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                <Icon size={18} />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${headerTextColor}`}>{title}</h2>
                            {subtitle && (
                                <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-wider truncate">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-full transition-colors border border-slate-200 shadow-xs focus:outline-none shrink-0"
                    >
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
