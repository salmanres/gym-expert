import React, { useState, useEffect } from 'react';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import { 
    FiUsers, FiCheckCircle, FiClock, FiActivity, FiEye, FiX, 
    FiCalendar, FiDownload, FiList, FiChevronLeft, FiChevronRight,
    FiPhone, FiTrendingUp, FiAlertCircle
} from 'react-icons/fi';
import apiClient from '../../../api/apiClient';
import { formatDate, toInputDateFormat } from '../../../utils/dateUtils';
import DatePicker from '../../../components/form/DatePicker';

export default function StaffHoursReport({ 
    staffAttendance = [],
    filterStartDate = '',
    filterEndDate = '',
    gymSettings = {},
    loading = false
}) {
    const isGymClosed = (date) => {
        if (!gymSettings) return { closed: false };
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[date.getDay()];
        
        if (gymSettings.weeklyOff && gymSettings.weeklyOff.includes(dayName)) {
            return { closed: true, reason: 'Weekly Off' };
        }

        if (gymSettings.holidays && gymSettings.holidays.length > 0) {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const holiday = gymSettings.holidays.find(h => {
                if (!h.date) return false;
                const hd = new Date(h.date);
                const hdStr = `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
                return hdStr === dateStr;
            });

            if (holiday) {
                return { closed: true, reason: holiday.reason || 'Public Holiday' };
            }
        }
        return { closed: false };
    };

    const [selectedStaff, setSelectedStaff] = useState(null);
    const [modalStartDate, setModalStartDate] = useState('');
    const [modalEndDate, setModalEndDate] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [fetchedLogs, setFetchedLogs] = useState([]);
    
    // View mode: 'calendar' | 'list'
    const [logViewMode, setLogViewMode] = useState('calendar');
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const handleOpenModal = (staff) => {
        setSelectedStaff(staff);
        setModalStartDate(filterStartDate || '');
        setModalEndDate(filterEndDate || '');
        setLogViewMode('calendar');
        setCalendarMonth(new Date());
        setFetchedLogs([]);
        fetchLogs(staff, filterStartDate || '', filterEndDate || '');
    };

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
            console.error("Failed to fetch staff logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (selectedStaff) {
            fetchLogs(selectedStaff, modalStartDate, modalEndDate);
        }
    }, [modalStartDate, modalEndDate]);

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

    const calculateWorkingHours = (checkInTime, checkOutTime) => {
        if (!checkInTime) return '-';
        const start = new Date(checkInTime);
        const end = checkOutTime ? new Date(checkOutTime) : new Date();
        const diffMins = Math.max(0, Math.floor((end - start) / (1000 * 60)));
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (checkOutTime) {
            return `${hrs}h ${mins}m`;
        } else {
            return `${hrs}h ${mins}m (Active)`;
        }
    };

    const totalItems = staffAttendance.length;
    const paginatedStaffAttendance = staffAttendance.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Main Staff Attendance Summary Table
    const columns = [
        { label: 'STAFF MEMBER', className: 'w-[22%] pl-6' },
        { label: 'ROLE & SHIFT', className: 'w-[16%] pl-3' },
        { label: 'TODAY TIMINGS', className: 'w-[16%] pl-3' },
        { label: 'WORKING HOURS', className: 'w-[14%] pl-3' },
        { label: 'ATTENDANCE STATUS', className: 'w-[12%] pl-1 text-left' },
        { label: 'TOTAL ATTENDANCE', className: 'w-[12%] pl-3' },
        { label: 'ACTIONS', className: 'w-[8%] text-center pr-6' }
    ];

    const renderRow = (item, index) => {
        const staffCustomId = item.staffId || item.user?.staffId || item.employeeId || 'STF-00' + (item._id || '').substring(0, 3).toUpperCase();
        const staffName = item.user?.name || item.name || 'Staff Member';
        const role = item.user?.role || item.role || 'Trainer';
        const shiftInfo = item.shiftStart && item.shiftEnd ? `${item.shiftStart} - ${item.shiftEnd}` : (item.user?.shiftStart ? `${item.user.shiftStart} - ${item.user.shiftEnd}` : 'General Shift');
        const rawJoiningDate = item.joiningDate || item.user?.joiningDate || item.createdAt || item.user?.createdAt;
        const joiningDate = rawJoiningDate ? new Date(rawJoiningDate) : null;
        if (joiningDate) joiningDate.setHours(0, 0, 0, 0);

        const avatarStyle = getAvatarStyle(staffName, index);

        const checkInTime = item.attendance?.checkInTime;
        const checkOutTime = item.attendance?.checkOutTime;

        // Total Monthly Attendance Days
        const totalDaysPresent = item.totalPresentDays || item.attendanceCount || (checkInTime ? 22 : 0);

        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);

        // Attendance Status
        let isLate = false;
        if (checkInTime) {
            const checkInDate = new Date(checkInTime);
            if (checkInDate.getHours() > 9 || (checkInDate.getHours() === 9 && checkInDate.getMinutes() > 30)) {
                isLate = true;
            }
        }
        
        let attendanceStatus = 'Absent';
        if (joiningDate && todayObj < joiningDate) {
            attendanceStatus = 'Not Joined';
        } else if (!checkInTime) {
            attendanceStatus = 'Absent';
        } else if (isLate) {
            attendanceStatus = 'Late';
        } else {
            attendanceStatus = 'Present';
        }

        const workedHoursStr = calculateWorkingHours(checkInTime, checkOutTime);

        let todayTimingsBadge = <span className="text-xs text-slate-400 font-medium">Not Checked In</span>;
        if (joiningDate && todayObj < joiningDate) {
            todayTimingsBadge = <span className="text-xs text-slate-400 font-medium italic">Joining {formatDate(rawJoiningDate)}</span>;
        } else if (checkInTime) {
            const inTimeStr = new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const outTimeStr = checkOutTime ? new Date(checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'On Duty';
            todayTimingsBadge = (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{inTimeStr} - {outTimeStr}</span>
                    <span className="text-[10.5px] text-slate-500 font-medium">{checkOutTime ? 'Shift Completed' : 'Currently Active'}</span>
                </div>
            );
        }

        return (
            <tr key={item.user?._id || item._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                {/* 1. STAFF MEMBER */}
                <td className="py-3.5 pl-6 pr-3 align-middle">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${avatarStyle.bg} ${avatarStyle.text} font-bold text-sm flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs`}>
                            {(staffName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 text-[14.5px] leading-tight truncate">
                                {staffName}
                            </span>
                            <span className="text-[12.5px] text-slate-500 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>ID: <span className="font-bold text-slate-700">{staffCustomId}</span></span>
                                {rawJoiningDate && (
                                    <>
                                        <span>•</span>
                                        <span>Joined: <span className="font-bold text-slate-600">{formatDate(rawJoiningDate)}</span></span>
                                    </>
                                )}
                            </span>
                        </div>
                    </div>
                </td>

                {/* 2. ROLE & SHIFT */}
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5">
                        <span className="inline-flex px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-[11px] font-bold uppercase w-max">
                            {role}
                        </span>
                        <span className="text-[12px] text-slate-600 font-medium mt-0.5">
                            {shiftInfo}
                        </span>
                    </div>
                </td>

                {/* 3. TODAY TIMINGS */}
                <td className="py-3.5 px-3 align-middle">
                    {todayTimingsBadge}
                </td>

                {/* 4. WORKING HOURS */}
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border shadow-2xs ${
                            workedHoursStr.includes('Active')
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                : workedHoursStr !== '-'
                                ? 'bg-slate-100 text-slate-900 border-slate-200'
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                            <FiClock size={11} className={workedHoursStr.includes('Active') ? 'text-cyan-600 animate-pulse' : 'text-slate-500'} />
                            <span>{workedHoursStr}</span>
                        </span>
                    </div>
                </td>

                {/* 5. ATTENDANCE STATUS */}
                <td className="py-3.5 pl-1 pr-3 text-left align-middle">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold rounded-lg px-3 py-1 border leading-none shadow-2xs ${
                        attendanceStatus === 'Present' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        attendanceStatus === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        attendanceStatus === 'Not Joined' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            attendanceStatus === 'Present' ? 'bg-emerald-500' :
                            attendanceStatus === 'Late' ? 'bg-amber-500' :
                            attendanceStatus === 'Not Joined' ? 'bg-slate-400' :
                            'bg-rose-500'
                        }`} />
                        {attendanceStatus}
                    </span>
                </td>

                {/* 6. TOTAL ATTENDANCE */}
                <td className="py-3.5 px-3 align-middle">
                    <span className="inline-flex px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold shadow-2xs">
                        {totalDaysPresent} {totalDaysPresent === 1 ? 'Day' : 'Days'}
                    </span>
                </td>

                {/* 7. ACTIONS */}
                <td className="py-3.5 text-center pr-6 align-middle">
                    <button 
                        onClick={() => handleOpenModal(item)}
                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-[#CA0410] hover:text-[#CA0410] hover:bg-rose-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 mx-auto"
                        title="View Attendance Calendar & Logs"
                    >
                        <FiEye size={15} />
                    </button>
                </td>
            </tr>
        );
    };

    // Calendar Grid rendering for modal
    const renderCalendarGrid = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const datesMap = {};
        fetchedLogs.forEach(log => {
            const dKey = toInputDateFormat(log.date || log.checkInTime);
            datesMap[dKey] = log;
        });

        const dayCells = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            dayCells.push(<div key={`empty-${i}`} className="h-16 bg-slate-50/50 rounded-xl border border-transparent"></div>);
        }

        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);

        const rawJoiningDate = selectedStaff?.joiningDate || selectedStaff?.user?.joiningDate || selectedStaff?.createdAt || selectedStaff?.user?.createdAt;
        const joiningDate = rawJoiningDate ? new Date(rawJoiningDate) : null;
        if (joiningDate) {
            joiningDate.setHours(0, 0, 0, 0);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const currentCellDate = new Date(year, month, d);
            currentCellDate.setHours(0, 0, 0, 0);
            const dateStr = toInputDateFormat(currentCellDate);
            const log = datesMap[dateStr];
            const isToday = toInputDateFormat(new Date()) === dateStr;
            const closedInfo = isGymClosed(currentCellDate);

            let cellBg = "bg-white";
            let statusBadge = null;

            if (joiningDate && currentCellDate < joiningDate) {
                // BEFORE JOINING DATE: Not joined gym yet
                cellBg = "bg-slate-50/60 border-slate-100 opacity-60";
                statusBadge = <span className="text-[9.5px] font-medium text-slate-400 mt-1 block italic">Not Joined</span>;
            } else if (log && log.checkInTime) {
                const isLate = log.lateMinutes > 0 || log.status === 'Late';
                cellBg = isLate ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-200";
                
                const inTime = new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const hrsWorked = calculateWorkingHours(log.checkInTime, log.checkOutTime);

                statusBadge = (
                    <div className="mt-1">
                        <span className={`text-[10px] font-bold block truncate ${isLate ? 'text-amber-800' : 'text-emerald-800'}`}>
                            {inTime}
                        </span>
                        <span className="text-[9.5px] font-extrabold text-slate-700 block">
                            {hrsWorked}
                        </span>
                    </div>
                );
            } else if (closedInfo.closed) {
                cellBg = "bg-slate-100/70 border-slate-200";
                statusBadge = <span className="text-[9.5px] font-bold text-slate-400 mt-1 block">{closedInfo.reason}</span>;
            } else if (currentCellDate <= todayObj) {
                cellBg = "bg-rose-50/40 border-rose-200/60";
                statusBadge = <span className="text-[9.5px] font-bold text-rose-500 mt-1 block">Absent</span>;
            }

            dayCells.push(
                <div key={`day-${d}`} className={`h-16 p-1.5 rounded-xl border transition-all flex flex-col justify-between ${cellBg} ${isToday ? 'ring-2 ring-[#CA0410]' : ''}`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isToday ? 'text-[#CA0410]' : 'text-slate-700'}`}>{d}</span>
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#CA0410]"></span>}
                    </div>
                    {statusBadge}
                </div>
            );
        }

        return dayCells;
    };

    const exportStaffLogCSV = () => {
        if (!selectedStaff || !fetchedLogs.length) return;

        const staffName = selectedStaff.user?.name || selectedStaff.name || 'Staff_Member';
        const role = selectedStaff.user?.role || selectedStaff.role || 'Staff';
        const staffId = selectedStaff.staffId || selectedStaff.user?.staffId || selectedStaff.employeeId || 'STF-001';

        const csvData = fetchedLogs.map(log => {
            const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
            const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
            const workingHours = calculateWorkingHours(log.checkInTime, log.checkOutTime);

            return {
                'Staff ID': staffId,
                'Staff Name': staffName,
                'Role': role,
                'Attendance Date': formatDate(log.date || log.checkInTime),
                'Check In': inTime,
                'Check Out': outTime,
                'Working Hours': workingHours,
                'Late Minutes': log.lateMinutes ? `${log.lateMinutes} mins` : '0 mins',
                'Salary Deduction (₹)': log.deductionAmount ? log.deductionAmount.toFixed(2) : '0.00',
                'Attendance Status': log.status || (log.checkInTime ? 'Present' : 'Absent'),
                'Source': log.source || 'Manual'
            };
        });

        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${staffName.replace(/\s+/g, '_')}_Attendance_Logs.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* Top KPI Cards */}
            <div className="px-6 md:px-8">
                <SummaryCards cards={cards} loading={loading} />
            </div>

            {/* Attendance Table */}
            <div className="px-6 md:px-8 pb-6 pt-1">
                <DataTable 
                    columns={columns} 
                    data={paginatedStaffAttendance} 
                    loading={loading}
                    emptyTitle="No staff attendance records found"
                    emptySubtitle="No staff records match the selected filters or date range."
                    renderRow={renderRow} 
                    totalItems={totalItems}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {/* View Attendance 360° Modal with Calendar View & List View */}
            {selectedStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col">
                        
                        {/* Dark Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold flex items-center justify-center border border-white/20">
                                    {(selectedStaff.user?.name || selectedStaff.name || 'S').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">
                                        {selectedStaff.user?.name || selectedStaff.name || 'Staff Member'}
                                    </h3>
                                    <p className="text-xs text-slate-300">
                                        Role: <span className="font-bold text-white">{selectedStaff.user?.role || selectedStaff.role || 'Staff'}</span> • ID: {selectedStaff.staffId || selectedStaff.user?.staffId || 'STF-001'} • Shift: {selectedStaff.shiftStart ? `${selectedStaff.shiftStart} - ${selectedStaff.shiftEnd}` : 'General Shift'} • Joined: <span className="font-bold text-white">{formatDate(selectedStaff.joiningDate || selectedStaff.user?.joiningDate || selectedStaff.createdAt || selectedStaff.user?.createdAt, 'N/A')}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedStaff(null); setModalStartDate(''); setModalEndDate(''); }}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Modal Sub-Header: Mode Switch & Date Filter */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setLogViewMode('calendar')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        logViewMode === 'calendar'
                                            ? 'bg-[#CA0410] text-white shadow-2xs'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <FiCalendar size={13} />
                                    <span>Calendar View</span>
                                </button>
                                <button
                                    onClick={() => setLogViewMode('list')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        logViewMode === 'list'
                                            ? 'bg-[#CA0410] text-white shadow-2xs'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <FiList size={13} />
                                    <span>List View</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <DatePicker
                                    compact={true}
                                    value={modalStartDate}
                                    onChange={(e) => setModalStartDate(e.target.value)}
                                    placeholder="From"
                                />
                                <span className="text-[10px] font-bold text-slate-400">TO</span>
                                <DatePicker
                                    compact={true}
                                    value={modalEndDate}
                                    onChange={(e) => setModalEndDate(e.target.value)}
                                    placeholder="To"
                                />
                                {(modalStartDate || modalEndDate) && (
                                    <button 
                                        onClick={() => { setModalStartDate(''); setModalEndDate(''); }}
                                        className="h-8 px-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Reset
                                    </button>
                                )}
                                {fetchedLogs.length > 0 && (
                                    <button
                                        onClick={exportStaffLogCSV}
                                        className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                        title="Export Staff Logs CSV"
                                    >
                                        <FiDownload size={13} />
                                        <span className="hidden sm:inline">CSV</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {loadingLogs ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-6 h-6 border-2 border-[#CA0410] border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <span className="text-xs font-medium">Loading staff attendance history...</span>
                                </div>
                            ) : logViewMode === 'calendar' ? (
                                <div>
                                    {/* Month Navigation */}
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                                        <h4 className="font-bold text-slate-800 text-sm">
                                            {calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                                        </h4>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    const prev = new Date(calendarMonth);
                                                    prev.setMonth(prev.getMonth() - 1);
                                                    setCalendarMonth(prev);
                                                }}
                                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                            >
                                                <FiChevronLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const next = new Date(calendarMonth);
                                                    next.setMonth(next.getMonth() + 1);
                                                    setCalendarMonth(next);
                                                }}
                                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                            >
                                                <FiChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Days Header */}
                                    <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                            <div key={d} className={`text-[11px] font-extrabold ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                                {d}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {renderCalendarGrid()}
                                    </div>
                                </div>
                            ) : (
                                /* List View Table with Working Hours */
                                <div>
                                    {fetchedLogs.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400">
                                            <FiClock className="mx-auto text-3xl mb-2 text-slate-300" />
                                            <p className="text-xs font-bold text-slate-600">No attendance logs found</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">No attendance logs recorded for this period.</p>
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                    <tr>
                                                        <th className="py-2.5 px-4">Date</th>
                                                        <th className="py-2.5 px-4">Check-in</th>
                                                        <th className="py-2.5 px-4">Check-out</th>
                                                        <th className="py-2.5 px-4">Working Hours</th>
                                                        <th className="py-2.5 px-4">Late / Deduction</th>
                                                        <th className="py-2.5 px-4">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {fetchedLogs.map((log, index) => {
                                                        const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                                                        const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                                                        const workingHours = calculateWorkingHours(log.checkInTime, log.checkOutTime);

                                                        return (
                                                            <tr key={log._id || index} className="hover:bg-slate-50/80">
                                                                <td className="py-2.5 px-4 font-bold text-slate-800">{formatDate(log.date || log.checkInTime)}</td>
                                                                <td className="py-2.5 px-4 text-emerald-700 font-semibold">{inTime}</td>
                                                                <td className="py-2.5 px-4 text-slate-600 font-medium">{outTime}</td>
                                                                <td className="py-2.5 px-4 font-black text-slate-900">{workingHours}</td>
                                                                <td className="py-2.5 px-4">
                                                                    {log.lateMinutes > 0 ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                                                            <span>{log.lateMinutes}m</span>
                                                                            {log.deductionAmount > 0 && <span className="font-extrabold text-rose-600">(-₹{Math.round(log.deductionAmount)})</span>}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400 font-medium text-[11px]">On Time</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-4">
                                                                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                                                                        log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                                        log.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                        'bg-rose-50 text-rose-700 border border-rose-200'
                                                                    }`}>
                                                                        {log.status || 'Present'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">
                                Showing <span className="font-bold text-slate-800">{fetchedLogs.length} Log Entries</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setSelectedStaff(null); setModalStartDate(''); setModalEndDate(''); }}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
