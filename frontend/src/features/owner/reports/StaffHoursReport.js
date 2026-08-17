import React, { useState, useEffect } from 'react';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiUsers, FiCheckCircle, FiClock, FiActivity, FiEye, FiX, FiCalendar } from 'react-icons/fi';
import apiClient from '../../../api/apiClient';

export default function StaffHoursReport({ 
    staffAttendance = []
}) {
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [modalStartDate, setModalStartDate] = useState('');
    const [modalEndDate, setModalEndDate] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [fetchedLogs, setFetchedLogs] = useState([]);

    const fetchLogs = async (staff, start, end) => {
        if (!staff) return;
        setLoadingLogs(true);
        try {
            const userId = staff.user?._id || staff.userId?._id || staff._id;
            let url = `/attendance/history/${userId}`;
            const params = new URLSearchParams();
            if (start) params.append('startDate', start);
            if (end) params.append('endDate', end);
            if (params.toString()) url += `?${params.toString()}`;
            
            const res = await apiClient.get(url);
            setFetchedLogs(res.data || []);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (selectedStaff) {
            fetchLogs(selectedStaff, modalStartDate, modalEndDate);
        }
    }, [modalStartDate, modalEndDate, selectedStaff]);

    const totalStaffCount = staffAttendance.length;
    const presentTodayStaff = staffAttendance.filter(s => s.attendance?.checkInTime || s.attendanceStatus === 'Present');
    const onDutyStaff = staffAttendance.filter(s => s.attendance?.checkInTime && !s.attendance?.checkOutTime);
    
    // Late check-in logic
    const lateStaff = staffAttendance.filter(s => {
        if (s.isLate) return true;
        if (!s.attendance?.checkInTime) return false;
        const checkIn = new Date(s.attendance.checkInTime);
        return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 30);
    });

    const cards = [
        { title: 'Total Staff', value: `${totalStaffCount} Staff`, icon: <FiUsers />, textColor: 'text-indigo-600', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' },
        { title: 'Present Today', value: `${presentTodayStaff.length} Staff`, icon: <FiCheckCircle />, textColor: 'text-emerald-600', valueColor: 'text-emerald-600', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { title: 'Currently On Duty', value: `${onDutyStaff.length} Staff`, icon: <FiActivity />, textColor: 'text-cyan-600', valueColor: 'text-cyan-600', bgClass: 'bg-cyan-50', iconColor: 'text-cyan-600' },
        { title: 'Late Check-ins', value: `${lateStaff.length} Staff`, icon: <FiClock />, textColor: 'text-amber-600', valueColor: 'text-amber-600', bgClass: 'bg-amber-50', iconColor: 'text-amber-600' }
    ];

    // Main Staff Attendance Summary Table (NO Working Hours or Overtime columns)
    const columns = [
        { label: 'Staff ID' },
        { label: 'Staff Name' },
        { label: 'Role' },
        { label: 'Date' },
        { label: 'Total Attendance' },
        { label: 'Attendance Status' },
        { label: 'Shift Status' },
        { label: 'Action' }
    ];

    const renderRow = (item) => {
        const staffCustomId = item.staffId || item.user?.staffId || item.employeeId || 'STF-00' + (item._id || '').substring(0, 3).toUpperCase();
        const staffName = item.user?.name || item.name || 'Staff Member';
        const role = item.user?.role || item.role || 'Trainer';
        const dateStr = item.attendance?.date ? new Date(item.attendance.date).toLocaleDateString() : new Date().toLocaleDateString();

        const checkInTime = item.attendance?.checkInTime;
        const checkOutTime = item.attendance?.checkOutTime;

        // Total Monthly Attendance Days (Default / Calculated)
        const totalDaysPresent = item.totalPresentDays || item.attendanceCount || (checkInTime ? 22 : 0);

        // Attendance Status
        let isLate = false;
        if (checkInTime) {
            const checkInDate = new Date(checkInTime);
            if (checkInDate.getHours() > 9 || (checkInDate.getHours() === 9 && checkInDate.getMinutes() > 30)) {
                isLate = true;
            }
        }
        const attendanceStatus = !checkInTime ? 'Absent' : isLate ? 'Late' : 'Present';

        // Shift Status
        const shiftStatus = checkOutTime ? 'Completed' : checkInTime ? 'On Duty' : 'Not Checked In';

        return (
            <tr key={item.user?._id || item._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-xs font-mono font-bold text-slate-700">
                    {staffCustomId}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                    {staffName}
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-600">
                    {role}
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-500">
                    {dateStr}
                </td>
                <td className="py-3 px-4 text-xs font-bold text-indigo-700">
                    <span className="inline-flex px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-extrabold">
                        {totalDaysPresent} Days
                    </span>
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        attendanceStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        attendanceStatus === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                        {attendanceStatus}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        shiftStatus === 'Completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                        shiftStatus === 'On Duty' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 
                        'bg-slate-100 text-slate-600'
                    }`}>
                        {shiftStatus}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <button 
                        onClick={() => setSelectedStaff(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    >
                        <FiEye className="text-sm" /> View Attendance
                    </button>
                </td>
            </tr>
        );
    };

    const modalDailyLogs = selectedStaff ? fetchedLogs.map(log => {
        const checkIn = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
        const checkOut = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
        let hrs = '0h 0m';
        let ot = '0h 0m';
        if (log.checkInTime && log.checkOutTime) {
            const mins = Math.floor((new Date(log.checkOutTime) - new Date(log.checkInTime)) / (1000 * 60));
            hrs = `${Math.floor(mins / 60)}h ${mins % 60}m`;
            if (mins > 480) {
                const otM = mins - 480;
                ot = `${Math.floor(otM / 60)}h ${otM % 60}m`;
            }
        }
        return {
            date: new Date(log.date || log.checkInTime || log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            checkIn,
            checkOut,
            workingHours: hrs,
            overtime: ot,
            status: log.status || (log.checkInTime ? 'Present' : 'Absent')
        };
    }) : [];

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* 4 App Theme Summary Cards */}
            <div className="px-4 pt-3">
                <SummaryCards cards={cards} />
            </div>


            {/* Attendance Table */}
            <div className="px-4 pb-4">
                {staffAttendance.length > 0 ? (
                    <DataTable columns={columns} data={staffAttendance} renderRow={renderRow} />
                ) : (
                    <EmptyState 
                        icon={<FiClock size={48} />} 
                        title="No staff attendance records found" 
                        subtitle="Try adjusting your date filters or search parameters." 
                    />
                )}
            </div>

            {/* View Attendance Full Day Table Modal with Date Picker */}
            {selectedStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base border border-emerald-200">
                                    <FiCheckCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900">
                                        Full Day Attendance Log — {selectedStaff.user?.name || selectedStaff.name || 'Staff Member'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Role: <span className="font-semibold text-slate-700">{selectedStaff.user?.role || selectedStaff.role || 'Staff'}</span> • ID: <span className="font-mono text-indigo-600 font-bold">{selectedStaff.staffId || 'STF-001'}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedStaff(null); setModalStartDate(''); setModalEndDate(''); }}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>

                        {/* Date Picker Filter Bar inside Modal */}
                        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <FiCalendar className="text-slate-400 text-sm" />
                                <span className="text-xs font-bold text-slate-700">Filter Date Range:</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 h-9 px-3 rounded-lg text-xs">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">From:</span>
                                    <input 
                                        type="date"
                                        value={modalStartDate}
                                        onChange={(e) => setModalStartDate(e.target.value)}
                                        className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                                    />
                                    <span className="text-[11px] font-bold text-slate-400 uppercase ml-1">To:</span>
                                    <input 
                                        type="date"
                                        value={modalEndDate}
                                        onChange={(e) => setModalEndDate(e.target.value)}
                                        className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                                    />
                                </div>

                                {(modalStartDate || modalEndDate) && (
                                    <button 
                                        onClick={() => { setModalStartDate(''); setModalEndDate(''); }}
                                        className="h-9 px-3 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                                    >
                                        Reset Date
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Modal Body: Full Day Attendance Log Table */}
                        <div className="p-5 flex-1 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Check In</th>
                                        <th className="py-3 px-4">Check Out</th>
                                        <th className="py-3 px-4">Working Hours</th>
                                        <th className="py-3 px-4">Overtime</th>
                                        <th className="py-3 px-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {modalDailyLogs.map((log, index) => (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                {log.date}
                                            </td>
                                            <td className={`py-3 px-4 font-bold ${log.status === 'Absent' ? 'text-slate-400' : 'text-emerald-600'}`}>
                                                {log.checkIn}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-600">
                                                {log.checkOut}
                                            </td>
                                            <td className="py-3 px-4 font-black text-slate-800">
                                                {log.workingHours}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-amber-600">
                                                {log.overtime}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold uppercase ${
                                                    log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                    log.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    log.status === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {loadingLogs && <div className="text-center py-6 text-slate-500 font-medium text-xs">Loading attendance records...</div>}
                            {!loadingLogs && modalDailyLogs.length === 0 && <div className="text-center py-6 text-slate-500 font-medium text-xs">No records found for the selected period.</div>}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">
                                Showing <span className="font-bold text-slate-800">{modalDailyLogs.length} Log Entries</span>
                            </span>
                            <button 
                                onClick={() => { setSelectedStaff(null); setModalStartDate(''); setModalEndDate(''); }}
                                className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-sm"
                            >
                                Close Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
