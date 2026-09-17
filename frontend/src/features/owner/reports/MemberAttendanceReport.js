import React, { useState, useEffect } from 'react';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiUsers, FiCheckCircle, FiClock, FiActivity, FiEye, FiX, FiCalendar, FiDownload, FiList, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import apiClient from '../../../api/apiClient';
import { formatDate } from '../../../utils/dateUtils';

export default function MemberAttendanceReport({ 
    memberAttendance = [],
    activePlans = [],
    filterStartDate = '',
    filterEndDate = '',
    gymSettings = {}
}) {
    // Helper to check if gym is closed based on weekly off or holidays
    const isGymClosed = (date) => {
        if (!gymSettings) return { closed: false };
        
        // Check weekly off (JS getDay() returns 0 for Sunday, 1 for Monday, etc.)
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[date.getDay()];
        
        if (gymSettings.weeklyOff && gymSettings.weeklyOff.includes(dayName)) {
            return { closed: true, reason: 'Weekly Off' };
        }

        // Check holidays
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

    const [selectedMember, setSelectedMember] = useState(null);
    const [modalStartDate, setModalStartDate] = useState('');
    const [modalEndDate, setModalEndDate] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [fetchedLogs, setFetchedLogs] = useState([]);
    
    // Calendar View State
    const [logViewMode, setLogViewMode] = useState('calendar'); // 'list' or 'calendar'
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Sync modal date pickers with main filter bar when opening modal
    const handleOpenModal = (member) => {
        setSelectedMember(member);
        setModalStartDate(filterStartDate || '');
        setModalEndDate(filterEndDate || '');
        setLogViewMode('calendar');
        setCalendarMonth(new Date());
        setFetchedLogs([]);
        fetchLogs(member, filterStartDate || '', filterEndDate || '');
    };

    const fetchLogs = async (member, start, end) => {
        if (!member) return;
        setLoadingLogs(true);
        try {
            const userId = member.user?._id || member.userId?._id || member.memberId?._id || member._id;
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
        if (selectedMember) {
            fetchLogs(selectedMember, modalStartDate, modalEndDate);
        }
    }, [modalStartDate, modalEndDate]);

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const getMemberStatusInfo = (item) => {
        const startDate = item.startDate || item.membershipPlanId?.startDate || item.memberId?.startDate;
        const endDate = item.endDate || item.membershipPlanId?.endDate || item.memberId?.endDate;

        if (!startDate || !endDate) return { status: 'No Plan', start: null, end: null };

        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);

        if (item.membershipStatus === 'Expired') return { status: 'Expired', start, end };
        if (todayObj < start) return { status: 'Upcoming', start, end };
        if (todayObj > end) return { status: 'Expired', start, end };
        return { status: 'Active', start, end };
    };

    let activeCount = 0;
    let upcomingCount = 0;
    let expiredCount = 0;
    
    memberAttendance.forEach(m => {
        const info = getMemberStatusInfo(m);
        if (info.status === 'Active') activeCount++;
        else if (info.status === 'Upcoming') upcomingCount++;
        else if (info.status === 'Expired') expiredCount++;
    });

    const totalMemberCount = memberAttendance.length;
    const presentTodayMembers = memberAttendance.filter(m => m.attendance?.checkInTime || m.attendanceStatus === 'Present');
    const currentlyInGym = memberAttendance.filter(m => m.attendance?.checkInTime && !m.attendance?.checkOutTime);

    const cards = [
        { 
            title: 'Total Members', 
            value: `${totalMemberCount} Members`, 
            percentage: '100%',
            percentageColor: 'text-emerald-600',
            icon: <FiUsers />, 
            subtitle: 'Registered members',
            bgClass: 'bg-[#FFECEC]', 
            iconColor: 'text-[#E53935]' 
        },
        { 
            title: 'Active Members', 
            value: `${activeCount} Members`, 
            percentage: `${totalMemberCount > 0 ? Math.round((activeCount / totalMemberCount) * 100) : 0}%`,
            percentageColor: 'text-emerald-600',
            icon: <FiCheckCircle />, 
            subtitle: 'With active plan',
            bgClass: 'bg-[#E8F5E9]', 
            iconColor: 'text-[#2E7D32]' 
        },
        { 
            title: 'Present Today', 
            value: `${presentTodayMembers.length} Members`, 
            percentage: 'Today',
            percentageColor: 'text-blue-600',
            icon: <FiActivity />, 
            subtitle: 'Logged check-ins',
            bgClass: 'bg-[#E3F2FD]', 
            iconColor: 'text-[#1976D2]' 
        },
        { 
            title: 'Currently In Gym', 
            value: `${currentlyInGym.length} Active`, 
            percentage: 'Live',
            percentageColor: 'text-purple-600',
            icon: <FiEye />, 
            subtitle: 'Workout in progress',
            bgClass: 'bg-[#F3E8FF]', 
            iconColor: 'text-[#7E22CE]' 
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

    const totalItems = memberAttendance.length;
    const paginatedMemberAttendance = memberAttendance.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Main Member Attendance Summary Table with Plan Start & End Dates
    const columns = [
        { label: 'MEMBER', className: 'w-[22%] pl-6' },
        { label: 'MEMBERSHIP PLAN', className: 'w-[16%] pl-3' },
        { label: 'VALIDITY DATES', className: 'w-[16%] pl-3' },
        { label: 'PLAN STATUS', className: 'w-[11%] pl-1 text-left' },
        { label: 'TODAY ATTENDANCE', className: 'w-[13%] pl-1 text-left' },
        { label: 'TOTAL ATTENDANCE', className: 'w-[14%] pl-3' },
        { label: 'ACTIONS', className: 'w-[8%] text-center pr-6' }
    ];

    const renderRow = (item, index) => {
        const memberCustomId = item.memberId?.memberId || (typeof item.memberId === 'string' ? item.memberId : null) || item.memberId || 'MEM-00' + (item._id || '').substring(0, 3).toUpperCase();
        const memberName = item.memberId?.firstName ? `${item.memberId.firstName} ${item.memberId.lastName || ''}`.trim() : item.firstName ? `${item.firstName} ${item.lastName || ''}`.trim() : item.memberName || item.name || 'Gym Member';
        
        const planName = item.membershipPlanId?.name || item.planName || '--';
        const info = getMemberStatusInfo(item);
        const startDateStr = formatDate(info.start, '--');
        const endDateStr = formatDate(info.end, '--');
        const avatarStyle = getAvatarStyle(memberName, index);

        const checkInTime = item.attendance?.checkInTime;
        const totalDaysPresent = item.totalPresentDays !== undefined ? item.totalPresentDays : (item.attendanceCount || (checkInTime ? 24 : 0));

        let attendanceStatus = 'Absent';
        if (info.status === 'Upcoming') attendanceStatus = 'Not Started';
        else if (info.status === 'Expired') attendanceStatus = 'Expired';
        else if (info.status === 'No Plan') attendanceStatus = 'No Plan';
        else {
            if (checkInTime || item.attendanceStatus === 'Present') {
                attendanceStatus = 'Present';
            } else {
                attendanceStatus = 'Absent';
            }
        }

        return (
            <tr key={item._id} className="bg-white hover:bg-slate-50/70 transition-colors duration-150 group">
                {/* MEMBER */}
                <td className="py-2.5 pl-6 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full ${avatarStyle.bg} ${avatarStyle.text} font-bold text-sm flex items-center justify-center shrink-0`}>
                            {(memberName || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#111827] text-[13px] leading-tight truncate">
                                {memberName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                                ID: {memberCustomId}
                            </span>
                        </div>
                    </div>
                </td>

                {/* PLAN */}
                <td className="py-2.5 px-3 align-middle">
                    <span className="font-bold text-[#111827] text-[13px]">
                        {planName}
                    </span>
                </td>

                {/* VALIDITY DATES */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[12px] leading-tight">
                        <span className="font-medium text-slate-700">{startDateStr} to {endDateStr}</span>
                    </div>
                </td>

                {/* PLAN STATUS */}
                <td className="py-2.5 pl-1 pr-3 text-left align-middle">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border leading-none shadow-2xs ${
                        info.status === 'Active' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        info.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        info.status === 'Expired' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                        {info.status}
                    </span>
                </td>

                {/* TODAY ATTENDANCE */}
                <td className="py-2.5 pl-1 pr-3 text-left align-middle">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border leading-none shadow-2xs ${
                        attendanceStatus === 'Present' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        attendanceStatus === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                        {attendanceStatus}
                    </span>
                </td>

                {/* TOTAL ATTENDANCE */}
                <td className="py-2.5 px-3 align-middle">
                    <span className="inline-flex px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[11px] font-bold">
                        {totalDaysPresent} Days
                    </span>
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pl-2 pr-6 text-center align-middle">
                    <div className="flex items-center justify-center">
                        <button 
                            onClick={() => handleOpenModal(item)}
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

    const modalDailyLogs = [];
    if (selectedMember) {
        const info = getMemberStatusInfo(selectedMember);
        const planStart = info.start;
        const planEnd = info.end;
        
        let startFilter = modalStartDate ? new Date(modalStartDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        let endFilter = modalEndDate ? new Date(modalEndDate) : new Date();
        
        startFilter.setHours(0,0,0,0);
        endFilter.setHours(23,59,59,999);
        
        const todayObj = new Date();
        todayObj.setHours(23,59,59,999);
        
        // Ensure we don't iterate excessively
        if (endFilter > todayObj) endFilter = new Date(todayObj);

        // Map existing logs for easy lookup
        const fetchedLogsMap = {};
        fetchedLogs.forEach(log => {
            const dateStr = formatDate(log.date || log.checkInTime || log.createdAt);
            fetchedLogsMap[dateStr] = log;
        });

        // Generate logs for every day in the range
        let current = new Date(startFilter);
        while (current <= endFilter) {
            const dateString = formatDate(current);
            const existingLog = fetchedLogsMap[dateString];

            if (existingLog) {
                const checkIn = existingLog.checkInTime ? new Date(existingLog.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                const checkOut = existingLog.checkOutTime ? new Date(existingLog.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                let workoutTime = '0h 0m';
                if (existingLog.checkInTime && existingLog.checkOutTime) {
                    const mins = Math.floor((new Date(existingLog.checkOutTime) - new Date(existingLog.checkInTime)) / (1000 * 60));
                    workoutTime = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                } else if (existingLog.checkInTime) {
                    workoutTime = '1h 30m (Session)';
                }
                modalDailyLogs.push({
                    date: dateString,
                    checkIn,
                    checkOut,
                    workoutTime,
                    status: existingLog.status || (existingLog.checkInTime ? 'Present' : 'Absent')
                });
            } else {
                let isAfterStart = true;
                let isBeforeEnd = true;
                
                if (planStart) {
                    const planStartCheck = new Date(planStart);
                    planStartCheck.setHours(0,0,0,0);
                    isAfterStart = current >= planStartCheck;
                } else {
                    isAfterStart = false; // No plan means they aren't "active"
                }

                if (planEnd) {
                    const planEndCheck = new Date(planEnd);
                    planEndCheck.setHours(23, 59, 59, 999);
                    isBeforeEnd = current <= planEndCheck;
                }
                
                if (isAfterStart && isBeforeEnd && current <= todayObj) {
                    const closedCheck = isGymClosed(current);
                    modalDailyLogs.push({
                        date: dateString,
                        checkIn: '--:--',
                        checkOut: '--:--',
                        workoutTime: '--',
                        status: closedCheck.closed ? 'OFF' : 'Absent',
                        reason: closedCheck.reason || ''
                    });
                }
            }
            current.setDate(current.getDate() + 1);
        }
        
        // Include any fetched logs that might be outside the filter range just in case
        fetchedLogs.forEach(log => {
            const dateStr = formatDate(log.date || log.checkInTime || log.createdAt);
            if (!modalDailyLogs.find(l => l.date === dateStr)) {
                const checkIn = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                const checkOut = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                modalDailyLogs.push({
                    date: dateStr,
                    checkIn,
                    checkOut,
                    workoutTime: log.checkInTime && log.checkOutTime ? `${Math.floor(Math.floor((new Date(log.checkOutTime) - new Date(log.checkInTime)) / 60000) / 60)}h ${Math.floor((new Date(log.checkOutTime) - new Date(log.checkInTime)) / 60000) % 60}m` : '--',
                    status: log.status || (log.checkInTime ? 'Present' : 'Absent')
                });
            }
        });

        // Sort by descending date
        modalDailyLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const exportMemberLogCSV = () => {
        if (!selectedMember || !modalDailyLogs.length) return;

        const memberName = selectedMember.memberId?.firstName ? `${selectedMember.memberId.firstName} ${selectedMember.memberId.lastName || ''}`.trim() : selectedMember.firstName ? `${selectedMember.firstName} ${selectedMember.lastName || ''}`.trim() : selectedMember.memberName || selectedMember.name || 'Gym Member';
        const phone = selectedMember.memberId?.contactNumber || selectedMember.memberId?.phone || selectedMember.memberId?.mobile || selectedMember.memberId?.contactNo || selectedMember.contactNumber || selectedMember.phone || selectedMember.mobile || selectedMember.contactNo || 'N/A';
        const planName = selectedMember.membershipPlanId?.name || selectedMember.planName || 'General Plan';
        const startDate = selectedMember.startDate || selectedMember.membershipPlanId?.startDate || selectedMember.memberId?.startDate;
        const endDate = selectedMember.endDate || selectedMember.membershipPlanId?.endDate || selectedMember.memberId?.endDate;

        const today = new Date();
        const startDateStr = formatDate(startDate || new Date(today.getFullYear(), today.getMonth(), 1));
        const endDateStr = formatDate(endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0));

        const csvData = modalDailyLogs.map(log => ({
            'Member ID': selectedMember.memberId?.memberId || selectedMember.memberId || 'MEM-001',
            'Member Name': memberName,
            'Contact Number': phone,
            'Membership Plan': planName,
            'Plan Start Date': startDateStr,
            'Plan End Date': endDateStr,
            'Attendance Date': log.date,
            'Daily Check In': log.checkIn,
            'Daily Check Out': log.checkOut,
            'Workout Duration': log.workoutTime,
            'Attendance Status': log.status
        }));

        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${memberName.replace(/\s+/g, '_')}_Daily_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const selectedMemberInfo = selectedMember ? getMemberStatusInfo(selectedMember) : { status: 'No Plan', start: null, end: null };
    const selectedMemberStartDate = formatDate(selectedMemberInfo.start, '--/--/----');
    const selectedMemberEndDate = formatDate(selectedMemberInfo.end, '--/--/----');

    const nextCalendarMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
    const prevCalendarMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));

    const renderCalendarCells = () => {
        const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
        const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
        const emptyCellsCount = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const cells = [];
        for (let i = 0; i < emptyCellsCount; i++) {
            cells.push(<div key={`empty-${i}`} className="h-[65px] border border-slate-100 bg-slate-50/50"></div>);
        }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d);
            const formattedTargetDate = formatDate(date);
            
            // Only show logs matching this date from modalDailyLogs
            const dayLogs = modalDailyLogs.filter(log => log.date === formattedTargetDate);
            const isToday = new Date().toDateString() === date.toDateString();
            
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            const isPastOrToday = date <= today;
            
            let displayLogs = [...dayLogs];
            let isAfterStart = true;
            let isBeforeEnd = true;
            
            if (selectedMemberStartDate && selectedMemberStartDate !== '--/--/----') {
                const startDateObj = new Date(selectedMemberStartDate);
                startDateObj.setHours(0,0,0,0);
                isAfterStart = date >= startDateObj;
            } else {
                isAfterStart = false;
            }
            
            if (selectedMemberEndDate && selectedMemberEndDate !== '--/--/----') {
                const endDateObj = new Date(selectedMemberEndDate);
                endDateObj.setHours(23,59,59,999);
                isBeforeEnd = date <= endDateObj;
            }
            
            const isWithinPlan = isAfterStart && isBeforeEnd;
            
            if (displayLogs.length === 0 && isWithinPlan) {
                const closedCheck = isGymClosed(date);
                if (closedCheck.closed) {
                    displayLogs = [{ status: 'OFF', reason: closedCheck.reason }];
                } else if (isPastOrToday) {
                    displayLogs = [{ status: 'Absent' }];
                }
            }
            
            const isAbsentDay = displayLogs.length === 1 && displayLogs[0].status === 'Absent';
            const isOffDay = displayLogs.length === 1 && displayLogs[0].status === 'OFF';
            const isPresentDay = displayLogs.length > 0 && displayLogs.some(l => l.status === 'Present');
            const isOutOfBounds = !isWithinPlan;
            
            cells.push(
                <div key={d} className={`h-[65px] border p-1 flex flex-col transition-colors overflow-hidden ${
                    isOutOfBounds ? 'bg-slate-50/80 border-slate-100 opacity-50' :
                    isOffDay ? 'bg-amber-50/60 border-amber-100 hover:bg-amber-50' :
                    isAbsentDay ? 'bg-rose-50 border-rose-100 hover:bg-rose-100' : 
                    isPresentDay ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 
                    'bg-white border-slate-100 hover:bg-slate-50'
                }`}>
                    <span className={`text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full mb-0.5 ${
                        isOutOfBounds ? 'text-slate-400' :
                        isToday && isPresentDay ? 'bg-emerald-600 text-white shadow-sm' : 
                        isToday ? 'bg-indigo-600 text-white shadow-sm' : 
                        isOffDay ? 'text-amber-600' :
                        isAbsentDay ? 'text-rose-500' : 
                        isPresentDay ? 'text-emerald-600' : 'text-slate-600'
                    }`}>
                        {d}
                    </span>
                    <div className="flex-1 flex flex-col gap-0 overflow-hidden leading-tight">
                        {displayLogs.map((log, idx) => {
                            if (log.status === 'Absent') return null; // don't write absent
                            if (log.status === 'OFF') {
                                if (log.reason === 'Weekly Off') return null;
                                return (
                                    <div key={idx} className="flex h-full w-full items-center justify-center">
                                        <span className="text-[9px] font-extrabold text-amber-700/60 uppercase tracking-widest text-center mt-1">
                                            {log.reason || 'OFF'}
                                        </span>
                                    </div>
                                );
                            }
                            return (
                                <div key={idx} className="text-[10px] font-bold py-0.5 w-full text-left overflow-hidden text-emerald-800" title={`In: ${log.checkIn} | Out: ${log.checkOut} | Time: ${log.workoutTime}`}>
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex justify-between items-center">
                                            <span className="opacity-70 text-[9px]">IN:</span>
                                            <span>{log.checkIn}</span>
                                        </div>
                                        {log.checkOut && log.checkOut !== '--:--' && (
                                            <div className="flex justify-between items-center opacity-90">
                                                <span className="opacity-70 text-[9px]">OUT:</span>
                                                <span>{log.checkOut}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return cells;
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* Member Attendance Table */}
            <div className="px-6 md:px-8 pb-6 pt-1">
                {memberAttendance.length > 0 ? (
                    <DataTable 
                        columns={columns} 
                        data={paginatedMemberAttendance} 
                        renderRow={renderRow} 
                        pagination={{
                            currentPage: currentPage,
                            totalItems: totalItems,
                            pageSize: pageSize,
                            onPageChange: (p) => setCurrentPage(p),
                            onPageSizeChange: (s) => setPageSize(s),
                            itemLabel: "member attendance records"
                        }}
                    />
                ) : (
                    <EmptyState 
                        icon={<FiClock size={48} />} 
                        title="No member attendance records found" 
                        subtitle="Try adjusting your date filters or search parameters." 
                    />
                )}
            </div>

            {/* View Attendance Full Day Table Modal with Date Picker for Member */}
            {selectedMember && (() => {
                const info = getMemberStatusInfo(selectedMember);
                const planName = selectedMember.membershipPlanId?.name || selectedMember.planName || 'General Plan';
                const selectedMemberPhone = selectedMember.memberId?.contactNumber || selectedMember.contactNumber || 'N/A';
                const selectedMemberStartDate = formatDate(info.start, '--/--/----');
                const selectedMemberEndDate = formatDate(info.end, '--/--/----');
                const customMemberId = selectedMember.memberId?.memberId || selectedMember.memberId || 'MEM-001';

                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[98vh] border border-slate-100">
                        
                        {/* Dark Premium Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-inner shrink-0">
                                    {(selectedMember.memberId?.firstName || selectedMember.firstName || 'M').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-lg text-white">
                                            Attendance Log: {selectedMember.memberId?.firstName ? `${selectedMember.memberId.firstName} ${selectedMember.memberId.lastName || ''}`.trim() : selectedMember.firstName ? `${selectedMember.firstName} ${selectedMember.lastName || ''}`.trim() : selectedMember.memberName || selectedMember.name || 'Gym Member'}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                                        Plan: {planName} • ID: {customMemberId}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedMember(null); setModalStartDate(''); setModalEndDate(''); }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Member Info & Plan Dates Header Banner */}
                        <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-emerald-50 border-b border-slate-200/60 flex flex-col gap-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-700">Membership Duration:</span>
                                    <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded border border-emerald-200">
                                        Start: {selectedMemberStartDate}
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-extrabold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded border border-rose-200">
                                        Expiry: {selectedMemberEndDate}
                                    </span>
                                </div>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${
                                    info.status === 'Active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                    info.status === 'Upcoming' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                    info.status === 'Expired' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                                    'text-slate-700 bg-slate-50 border-slate-200'
                                }`}>
                                    {info.status === 'Active' ? 'Active Membership' :
                                     info.status === 'Expired' ? 'Expired Membership' :
                                     info.status === 'Upcoming' ? 'Upcoming Plan' : 'No Plan'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
                                <span>Plan: <strong className="text-slate-800">{planName}</strong></span>
                                <span>• Phone: <strong className="text-slate-800">{selectedMemberPhone}</strong></span>
                                <span>• ID: <strong className="font-mono text-indigo-600 font-bold">{customMemberId}</strong></span>
                            </div>
                        </div>

                        {/* Date Picker Filter Bar & View Toggle inside Modal */}
                        <div className="p-3 px-5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <FiCalendar className="text-slate-400 text-sm" />
                                    <span className="text-xs font-bold text-slate-700">Attendance Log View:</span>
                                </div>
                                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                                    <button 
                                        onClick={() => setLogViewMode('calendar')}
                                        className={`p-1.5 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${logViewMode === 'calendar' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <FiCalendar size={14} /> Calendar
                                    </button>
                                    <button 
                                        onClick={() => setLogViewMode('list')}
                                        className={`p-1.5 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${logViewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <FiList size={14} /> List
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {logViewMode === 'calendar' ? (
                                    <div className="flex items-center gap-2 h-9 bg-slate-50 border border-slate-200 px-2 rounded-lg">
                                        <button onClick={prevCalendarMonth} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors">
                                            <FiChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs font-bold w-24 text-center text-slate-700">
                                            {calendarMonth.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                                        </span>
                                        <button onClick={nextCalendarMonth} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors">
                                            <FiChevronRight size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Modal Body: Full Day Attendance Log Table or Calendar Grid */}
                        <div className="p-3 px-5 flex-1 overflow-y-auto no-scrollbar bg-slate-50/30">
                            {logViewMode === 'list' ? (
                                <>
                                    <DataTable 
                                        columns={[
                                            { label: 'DATE', className: 'w-[20%] pl-6' },
                                            { label: 'CHECK IN', className: 'w-[20%] pl-3' },
                                            { label: 'CHECK OUT', className: 'w-[20%] pl-3' },
                                            { label: 'WORKOUT DURATION', className: 'w-[22%] pl-3' },
                                            { label: 'STATUS', className: 'w-[18%] pl-1 text-left' }
                                        ]}
                                        data={modalDailyLogs}
                                        loading={loadingLogs}
                                        emptyMessage="No records found for the selected period."
                                        renderRow={(log, index) => (
                                            <tr key={index} className="hover:bg-slate-50 transition-colors text-xs">
                                                <td className="py-3 pl-6 pr-3 font-bold text-slate-800 align-middle">
                                                    {log.date}
                                                </td>
                                                <td className={`py-3 px-3 font-bold align-middle ${log.status === 'Absent' || log.status === 'OFF' ? 'text-slate-400' : 'text-emerald-600'}`}>
                                                    {log.checkIn}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-slate-600 align-middle">
                                                    {log.checkOut}
                                                </td>
                                                <td className="py-3 px-3 font-black text-slate-800 align-middle">
                                                    {log.workoutTime}
                                                </td>
                                                <td className="py-3 pl-1 pr-3 align-middle text-left">
                                                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold rounded-full px-3 py-1 border leading-none shadow-2xs ${
                                                        log.status === 'Present' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                                                        log.status === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                        log.status === 'OFF' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {log.status === 'OFF' && log.reason ? log.reason : log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )}
                                    />
                                </>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                                            <div key={day} className="py-2.5 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-r border-slate-100 last:border-r-0">
                                                {day}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 bg-white">
                                        {renderCalendarCells()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                            <button 
                                onClick={() => { setSelectedMember(null); setModalStartDate(''); setModalEndDate(''); }}
                                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={exportMemberLogCSV}
                                className="px-4 py-2 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                            >
                                <FiDownload /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
