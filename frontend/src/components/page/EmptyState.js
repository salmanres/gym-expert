import React from 'react';

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 h-full min-h-[300px] text-center">
            <div className="text-slate-300 mb-4 flex justify-center">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">{description}</p>
            {actionLabel && onAction && (
                <button 
                    onClick={onAction}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
