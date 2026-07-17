import React from 'react';

export default function FormSection({ title, icon, children, className }) {
    return (
        <div className="mb-8 last:mb-0">
            {title && (
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    {icon} {title}
                </h3>
            )}
            <div className={className || "grid grid-cols-1 md:grid-cols-3 gap-4"}>
                {children}
            </div>
        </div>
    );
}
