import React from 'react';

export default function Tabs({ tabs, activeTab, onTabChange, bgClass = 'bg-[#FAEEEF]' }) {
    return (
        <div className={`flex items-center gap-5 sm:gap-7 px-6 md:px-8 ${bgClass} shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-b border-slate-200/80`}>
            {tabs.map((tabItem) => {
                const tabKey = typeof tabItem === 'object' ? (tabItem.key || tabItem.id || tabItem.name || tabItem.label || tabItem.value) : tabItem;
                const tabLabel = typeof tabItem === 'object' ? (tabItem.label || tabItem.name || tabItem.title || tabItem.value) : tabItem;
                const isActive = activeTab === tabKey || activeTab === tabLabel;

                return (
                    <button
                        key={tabKey}
                        onClick={() => onTabChange(tabKey)}
                        className={`py-2.5 px-1 uppercase tracking-wider text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 relative cursor-pointer flex items-center gap-1.5 ${isActive ? 'text-[#CA0410]' : 'text-slate-600 hover:text-[#CA0410]/85 hover:-translate-y-0.5'
                            }`}
                    >
                        <span>{tabLabel}</span>
                        {typeof tabItem === 'object' && tabItem.count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-[#CA0410]/10 text-[#CA0410]' : 'bg-slate-200/70 text-slate-600'
                                }`}>
                                {tabItem.count}
                            </span>
                        )}
                        {isActive && (
                            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#CA0410] rounded-t-full"></span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}



