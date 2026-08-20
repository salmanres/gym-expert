import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

export default function FollowUpCalendar({ leads, onSelectDate, selectedDate }) {
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
            cells.push(<div key={`empty-${i}`} className="h-14 sm:h-16 border border-slate-100 bg-slate-50/50"></div>);
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
                // Only active statuses
                if (['Converted', 'Lost'].includes(lead.status)) return false;
                
                // followUpDate from DB is typically ISO string 'YYYY-MM-DD...'
                const leadDateStr = typeof lead.followUpDate === 'string' 
                    ? lead.followUpDate.split('T')[0] 
                    : new Date(lead.followUpDate).toISOString().split('T')[0];
                    
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
                    className={`h-14 sm:h-16 border border-slate-100 p-1 flex flex-col relative cursor-pointer transition-all
                        ${isSelected ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500 z-10' : 'bg-white hover:bg-slate-50'}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-500 text-white' : 'text-slate-600'}`}>
                            {d}
                        </span>
                    </div>
                    {hasFollowUps && (
                        <div className="mt-auto flex justify-center pb-1">
                            <span className="flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                {followUps.length} call{followUps.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return cells;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <FiCalendar className="text-indigo-600" />
                    <h3 className="font-bold text-slate-800">Follow-up Calendar</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors">
                        <FiChevronLeft />
                    </button>
                    <span className="text-sm font-bold w-24 text-center text-slate-700">
                        {currentMonth.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors">
                        <FiChevronRight />
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-r border-slate-100 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 bg-white">
                {renderCells()}
            </div>

            {selectedDate && (
                <div className="p-3 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-800">
                        Showing follow-ups for {selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button onClick={() => onSelectDate(null)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                        Clear Filter
                    </button>
                </div>
            )}
        </div>
    );
}
