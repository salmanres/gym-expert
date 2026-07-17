import React from 'react';

export default function Tabs({ tabs, activeTab, onTabChange }) {
    return (
        <div className="flex items-center gap-6 px-4 border-b border-slate-200 bg-slate-50/50 shrink-0 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={`py-3 text-xs font-bold whitespace-nowrap transition-colors relative ${
                        activeTab === tab ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    {tab}
                    {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></span>
                    )}
                </button>
            ))}
        </div>
    );
}
