import React from 'react';

export default function SummaryCards({ cards = [], gridClassName = '', loading = false }) {
    if (!cards || cards.length === 0) return null;

    const defaultGridCols = cards.length === 6
        ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6'
        : cards.length === 5
            ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'
            : cards.length === 4
                ? 'grid-cols-2 lg:grid-cols-4'
                : cards.length === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

    return (
        <div className={`grid ${gridClassName || defaultGridCols} gap-3.5 sm:gap-4 w-full select-none items-stretch`}>
            {cards.map((card, idx) => {
                const valStr = String(card.value ?? '');
                const isLongVal = valStr.length > 8;
                const isMediumVal = valStr.length > 5;
                const isCardLoading = loading || card.loading;

                return (
                    <div
                        key={idx}
                        className="group relative bg-white border border-rose-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[105px] sm:min-h-[112px] gap-4 h-full shadow-2xs flex items-center min-w-0 cursor-default"
                    >
                        {/* Left Icon Container */}
                        {card.icon && (
                            <div className={`w-12 h-12 sm:w-13 sm:h-13 text-xl sm:text-2xl rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${card.bgClass || card.iconBg || 'bg-rose-50'} ${card.iconColor || 'text-[#CA0410]'}`}>
                                {card.icon}
                            </div>
                        )}

                        {/* Right Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p 
                                className={`text-[13px] sm:text-[14px] font-bold text-slate-600 leading-tight ${card.textColor || ''}`}
                                title={card.title}
                            >
                                {card.title}
                            </p>

                            {isCardLoading ? (
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="w-4 h-4 border-2 border-rose-200 border-t-[#CA0410] rounded-full animate-spin shrink-0"></div>
                                    <span className="text-xs font-bold text-slate-400 animate-pulse">Loading...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mt-1 min-w-0">
                                        <span 
                                            className={`font-black tracking-tight leading-none break-words ${
                                                isLongVal ? 'text-[20px] sm:text-[22px]' : isMediumVal ? 'text-[22px] sm:text-[25px]' : 'text-[25px] sm:text-[28px]'
                                            } ${card.valueColor || 'text-slate-900'}`}
                                            title={valStr}
                                        >
                                            {card.value}
                                        </span>
                                        {card.percentage && (
                                            <span className={`text-[10.5px] sm:text-[11.5px] font-bold px-2 py-0.5 rounded-md leading-none shadow-2xs shrink-0 whitespace-nowrap ${
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
                                            className="text-[12px] sm:text-[12.5px] text-slate-400 font-medium mt-1 leading-tight"
                                            title={card.subtitle}
                                        >
                                            {card.subtitle}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
