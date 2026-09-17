import React, { useState, useEffect } from 'react';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiUsers, FiCheckCircle, FiClock, FiActivity, FiEye, FiX, FiCalendar, FiDownload, FiXCircle, FiTrendingUp } from 'react-icons/fi';
import apiClient from '../../../api/apiClient';
import { formatDate } from '../../../utils/dateUtils';

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
        { 
            title: 'Total Staff', 
            value: `${totalStaffCount} Staff`, 
            percentage: 'Team',
            percentageColor: 'text-purple-600',
            icon: <FiUsers />, 
            subtitle: 'On team roster', 
            bgClass: 'bg-[#FFECEC]', 
            iconColor: 'text-[#E53935]' 
        },
        { 
            title: 'Present Today', 
            value: `${presentTodayStaff.length} Staff`, 
            percentage: `${totalStaffCount > 0 ? Math.round((presentTodayStaff.length / totalStaffCount) * 100) : 0}%`,
            percentageColor: 'text-emerald-600',
            icon: <FiCheckCircle />, 
            subtitle: 'Checked in today', 
            bgClass: 'bg-[#E8F5E9]', 
            iconColor: 'text-[#2E7D32]' 
        },
        { 
            title: 'On Floor Duty', 
            value: `${onDutyStaff.length} Staff`, 
            percentage: 'Active',
            percentageColor: 'text-blue-600',
            icon: <FiActivity />, 
            subtitle: 'Currently working', 
            bgClass: 'bg-[#E3F2FD]', 
            iconColor: 'text-[#1976D2]' 
        },
        { 
            title: 'Late Check-ins', 
            value: `${lateStaff.length} Staff`, 
            percentage: 'Late',
            percentageColor: 'text-amber-600',
            icon: <FiClock />, 
            subtitle: 'Late arrivals', 
            bgClass: 'bg-[#FFF3E0]', 
            iconColor: 'text-[#EA580C]' 
        }
    ];

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const avatarStyles = [
        { bg: 'bg-[#FFECEC]', text: 'text-[#E53935]' },
        { bg: 'bg-[#FFF9C4]', text: 'text-[#F57F17]' },
        { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]' },
        { bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        { bg: 'bg-[#F3E8FF]', text: 'text-[#7E22CE]' },
        { bg: 'bg-[#FFEDD5]', text: 'text-[#EA580C]' },
    ];

    const getAvatarStyle = (name, index) => {
        const charCode = (name || '').charCodeAt(0) || 0;
        return avatarStyles[(charCode + index) % avatarStyles.length];
    };

    const totalItems = staffAttendance.length;
    const paginatedStaffAttendance = staffAttendance.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Main Staff Attendance Summary Table
    const columns = [
        { label: 'STAFF MEMBER', className: 'w-[22%] pl-6' },
        { label: 'ROLE', className: 'w-[14%] pl-3' },
        { label: 'DATE', className: 'w-[13%] pl-3' },
        { label: 'TOTAL ATTENDANCE', className: 'w-[15%] pl-3' },
        { label: 'ATTENDANCE STATUS', className: 'w-[14%] pl-1 text-left' },
        { label: 'SHIFT STATUS', className: 'w-[13%] pl-1 text-left' },
        { label: 'ACTIONS', className: 'w-[9%] text-center pr-6' }
    ];

    const renderRow = (item, index) => {
        const staffCustomId = item.staffId || item.user?.staffId || item.employeeId || 'STF-00' + (item._id || '').substring(0, 3).toUpperCase();
        const staffName = item.user?.name || item.name || 'Staff Member';
        const role = item.user?.role || item.role || 'Trainer';
        const dateStr = formatDate(item.attendance?.date || new Date());
        const avatarStyle = getAvatarStyle(staffName, index);

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
            <tr key={item.user?._id || item._id} className="bg-white hover:bg-slate-50/70 transition-colors duration-150 group">
                {/* STAFF MEMBER */}
                <td className="py-2.5 pl-6 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full ${avatarStyle.bg} ${avatarStyle.text} font-bold text-sm flex items-center justify-center shrink-0`}>
                            {(staffName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#111827] text-[13px] leading-tight truncate">
                                {staffName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                                ID: {staffCustomId}
                            </span>
                        </div>
                    </div>
                </td>

                {/* ROLE */}
                <td className="py-2.5 px-3 align-middle">
                    <span className="inline-flex px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-[11px] font-bold uppercase">
                        {role}
                    </span>
                </td>

                {/* DATE */}
                <td className="py-2.5 px-3 align-middle">
                    <span className="text-slate-700 font-bold text-[12px]">
                        {dateStr}
                    </span>
                </td>

                {/* TOTAL ATTENDANCE */}
                <td className="py-2.5 px-3 align-middle">
                    <span className="inline-flex px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[11px] font-bold">
                        {totalDaysPresent} Days
                    </span>
                </td>

                {/* ATTENDANCE STATUS */}
                <td className="py-2.5 pl-1 pr-3 text-left align-middle">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border leading-none shadow-2xs ${
                        attendanceStatus === 'Present' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        attendanceStatus === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {attendanceStatus}
                    </span>
                </td>

                {/* SHIFT STATUS */}
                <td className="py-2.5 pl-1 pr-3 text-left align-middle">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border leading-none shadow-2xs ${
                        shiftStatus === 'Completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                        shiftStatus === 'On Duty' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 
                        'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                        {shiftStatus}
                    </span>
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pl-2 pr-6 text-center align-middle">
                    <div className="flex items-center justify-center">
                        <button 
                            onClick={() => setSelectedStaff(item)}
                            className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 bg-white hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                            title="View Attendance History"
                        >
                            <FiEye size={14} />
                        </button>
                    </div>
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
            date: formatDate(log.date || log.checkInTime || log.createdAt),
            checkIn,
            checkOut,
            workingHours: hrs,
            overtime: ot,
            lateMinutes: log.lateMinutes || 0,
            deductionAmount: log.deductionAmount || 0,
            status: log.status || (log.checkInTime ? 'Present' : 'Absent')
        };
    }) : [];

    const exportStaffLogCSV = () => {
        if (!selectedStaff || !modalDailyLogs.length) return;

        const staffName = selectedStaff.user?.name || selectedStaff.name || 'Staff Member';
        const role = selectedStaff.user?.role || selectedStaff.role || 'Staff';
        const staffId = selectedStaff.staffId || selectedStaff.user?.staffId || selectedStaff.employeeId || 'STF-001';

        const csvData = modalDailyLogs.map(log => ({
            'Staff ID': staffId,
            'Staff Name': staffName,
            'Role': role,
            'Attendance Date': log.date,
            'Daily Check In': log.checkIn,
            'Daily Check Out': log.checkOut,
            'Working Hours': log.workingHours,
            'Late Minutes': log.lateMinutes ? `${log.lateMinutes} mins` : '0 mins',
            'Salary Deduction (₹)': log.deductionAmount ? log.deductionAmount.toFixed(2) : '0.00',
            'Attendance Status': log.status
        }));

        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${staffName.replace(/\s+/g, '_')}_Daily_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* Attendance Table */}
            <div className="px-6 md:px-8 pb-6 pt-1">
                {staffAttendance.length > 0 ? (
                    <DataTable 
                        columns={columns} 
                        data={paginatedStaffAttendance} 
                        renderRow={renderRow} 
                        pagination={{
                            currentPage: currentPage,
                            totalItems: totalItems,
                            pageSize: pageSize,
                            onPageChange: (p) => setCurrentPage(p),
                            onPageSizeChange: (s) => setPageSize(s),
                            itemLabel: "staff records"
                        }}
                    />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
                        
                        {/* Dark Premium Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                                    {(selectedStaff.user?.name || selectedStaff.name || 'S').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold text-white">
                                        Full Day Attendance Log — {selectedStaff.user?.name || selectedStaff.name || 'Staff Member'}
                                    </h3>
                                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                                        Role: {selectedStaff.user?.role || selectedStaff.role || 'Staff'} • ID: {selectedStaff.staffId || 'STF-001'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedStaff(null); setModalStartDate(''); setModalEndDate(''); }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <FiX size={20} />
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
                        <div className="p-3 px-5 flex-1 overflow-y-auto no-scrollbar bg-slate-50/30">
                            <DataTable 
                                columns={[
                                    { label: 'DATE', className: 'w-[18%] pl-6' },
                                    { label: 'CHECK IN', className: 'w-[16%] pl-3' },
                                    { label: 'CHECK OUT', className: 'w-[16%] pl-3' },
                                    { label: 'WORKING HOURS', className: 'w-[18%] pl-3' },
                                    { label: 'LATE DEDUCTION', className: 'w-[18%] pl-3' },
                                    { label: 'STATUS', className: 'w-[14%] pl-1 text-left' }
                                ]}
                                data={modalDailyLogs}
                                loading={loadingLogs}
                                emptyMessage="No records found for the selected period."
                                renderRow={(log, index) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors text-xs">
                                        <td className="py-3 pl-6 pr-3 font-bold text-slate-800 align-middle">
                                            {log.date}
                                        </td>
                                        <td className={`py-3 px-3 font-bold align-middle ${log.status === 'Absent' ? 'text-slate-400' : 'text-emerald-600'}`}>
                                            {log.checkIn}
                                        </td>
                                        <td className="py-3 px-3 font-bold text-slate-600 align-middle">
                                            {log.checkOut}
                                        </td>
                                        <td className="py-3 px-3 font-black text-slate-800 align-middle">
                                            {log.workingHours}
                                        </td>
                                        <td className="py-3 px-3 align-middle">
                                            {log.lateMinutes > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                                                    <span>{log.lateMinutes}m Late</span>
                                                    <span className="font-extrabold text-rose-600">(-₹{log.deductionAmount.toFixed(0)})</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-medium text-xs">None</span>
                                            )}
                                        </td>
                                        <td className="py-3 pl-1 pr-3 align-middle text-left">
                                            <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold rounded-full px-3 py-1 border leading-none shadow-2xs ${
                                                log.status === 'Present' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                                                log.status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                log.status === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">
                                Showing <span className="font-bold text-slate-800">{modalDailyLogs.length} Log Entries</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={exportStaffLogCSV}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-sm"
                                >
                                    <FiDownload className="text-sm" /> Export Log CSV
                                </button>
                                <button 
                                    onClick={() => { setSelectedStaff(null); setModalStartDate(''); setModalEndDate(''); }}
                                    className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-sm"
                                >
                                    Close Log
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
