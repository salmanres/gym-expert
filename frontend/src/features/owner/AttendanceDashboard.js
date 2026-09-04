import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import EmptyState from '../../components/page/EmptyState';
import Loader from '../../components/page/Loader';
import Tabs from '../../components/page/Tabs';
import { FiCheckCircle, FiXCircle, FiClock, FiUserCheck, FiPhone, FiX } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from '../../utils/toast';

export default function AttendanceDashboard() {
    const [sheet, setSheet] = useState([]);
    const [gymStatus, setGymStatus] = useState({ isClosed: false, closedReason: '' });
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState('Members');
    
    const fetchSheet = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/attendance/daily-sheet?date=${selectedDate}&type=${activeTab.toLowerCase()}`);
            setSheet(res.data.sheet || []);
            setGymStatus({
                isClosed: res.data.isClosed || false,
                closedReason: res.data.closedReason || ''
            });
        } catch (error) {
            toast.error("Failed to load attendance sheet");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSheet();
    }, [selectedDate, activeTab]);

    const handleMarkAttendance = async (userId, status) => {
        try {
            const res = await apiClient.post('/attendance/mark', {
                userId,
                status,
                source: 'Manual',
                date: selectedDate
            });
            toast.success(res.data.message);
            // Quick local state update to reflect changes immediately
            setSheet(sheet.map(item => {
                if (item.user._id === userId) {
                    return { ...item, attendance: res.data.attendance };
                }
                return item;
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to mark attendance");
        }
    };

    const calculateWorkHours = (checkInTime, checkOutTime) => {
        if (!checkInTime) return '-';
        
        const end = checkOutTime ? new Date(checkOutTime) : new Date();
        const start = new Date(checkInTime);
        
        const diffMins = Math.max(0, Math.floor((end - start) / (1000 * 60)));
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        if (checkOutTime) {
            return `${hrs}h ${mins}m`;
        } else {
            return `${hrs}h ${mins}m (Active)`;
        }
    };

    const columns = activeTab === 'Staff' ? [
        { label: 'Person' },
        { label: 'Contact' },
        { label: 'Shift Hours' },
        { label: 'Status' },
        { label: 'Check In' },
        { label: 'Check Out' },
        { label: 'Working Hours' },
        { label: 'Late Deduction' },
        { label: 'Action', className: 'text-center' }
    ] : [
        { label: 'Person' },
        { label: 'Contact' },
        { label: 'Status' },
        { label: 'Check In' },
        { label: 'Check Out' },
        { label: 'Workout Hours' },
        { label: 'Action', className: 'text-center' }
    ];

    const renderRow = (item) => {
        const { user, attendance } = item;
        let currentStatus = attendance?.status || 'Unmarked';
        
        const todayStr = new Date().toISOString().split('T')[0];
        const isPastDate = selectedDate < todayStr;
        
        // Check for holiday/weekly off
        if (currentStatus === 'Unmarked' && gymStatus.isClosed) {
            currentStatus = 'Holiday';
        } else if (currentStatus === 'Unmarked' && isPastDate) {
            currentStatus = 'Absent';
        }

        const isStaffTab = activeTab === 'Staff';
        const workHoursStr = calculateWorkHours(attendance?.checkInTime, attendance?.checkOutTime);
        
        return (
            <tr key={user._id} className="hover:bg-slate-50 transition-colors group">
                <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                        {user.profilePhoto ? (
                            <img src={user.profilePhoto} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shadow-sm border border-slate-200 shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                            {isStaffTab && user.role && (
                                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">{user.role}</p>
                            )}
                        </div>
                    </div>
                </td>
                <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <FiPhone className="text-emerald-500 shrink-0" /> {user.phone || 'N/A'}
                    </div>
                </td>
                {isStaffTab && (
                    <td className="py-3 px-4">
                        {user.shiftStart && user.shiftEnd ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200">
                                <FiClock className="text-slate-500" /> {user.shiftStart} - {user.shiftEnd}
                            </span>
                        ) : (
                            <span className="text-xs text-slate-400 font-medium">Not set</span>
                        )}
                    </td>
                )}
                <td className="py-3 px-4">
                    {currentStatus === 'Present' && <span className="inline-flex px-2 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 rounded text-xs font-bold uppercase tracking-wide border">Present</span>}
                    {currentStatus === 'Absent' && <span className="inline-flex px-2 py-1 bg-rose-50 text-rose-700 border-rose-200 rounded text-xs font-bold uppercase tracking-wide border">Absent</span>}
                    {currentStatus === 'Late' && <span className="inline-flex px-2 py-1 bg-amber-50 text-amber-700 border-amber-200 rounded text-xs font-bold uppercase tracking-wide border">Late</span>}
                    {currentStatus === 'Half-Day' && <span className="inline-flex px-2 py-1 bg-orange-50 text-orange-700 border-orange-200 rounded text-xs font-bold uppercase tracking-wide border">Half-Day</span>}
                    {currentStatus === 'Holiday' && <span className="inline-flex px-2 py-1 bg-indigo-50 text-indigo-700 border-indigo-200 rounded text-xs font-bold uppercase tracking-wide border">Off ({gymStatus.closedReason})</span>}
                    {currentStatus === 'Unmarked' && <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-500 border-slate-200 rounded text-xs font-bold uppercase tracking-wide border">Not Marked</span>}
                </td>
                <td className="py-3 px-4">
                    {attendance?.checkInTime ? (
                         <span className="text-sm text-slate-700 font-bold">
                             {new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                    ) : '-'}
                </td>
                <td className="py-3 px-4">
                    {attendance?.checkOutTime ? (
                         <span className="text-sm text-slate-700 font-bold">
                             {new Date(attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                    ) : '-'}
                </td>
                <td className="py-3 px-4">
                    {attendance?.checkInTime ? (
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-extrabold ${attendance?.checkOutTime ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'}`}>
                            {workHoursStr}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400 font-medium">-</span>
                    )}
                </td>
                {isStaffTab && (
                    <td className="py-3 px-4">
                        {attendance?.lateMinutes > 0 ? (
                            <div className="inline-flex flex-col bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                                <span className="text-[11px] font-bold text-rose-700">{attendance.lateMinutes} mins late</span>
                                <span className="text-xs font-black text-rose-600">-₹{attendance.deductionAmount ? attendance.deductionAmount.toFixed(2) : '0.00'}</span>
                            </div>
                        ) : (
                            <span className="text-xs text-slate-400 font-medium">No deduction</span>
                        )}
                    </td>
                )}
                <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {!(selectedDate > todayStr) && (
                            <>
                                {(currentStatus === 'Unmarked' || currentStatus === 'Absent' || currentStatus === 'Holiday') && (
                            <button 
                                onClick={() => handleMarkAttendance(user._id, 'Present')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors shadow-sm text-xs font-bold"
                                title="Mark Present"
                            >
                                <FiCheckCircle /> Present
                            </button>
                        )}

                        {(currentStatus === 'Unmarked' || currentStatus === 'Holiday') && (
                            <button 
                                onClick={() => handleMarkAttendance(user._id, 'Absent')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors shadow-sm text-xs font-bold"
                                title="Mark Absent"
                            >
                                <FiXCircle /> Absent
                            </button>
                        )}

                        {currentStatus === 'Present' && !attendance?.checkOutTime && (
                            <button 
                                onClick={() => handleMarkAttendance(user._id, null)} // null status triggers standard check-out flow
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors shadow-sm text-xs font-bold"
                                title="Check Out"
                            >
                                <FiClock /> Check Out
                            </button>
                        )}
                        
                        {(currentStatus === 'Present' || currentStatus === 'Late') && attendance?.checkOutTime && (
                             <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded">Completed</span>
                        )}
                        
                        {currentStatus !== 'Absent' && currentStatus !== 'Unmarked' && (
                            <button 
                                onClick={() => handleMarkAttendance(user._id, 'Absent')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors shadow-sm text-xs font-bold"
                                title="Override to Absent"
                            >
                                    <FiXCircle /> 
                                </button>
                            )}

                        {currentStatus !== 'Unmarked' && (
                            <button 
                                onClick={() => handleMarkAttendance(user._id, 'Clear')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors shadow-sm text-xs font-bold"
                                title="Clear Attendance"
                            >
                                <FiX /> 
                            </button>
                        )}
                            </>
                        )}
                        {(selectedDate > todayStr) && (
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Future Date</span>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    if (loading && sheet.length === 0) return <Loader text="Loading attendance sheet..." />;

    return (
        <PageLayout>
            <PageHeader 
                title="Daily Attendance Dashboard" 
                subtitle="View and manually override attendance for your members or staff."
            />

            <Tabs 
                tabs={['Members', 'Staff', 'Trial']} 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
            />

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
                {gymStatus.isClosed && (
                    <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div>
                            <h4 className="text-indigo-900 font-extrabold text-sm flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                                Gym is Closed Today
                            </h4>
                            <p className="text-indigo-700 text-xs font-medium mt-1">
                                Reason: <strong className="font-extrabold">{gymStatus.closedReason}</strong>. All unmarked attendance is displayed as "Off".
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Select Date</label>
                            <input 
                                type="date" 
                                value={selectedDate}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium w-full sm:w-auto"
                            />
                        </div>
                    </div>
                    {/* Metrics for the day could go here */}
                    <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-emerald-50 rounded-lg">
                            <div className="text-xl font-black text-emerald-600">{sheet.filter(s => s.attendance?.status === 'Present').length}</div>
                            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Present</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-rose-50 rounded-lg">
                            <div className="text-xl font-black text-rose-600">{sheet.filter(s => {
                                const currentStatus = s.attendance?.status || 'Unmarked';
                                const todayStr = new Date().toISOString().split('T')[0];
                                return currentStatus === 'Absent' || (!gymStatus.isClosed && currentStatus === 'Unmarked' && selectedDate < todayStr);
                            }).length}</div>
                            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Absent</div>
                        </div>
                        {gymStatus.isClosed && (
                            <div className="text-center px-4 py-2 bg-indigo-50 rounded-lg">
                                <div className="text-xl font-black text-indigo-600">{sheet.filter(s => !s.attendance?.status).length}</div>
                                <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Off</div>
                            </div>
                        )}
                    </div>
                </div>

                {sheet.length > 0 ? (
                    <DataTable 
                        columns={columns} 
                        data={sheet} 
                        loading={loading}
                        emptyMessage="No records found."
                        renderRow={renderRow} 
                    />
                ) : (
                    <EmptyState 
                        icon={<FiUserCheck size={48} />}
                        title={`No ${activeTab} found`}
                        description={`There are no active ${activeTab} to display.`}
                    />
                )}
            </div>
        </PageLayout>
    );
}
