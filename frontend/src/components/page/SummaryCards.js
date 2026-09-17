import React from 'react';

export default function SummaryCards({ cards = [], gridClassName = '' }) {
    if (!cards || cards.length === 0) return null;

    const isDense = cards.length > 4;

    const defaultGridCols = cards.length === 6
        ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
        : cards.length === 5
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            : cards.length === 4
                ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
                : cards.length === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

    return (
        <div className={`grid ${gridClassName || defaultGridCols} ${isDense ? 'gap-2.5 sm:gap-3' : 'gap-3 sm:gap-4'} w-full select-none`}>
            {cards.map((card, idx) => {
                const valStr = String(card.value ?? '');
                const isLongVal = valStr.length > 8;
                const isMediumVal = valStr.length > 5;

                return (
                    <div
                        key={idx}
                        className={`group relative bg-white border border-rose-200/70 rounded-2xl ${
                            isDense ? 'p-2.5 sm:p-3 min-h-[80px] gap-2.5' : 'p-3 sm:p-3.5 min-h-[88px] gap-3'
                        } shadow-2xs hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 flex items-center min-w-0 transition-all duration-300 cursor-default`}
                    >
                        {/* Left Icon Container */}
                        {card.icon && (
                            <div className={`${
                                isDense ? 'w-9 h-9 sm:w-10 sm:h-10 text-base sm:text-lg' : 'w-10 h-10 sm:w-11 sm:h-11 text-lg sm:text-xl'
                            } rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all duration-300 ${card.bgClass || 'bg-rose-50'} ${card.iconColor || 'text-[#CA0410]'}`}>
                                {card.icon}
                            </div>
                        )}

                        {/* Right Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p 
                                className={`${
                                    isDense ? 'text-[11.5px] sm:text-[12px]' : 'text-[12.5px] sm:text-[13px]'
                                } font-bold text-slate-700 group-hover:text-slate-900 leading-snug transition-colors truncate ${card.textColor || ''}`}
                                title={card.title}
                            >
                                {card.title}
                            </p>

                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                <span 
                                    className={`font-black tracking-tight leading-none group-hover:text-slate-950 transition-colors ${
                                        isDense
                                            ? (isLongVal ? 'text-[16px] sm:text-[17px]' : isMediumVal ? 'text-[17px] sm:text-[19px]' : 'text-[19px] sm:text-[21px]')
                                            : (isLongVal ? 'text-[18px] sm:text-[20px]' : isMediumVal ? 'text-[20px] sm:text-[22px]' : 'text-[22px] sm:text-[24px]')
                                    } ${card.valueColor || 'text-slate-900'}`}
                                    title={valStr}
                                >
                                    {card.value}
                                </span>
                                {card.percentage && (
                                    <span className={`text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded leading-none shadow-2xs shrink-0 whitespace-nowrap ${
                                        card.percentage.includes('↓') || card.percentageColor?.includes('rose') || card.percentageColor?.includes('red')
                                            ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                                            : card.percentageColor?.includes('purple')
                                                ? 'bg-purple-50 text-purple-600 border border-purple-200/60'
                                                : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                                    }`}>
                                        {card.percentage}
                                    </span>
                                )}
                            </div>

                            {card.subtitle && (
                                <p 
                                    className={`${
                                        isDense ? 'text-[10.5px] sm:text-[11px]' : 'text-[11.5px]'
                                    } text-slate-500 group-hover:text-slate-600 font-normal mt-0.5 truncate transition-colors leading-tight`}
                                    title={card.subtitle}
                                >
                                    {card.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
