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
                        className="group relative bg-white border border-rose-200/80 rounded-2xl p-3.5 sm:p-4 min-h-[94px] sm:min-h-[96px] gap-3.5 h-full shadow-2xs flex items-center min-w-0 cursor-default"
                    >
                        {/* Left Icon Container */}
                        {card.icon && (
                            <div className={`w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${card.bgClass || card.iconBg || 'bg-rose-50'} ${card.iconColor || 'text-[#CA0410]'}`}>
                                {card.icon}
                            </div>
                        )}

                        {/* Right Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p 
                                className={`text-xs sm:text-[13px] font-bold text-slate-600 leading-tight ${card.textColor || ''}`}
                                title={card.title}
                            >
                                {card.title}
                            </p>

                            {isCardLoading ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-3.5 h-3.5 border-2 border-rose-200 border-t-[#CA0410] rounded-full animate-spin shrink-0"></div>
                                    <span className="text-xs font-bold text-slate-400 animate-pulse">Loading...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                        <span 
                                            className={`font-black tracking-tight leading-none break-words ${
                                                isLongVal ? 'text-[18px] sm:text-[20px]' : isMediumVal ? 'text-[20px] sm:text-[22px]' : 'text-[22px] sm:text-[24px]'
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
                                            className="text-[11px] sm:text-[12px] text-slate-400 font-medium mt-0.5 leading-tight"
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
