import React from 'react';

export default function SummaryCards({ cards = [] }) {
    if (!cards || cards.length === 0) return null;

    const gridColsClass = cards.length === 4 
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

    return (
        <div className={`grid ${gridColsClass} gap-3 sm:gap-4 w-full`}>
            {cards.map((card, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div>
                        <p className={`text-xs font-extrabold uppercase tracking-wider ${card.textColor || 'text-slate-500'}`}>
                            {card.title}
                        </p>
                        <h3 className={`text-2xl font-black mt-0.5 ${card.valueColor || 'text-slate-800'}`}>
                            {card.value}
                        </h3>
                        {card.subtitle && (
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{card.subtitle}</p>
                        )}
                    </div>
                    {card.icon && (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold ${card.bgClass || 'bg-slate-100'} ${card.iconColor || 'text-slate-700'}`}>
                            {card.icon}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
