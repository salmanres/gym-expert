import React from 'react';

export default function Loader({ fullScreen = false, text = 'Loading...', size = 'md', className = '' }) {
    
    const sizes = {
        sm: 'h-6 w-6 border-2',
        md: 'h-10 w-10 border-[3.5px]',
        lg: 'h-14 w-14 border-4'
    };
    
    const loaderContent = (
        <div className="flex flex-col justify-center items-center gap-3 select-none">
            <div className={`animate-spin rounded-full ${sizes[size]} border-slate-200 border-t-[#CA0410]`}></div>
            {text && (
                <span className="text-xs sm:text-sm font-bold text-slate-600 tracking-wide animate-pulse">
                    {text}
                </span>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAEEEF]/80 backdrop-blur-sm">
                {loaderContent}
            </div>
        );
    }

    return (
        <div className={`flex justify-center items-center h-full w-full flex-1 p-8 min-h-[350px] bg-[#FAEEEF] ${className}`}>
            {loaderContent}
        </div>
    );
}
