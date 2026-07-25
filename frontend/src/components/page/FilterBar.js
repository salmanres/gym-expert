import React from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';

export default function FilterBar({ children, searchTerm, onSearchChange, searchPlaceholder = "Search..." }) {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 items-start md:items-center justify-between">
            
            {/* Search Input */}
            {onSearchChange && (
                <div className="relative w-full md:max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => onSearchChange(e.target.value)} 
                        placeholder={searchPlaceholder} 
                        className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
                    />
                </div>
            )}

            {/* Additional Filters */}
            {children && (
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="hidden md:flex items-center justify-center w-10 h-10 bg-slate-50 rounded-lg border border-slate-100 text-slate-400">
                        <FiFilter />
                    </div>
                    {children}
                </div>
            )}
            
        </div>
    );
}
