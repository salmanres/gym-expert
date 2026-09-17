import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiChevronRight as FiArrowNext } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';

export default function FollowUpCalendar({ leads = [], onSelectDate, selectedDate }) {
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const renderCells = () => {
        const cells = [];
        // Empty cells for the start of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(<div key={`empty-${i}`} className="h-9 sm:h-10 border border-rose-100/60 bg-rose-50/20"></div>);
        }

        // Days of the month
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            // Count follow-ups for this day
            const followUps = leads.filter(lead => {
                if (!lead.followUpDate) return false;
                if (['Converted', 'Lost'].includes(lead.status)) return false;
                
                const leadDateStr = typeof lead.followUpDate === 'string' && lead.followUpDate.includes('T')
                    ? lead.followUpDate.split('T')[0] 
                    : (typeof lead.followUpDate === 'string' 
                        ? lead.followUpDate 
                        : `${new Date(lead.followUpDate).getFullYear()}-${String(new Date(lead.followUpDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(lead.followUpDate).getDate()).padStart(2, '0')}`);
                    
                return leadDateStr === dateString;
            });

            const hasFollowUps = followUps.length > 0;
            
            const today = new Date();
            const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const isToday = todayString === dateString;
            
            let isSelected = false;
            if (selectedDate) {
                const selString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                isSelected = selString === dateString;
            }

            cells.push(
                <div 
                    key={d} 
                    onClick={() => onSelectDate(isSelected ? null : date)}
                    className={`h-9 sm:h-10 border border-rose-100/70 p-1 flex flex-col relative cursor-pointer transition-all
                        ${isSelected ? 'bg-rose-100/80 border-rose-300 ring-1 ring-[#CA0410] z-10' : 'bg-white hover:bg-rose-50/50'}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-[#CA0410] text-white shadow-2xs' : 'text-slate-700'}`}>
                            {d}
                        </span>
                    </div>
                    {hasFollowUps && (
                        <div className="mt-auto flex justify-center pb-0.5">
                            <span className="flex items-center justify-center bg-[#CA0410] text-white text-[8.5px] font-black px-1.5 py-0 rounded-full shadow-2xs">
                                {followUps.length}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return cells;
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xs border border-rose-200/80 overflow-hidden flex flex-col h-full justify-between">
            <div>
                {/* Card Header with Pink Badge and Month Navigation */}
                <div className="p-4 border-b border-rose-100/80 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#CA0410] flex items-center justify-center border border-rose-200/80 shrink-0 shadow-2xs">
                            <FiCalendar size={18} />
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Follow Up Calendar</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <button onClick={prevMonth} className="p-1 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                            <FiChevronLeft size={16} />
                        </button>
                        <span className="min-w-[70px] text-center text-xs font-bold text-slate-700">
                            {currentMonth.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                            <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>
                
                {/* Days of Week */}
                <div className="grid grid-cols-7 border-b border-rose-100/80 bg-rose-50/50">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <div key={day} className="py-1.5 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-r border-rose-100/60 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 bg-white">
                    {renderCells()}
                </div>
            </div>

            {selectedDate && (
                <div className="p-2.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#CA0410]">
                        Showing follow-ups for {formatDate(selectedDate)}
                    </span>
                    <button onClick={() => onSelectDate(null)} className="text-xs font-bold text-[#CA0410] hover:underline cursor-pointer">
                        Clear Filter
                    </button>
                </div>
            )}

            {/* Bottom Banner Strip from Figma */}
            <div className="bg-[#FFF0F2] border-t border-rose-200/70 p-3 px-4 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-slate-600 leading-tight">
                    Manage your follow-ups, appointments and member interaction
                </p>
                <button 
                    onClick={() => navigate('/dashboard/owner/leads')}
                    className="bg-[#CA0410] hover:bg-[#a8030d] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                    View all <FiArrowNext size={12} />
                </button>
            </div>
        </div>
    );
}
