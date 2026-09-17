import React from 'react';
import { FiCalendar, FiClock, FiInfo, FiPlus, FiTrash2 } from 'react-icons/fi';
import Input from '../../../components/form/Input';

export default function ScheduleTab({ 
    settings, 
    handleWeeklyOffChange, 
    handleWorkingHoursChange, 
    addHoliday, 
    updateHoliday, 
    removeHoliday 
}) {
    return (
        <div className="space-y-6">
            {/* 1. WEEKLY OFF CARD */}
            <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center font-bold text-sm shadow-2xs">
                        <FiCalendar size={15} />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 leading-none">Weekly Off Days</h3>
                        <p className="text-[11.5px] text-slate-500 font-normal mt-1 leading-none">Select recurring days when the gym remains closed for workouts</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                        const isSelected = settings.weeklyOff.includes(day);
                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleWeeklyOffChange(day)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border select-none shadow-2xs cursor-pointer active:scale-95 ${
                                    isSelected 
                                        ? 'bg-rose-50 text-[#CA0410] border-[#CA0410]' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-rose-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#CA0410]' : 'bg-slate-300'}`}></span>
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. WORKING HOURS CARD */}
            <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center font-bold text-sm shadow-2xs">
                        <FiClock size={15} />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 leading-none">Gym Operating Hours</h3>
                        <p className="text-[11.5px] text-slate-500 font-normal mt-1 leading-none">Standard opening and closing timings for gym members & staff shifts</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input 
                        type="time"
                        label="Daily Opening Time" 
                        name="start" 
                        value={settings.workingHours.start} 
                        onChange={handleWorkingHoursChange} 
                    />
                    <Input 
                        type="time"
                        label="Daily Closing Time" 
                        name="end" 
                        value={settings.workingHours.end} 
                        onChange={handleWorkingHoursChange} 
                    />
                </div>
            </div>

            {/* 3. HOLIDAYS & SPECIAL CLOSURES CARD */}
            <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center font-bold text-sm shadow-2xs">
                            <FiInfo size={15} />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 leading-none">Festival & Annual Holidays</h3>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-1 leading-none">Specific dates when gym operations are suspended</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={addHoliday} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#CA0410] hover:bg-[#a8030d] text-white font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 w-max cursor-pointer"
                    >
                        <FiPlus /> Add Holiday
                    </button>
                </div>
                
                <div className="space-y-3">
                    {settings.holidays.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs font-medium">
                            No special holidays added yet. Click "Add Holiday" to register upcoming closures.
                        </div>
                    ) : (
                        settings.holidays.map((h, i) => (
                            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-4 bg-rose-50/20 rounded-xl border border-rose-200/60 relative">
                                <div className="w-full sm:w-1/3">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Holiday Date</label>
                                    <input 
                                        type="date"
                                        value={h.date ? new Date(h.date).toISOString().split('T')[0] : ''}
                                        onChange={(e) => updateHoliday(i, 'date', e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20"
                                    />
                                </div>
                                <div className="w-full sm:w-2/3 flex items-end gap-2.5">
                                    <div className="w-full">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Occasion / Festival Name</label>
                                        <input 
                                            type="text"
                                            value={h.reason}
                                            onChange={(e) => updateHoliday(i, 'reason', e.target.value)}
                                            placeholder="e.g. Diwali, Independence Day, Maintenance"
                                            className="w-full h-9 px-3 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => removeHoliday(i)} 
                                        className="h-9 w-9 flex items-center justify-center text-[#CA0410] bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 shrink-0 transition-colors cursor-pointer"
                                        title="Remove Holiday"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
