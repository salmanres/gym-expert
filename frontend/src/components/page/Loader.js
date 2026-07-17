import React from 'react';

export default function Loader({ fullScreen = false, text = 'Loading...', size = 'md' }) {
    
    const sizes = {
        sm: 'h-6 w-6 border-2',
        md: 'h-10 w-10 border-3',
        lg: 'h-16 w-16 border-4'
    };
    
    const loaderContent = (
        <div className="flex flex-col justify-center items-center gap-3">
            <div className={`animate-spin rounded-full ${sizes[size]} border-slate-100 border-t-emerald-600`}></div>
            {text && <span className="text-sm font-bold text-slate-500 animate-pulse">{text}</span>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                {loaderContent}
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-full w-full flex-1 p-8">
            {loaderContent}
        </div>
    );
}
