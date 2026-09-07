import React from 'react';

export default function Tabs({ tabs, activeTab, onTabChange, bgClass = 'bg-[#EEEEEE]' }) {
    return (
        <div className={`flex items-center gap-6 px-4 sm:px-6 ${bgClass} shrink-0 overflow-x-auto custom-scrollbar border-b border-slate-200/80`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`py-3 text-xs sm:text-sm font-bold whitespace-nowrap transition-all relative ${
                            isActive ? 'text-[#CA0410]' : 'text-slate-700 hover:text-slate-900'
                        }`}
                    >
                        {tab}
                        {isActive && (
                            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#CA0410] rounded-t-full"></span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
