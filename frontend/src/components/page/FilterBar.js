import React from 'react';
import { FiSearch } from 'react-icons/fi';

export default function FilterBar({ children, searchTerm, onSearchChange, searchPlaceholder = "Search by name, phone or keyword..." }) {
    return (
        <div className="flex flex-col lg:flex-row gap-3 bg-[#FAEEEF] px-6 md:px-8 py-2.5 items-stretch lg:items-center justify-between overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full m-0 shrink-0">
            {/* Search Input - Increased Width & Fixed Icon */}
            {onSearchChange && (
                <div className="relative w-full sm:w-80 md:w-96 lg:w-[420px] shrink-0">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base z-10 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-10 pr-4 h-9 bg-white/90 backdrop-blur-md border border-rose-200/80 hover:border-rose-300 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 shadow-2xs hover:shadow-xs transition-all duration-200"
                    />
                </div>
            )}

            {/* Additional Filters - No scrollbar */}
            {children && (
                <div className="flex items-center gap-2.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
}
