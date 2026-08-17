import React from 'react';
import { FiCalendar, FiSettings, FiInfo, FiPlus, FiTrash2 } from 'react-icons/fi';
import FormSection from '../../../components/form/FormSection';
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
            <FormSection title="Weekly Off" icon={<FiCalendar />} className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2 -mt-2">
                    <p className="text-sm text-slate-500">Select the days when the gym remains closed (No attendance allowed).</p>
                    <div className="flex flex-wrap gap-4 mt-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                            <label key={day} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.weeklyOff.includes(day)}
                                    onChange={() => handleWeeklyOffChange(day)}
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                                />
                                <span className="text-sm font-bold text-slate-700">{day}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </FormSection>

            <FormSection title="Working Hours" icon={<FiSettings />} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-full">
                    <p className="text-sm text-slate-500 -mt-2 mb-2">Define standard working hours (helpful for staff shifts).</p>
                </div>
                <Input 
                    type="time"
                    label="Start Time" 
                    name="start" 
                    value={settings.workingHours.start} 
                    onChange={handleWorkingHoursChange} 
                />
                <Input 
                    type="time"
                    label="End Time" 
                    name="end" 
                    value={settings.workingHours.end} 
                    onChange={handleWorkingHoursChange} 
                />
            </FormSection>

            <FormSection title="Holidays" icon={<FiInfo />} className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between -mt-2 mb-2">
                    <p className="text-sm text-slate-500">Specific dates when the gym is closed (e.g., Independence Day).</p>
                    <button type="button" onClick={addHoliday} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-100 flex items-center gap-1">
                        <FiPlus /> Add Holiday
                    </button>
                </div>
                
                <div className="space-y-3">
                    {settings.holidays.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No holidays added.</p>
                    ) : (
                        settings.holidays.map((h, i) => (
                            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                                <div className="w-full sm:w-1/3">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                                    <input 
                                        type="date"
                                        value={h.date ? new Date(h.date).toISOString().split('T')[0] : ''}
                                        onChange={(e) => updateHoliday(i, 'date', e.target.value)}
                                        className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div className="w-full sm:w-2/3 flex items-end gap-3">
                                    <div className="w-full">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Festival Name</label>
                                        <input 
                                            type="text"
                                            value={h.reason}
                                            onChange={(e) => updateHoliday(i, 'reason', e.target.value)}
                                            placeholder="e.g. Diwali, Independence Day"
                                            className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => removeHoliday(i)} 
                                        className="h-10 px-3 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg"
                                        title="Remove Holiday"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </FormSection>
        </div>
    );
}
