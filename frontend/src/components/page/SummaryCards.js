import React from 'react';

export default function SummaryCards({ cards = [], gridClassName = '' }) {
    if (!cards || cards.length === 0) return null;

    const defaultGridCols = cards.length === 6 
        ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
        : cards.length === 4 
            ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4' 
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

    return (
        <div className={`grid ${gridClassName || defaultGridCols} gap-3 sm:gap-4 w-full`}>
            {cards.map((card, idx) => (
                <div 
                    key={idx} 
                    className="p-4 bg-[#FEFFFE] rounded-[12px] shadow-[0px_4px_4px_rgba(0,0,0,0.08)] flex items-center gap-3 min-w-0 h-[100px]"
                >
                    {/* Left Icon Container */}
                    {card.icon && (
                        <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center text-xl shrink-0 ${card.bgClass || 'bg-slate-100'} ${card.iconColor || 'text-slate-700'}`}>
                            {card.icon}
                        </div>
                    )}

                    {/* Right Content */}
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium text-slate-700 truncate ${card.textColor || ''}`}>
                            {card.title}
                        </p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className={`text-2xl font-bold tracking-tight ${card.valueColor || 'text-slate-900'}`}>
                                {card.value}
                            </span>
                            {card.percentage && (
                                <span className={`text-xs font-semibold ${card.percentageColor || 'text-emerald-600'}`}>
                                    {card.percentage}
                                </span>
                            )}
                        </div>
                        {card.subtitle && (
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">
                                {card.subtitle}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
