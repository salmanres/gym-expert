
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiArrowLeft } from 'react-icons/fi';
import Button from '../form/Button';

export default function PageHeader({ title, subtitle, searchTerm, onSearchChange, onAdd, addLabel, showBack, action, className = '' }) {
    const navigate = useNavigate();

    return (
        <div className={`print:hidden relative flex flex-col lg:flex-row justify-between items-start lg:items-center px-6 py-4 md:px-8 md:py-4 bg-[#FAEEEF] shrink-0 gap-4 overflow-hidden ${className}`}>
            <div className="w-full lg:w-auto relative z-10 flex items-center gap-3.5">
                {showBack && (
                    <button onClick={() => navigate(-1)} className="p-2 mr-1 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg text-slate-500 hover:text-[#CA0410] hover:bg-rose-50 hover:border-[#CA0410] transition-all shadow-sm cursor-pointer" title="Go Back">
                        <FiArrowLeft size={18} />
                    </button>
                )}
                <div className="hidden sm:block w-1.5 h-10 bg-[#CA0410] rounded-full shadow-sm shadow-[#CA0410]/20"></div>
                <div>
                    <h1 className="text-2xl md:text-[26px] font-extrabold text-slate-900 tracking-tight leading-none">{title}</h1>
                    {subtitle && <p className="text-slate-500 text-sm mt-1.5 font-medium">{subtitle}</p>}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto relative z-10">
                {onSearchChange !== undefined && (
                    <div className="relative flex-1 sm:w-72 lg:w-80 group">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#CA0410] transition-colors text-lg" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl text-sm shadow-sm focus:bg-white focus:ring-4 focus:ring-[#CA0410]/10 focus:border-[#CA0410] outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                )}
                {onAdd && (
                    <Button onClick={onAdd} icon={<FiPlus />} className="py-2.5 px-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                        {addLabel || 'Add New'}
                    </Button>
                )}
                {action && action}
            </div>
        </div>
    );
}
