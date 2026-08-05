import React from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';

export default function FilterBar({ children, searchTerm, onSearchChange, searchPlaceholder = "Search..." }) {
    return (
        <div className="flex flex-col lg:flex-row gap-3 bg-slate-50 border-b border-slate-200 px-4 py-2.5 items-stretch lg:items-center justify-between overflow-x-auto custom-scrollbar w-full m-0">
            
            {/* Search Input */}
            {onSearchChange && (
                <div className="relative w-full lg:w-72 shrink-0">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => onSearchChange(e.target.value)} 
                        placeholder={searchPlaceholder} 
                        className="w-full pl-9 pr-4 h-9 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                    />
                </div>
            )}

            {/* Additional Filters - Guaranteed Single Line Row */}
            {children && (
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar shrink-0">
                    <div className="hidden lg:flex items-center justify-center w-9 h-9 bg-white rounded-lg border border-slate-200 text-slate-400 shrink-0">
                        <FiFilter />
                    </div>
                    {children}
                </div>
            )}
            
        </div>
    );
}
