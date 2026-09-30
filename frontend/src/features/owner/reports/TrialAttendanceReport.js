import React, { useState, useEffect } from 'react';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import { 
    FiUsers, FiCheckCircle, FiClock, FiActivity, FiEye, FiX, 
    FiCalendar, FiDownload, FiPhone, FiList, FiChevronLeft, FiChevronRight,
    FiTag, FiUserCheck, FiAlertCircle
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import apiClient from '../../../api/apiClient';
import { formatDate, toInputDateFormat, getTodayInputDate } from '../../../utils/dateUtils';
import DatePicker from '../../../components/form/DatePicker';

export default function TrialAttendanceReport({
    trialAttendance = [],
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

    const [selectedTrial, setSelectedTrial] = useState(null);
    const [modalStartDate, setModalStartDate] = useState('');
    const [modalEndDate, setModalEndDate] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [fetchedLogs, setFetchedLogs] = useState([]);
    
    // Calendar & List view mode
    const [logViewMode, setLogViewMode] = useState('calendar'); // 'list' | 'calendar'
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const handleOpenModal = (trial) => {
        setSelectedTrial(trial);
        setModalStartDate(filterStartDate || '');
        setModalEndDate(filterEndDate || '');
        setLogViewMode('calendar');
        setCalendarMonth(new Date());
        setFetchedLogs([]);
        fetchLogs(trial, filterStartDate || '', filterEndDate || '');
    };

    const fetchLogs = async (trial, start, end) => {
        if (!trial) return;
        setLoadingLogs(true);
        try {
            const userId = trial._id;
            let url = `/attendance/history/${userId}`;
            const params = new URLSearchParams();
            if (start) params.append('startDate', start);
            if (end) params.append('endDate', end);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await apiClient.get(url);
            setFetchedLogs(res.data || []);
        } catch (error) {
            console.error("Failed to fetch trial logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (selectedTrial) {
            fetchLogs(selectedTrial, modalStartDate, modalEndDate);
        }
    }, [modalStartDate, modalEndDate]);

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const getTrialDatesInfo = (item) => {
        const start = item.trialDate ? new Date(item.trialDate) : null;
        if (start) start.setHours(0, 0, 0, 0);

        let end = item.trialEndDate ? new Date(item.trialEndDate) : null;
        if (!end && start) {
            end = new Date(start);
        }
        if (end) end.setHours(23, 59, 59, 999);

        if (!start && !end) {
            return { status: 'No Dates', start: null, end: null, isActive: false };
        }

        if (item.status === 'Converted') {
            return { status: 'Converted', start, end, isActive: false };
        }

        if (start && todayObj < start) {
            return { status: 'Upcoming', start, end, isActive: false };
        }

        if (end && todayObj > end) {
            return { status: 'Expired', start, end, isActive: false };
        }

        return { status: 'Active', start, end, isActive: true };
    };

    let activeTrialsCount = 0;
    let expiredTrialsCount = 0;
    let convertedTrialsCount = 0;

    trialAttendance.forEach(t => {
        const info = getTrialDatesInfo(t);
        if (info.status === 'Active') activeTrialsCount++;
        else if (info.status === 'Expired') expiredTrialsCount++;
        else if (info.status === 'Converted') convertedTrialsCount++;
    });

    const totalTrialsCount = trialAttendance.length;
    const presentTodayTrials = trialAttendance.filter(t => t.attendance?.checkInTime || t.attendanceStatus === 'Present');
    const currentlyInGym = trialAttendance.filter(t => t.attendance?.checkInTime && !t.attendance?.checkOutTime);

    const cards = [
        {
            title: 'Total Trial Leads',
            value: `${totalTrialsCount} Trials`,
            percentage: 'All Time',
            percentageColor: 'text-purple-600',
            icon: <FiUsers />,
            subtitle: 'Registered trial guests',
            bgClass: 'bg-[#FFECEC]',
            iconColor: 'text-[#CA0410]'
        },
        {
            title: 'Active Trial Period',
            value: `${activeTrialsCount} Active`,
            percentage: `${totalTrialsCount > 0 ? Math.round((activeTrialsCount / totalTrialsCount) * 100) : 0}%`,
            percentageColor: 'text-emerald-600',
            icon: <FiCheckCircle />,
            subtitle: 'Currently valid trials',
            bgClass: 'bg-[#E8F5E9]',
            iconColor: 'text-[#2E7D32]'
        },
        {
            title: 'Present Today',
            value: `${presentTodayTrials.length} Trials`,
            percentage: 'Today',
            percentageColor: 'text-blue-600',
            icon: <FiActivity />,
            subtitle: 'Logged check-ins',
            bgClass: 'bg-[#E3F2FD]',
            iconColor: 'text-[#1976D2]'
        },
        {
            title: 'Currently On Floor',
            value: `${currentlyInGym.length} Active`,
            percentage: 'Live',
            percentageColor: 'text-purple-600',
            icon: <FiClock />,
            subtitle: 'Trial workout in progress',
            bgClass: 'bg-[#F3E8FF]',
            iconColor: 'text-[#7E22CE]'
        }
    ];

    const avatarStyles = [
        { bg: 'bg-[#FFECEC]', text: 'text-[#CA0410]' },
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

    const totalItems = trialAttendance.length;
    const paginatedTrialAttendance = trialAttendance.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = [
        { label: 'TRIAL GUEST', className: 'w-[24%] pl-6' },
        { label: 'CONTACT INFO', className: 'w-[18%] pl-3' },
        { label: 'TRIAL DATES', className: 'w-[18%] pl-3' },
        { label: 'TRIAL STATUS', className: 'w-[12%] pl-1 text-left' },
        { label: 'TODAY ATTENDANCE', className: 'w-[14%] pl-1 text-left' },
        { label: 'ATTENDED SESSIONS', className: 'w-[14%] pl-3' },
        { label: 'ACTIONS', className: 'w-[8%] text-center pr-6' }
    ];

    const renderRow = (item, index) => {
        const trialCustomId = item.enquiryId || `TRL-${(item._id || '').substring(0, 5).toUpperCase()}`;
        const guestName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Trial Guest';
        const cleanPhone = item.contactNumber ? String(item.contactNumber).replace(/\D/g, '') : '';
        const email = item.email || '';
        
        const datesInfo = getTrialDatesInfo(item);
        const startDateStr = formatDate(datesInfo.start, 'N/A');
        const endDateStr = formatDate(datesInfo.end, 'N/A');
        const avatarStyle = getAvatarStyle(guestName, index);

        const checkInTime = item.attendance?.checkInTime;
        const checkOutTime = item.attendance?.checkOutTime;
        const totalDaysPresent = item.totalPresentDays !== undefined ? item.totalPresentDays : (checkInTime ? 1 : 0);

        let todayStatusBadge = null;
        if (checkInTime) {
            const inTimeStr = new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            if (checkOutTime) {
                const outTimeStr = new Date(checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                todayStatusBadge = (
                    <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Present
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-medium">
                            {inTimeStr} - {outTimeStr}
                        </span>
                    </div>
                );
            } else {
                todayStatusBadge = (
                    <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            In Gym ({inTimeStr})
                        </span>
                    </div>
                );
            }
        } else if (datesInfo.status === 'Expired') {
            todayStatusBadge = <span className="text-xs font-semibold text-slate-400">Trial Expired</span>;
        } else if (datesInfo.status === 'Upcoming') {
            todayStatusBadge = <span className="text-xs font-semibold text-amber-600">Not Started</span>;
        } else {
            todayStatusBadge = <span className="text-xs font-semibold text-rose-500">Absent Today</span>;
        }

        return (
            <tr key={item._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                {/* 1. TRIAL GUEST */}
                <td className="py-3.5 pl-6 pr-3 align-middle">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${avatarStyle.bg} ${avatarStyle.text} font-bold text-sm flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs`}>
                            {(guestName || 'T').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 text-[14.5px] leading-tight truncate">
                                {guestName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 font-medium mt-0.5">
                                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">{trialCustomId}</span>
                                <span>•</span>
                                <span>{item.gender || 'Guest'}</span>
                            </div>
                        </div>
                    </div>
                </td>

                {/* 2. CONTACT */}
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[12.5px] leading-snug">
                        {item.contactNumber ? (
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[14px]">
                                <a href={`tel:${cleanPhone}`} className="flex items-center gap-1 hover:text-[#CA0410] transition-colors">
                                    <FiPhone className="text-slate-400 text-xs shrink-0" />
                                    <span>{item.contactNumber}</span>
                                </a>
                                {cleanPhone && (
                                    <a
                                        href={`https://wa.me/91${cleanPhone}?text=Hi%20${encodeURIComponent(guestName)},%20how%20was%20your%20trial%20session%20at%20the%20gym%3F`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer ml-1"
                                        title="Chat on WhatsApp"
                                    >
                                        <FaWhatsapp size={12} />
                                    </a>
                                )}
                            </div>
                        ) : (
                            <span className="text-slate-400">No phone</span>
                        )}
                        {email && (
                            <span className="text-[12px] text-slate-500 truncate max-w-[150px]">{email}</span>
                        )}
                    </div>
                </td>

                {/* 3. TRIAL DATES */}
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5">
                        <div className="text-[13px] font-bold text-slate-800">
                            {startDateStr} <span className="text-slate-400 font-normal">to</span> {endDateStr}
                        </div>
                        {item.trialDays ? (
                            <span className="text-[11.5px] font-medium text-slate-500">
                                {item.trialDays} Day{item.trialDays > 1 ? 's' : ''} Pass
                            </span>
                        ) : null}
                    </div>
                </td>

                {/* 4. TRIAL STATUS */}
                <td className="py-3.5 px-1 align-middle">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold border shadow-2xs ${
                        datesInfo.status === 'Active' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        datesInfo.status === 'Converted' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        datesInfo.status === 'Upcoming' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                        {datesInfo.status === 'Active' ? 'Active Trial' : datesInfo.status}
                    </span>
                </td>

                {/* 5. TODAY ATTENDANCE */}
                <td className="py-3.5 px-1 align-middle">
                    {todayStatusBadge}
                </td>

                {/* 6. TOTAL ATTENDED SESSIONS */}
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {totalDaysPresent} {totalDaysPresent === 1 ? 'Session' : 'Sessions'}
                        </span>
                    </div>
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

    // Calendar Helper
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
        // Empty cells for alignment
        for (let i = 0; i < firstDayOfMonth; i++) {
            dayCells.push(<div key={`empty-${i}`} className="h-16 bg-slate-50/50 rounded-xl border border-transparent"></div>);
        }

        const datesInfo = selectedTrial ? getTrialDatesInfo(selectedTrial) : {};

        for (let d = 1; d <= daysInMonth; d++) {
            const currentCellDate = new Date(year, month, d);
            const dateStr = toInputDateFormat(currentCellDate);
            const log = datesMap[dateStr];
            const isToday = toInputDateFormat(new Date()) === dateStr;
            const closedInfo = isGymClosed(currentCellDate);

            const isWithinTrial = datesInfo.start && datesInfo.end && currentCellDate >= datesInfo.start && currentCellDate <= datesInfo.end;

            let cellBg = "bg-white";
            let statusBadge = null;

            if (log && log.checkInTime) {
                cellBg = "bg-emerald-50/70 border-emerald-200";
                const inTime = new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                statusBadge = (
                    <div className="mt-1">
                        <span className="text-[10px] font-bold text-emerald-700 block truncate">
                            {inTime}
                        </span>
                        <span className="text-[9px] font-extrabold text-emerald-600 uppercase">Present</span>
                    </div>
                );
            } else if (closedInfo.closed) {
                cellBg = "bg-slate-100/70 border-slate-200";
                statusBadge = <span className="text-[9.5px] font-bold text-slate-400 mt-1 block">{closedInfo.reason}</span>;
            } else if (isWithinTrial && currentCellDate <= todayObj) {
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

    // CSV for single trial modal export
    const handleExportModalLogs = () => {
        if (!fetchedLogs.length || !selectedTrial) return;
        const guestName = `${selectedTrial.firstName || ''} ${selectedTrial.lastName || ''}`.trim() || 'Trial_Guest';
        const headers = ["Date", "Status", "Check In Time", "Check Out Time", "Duration (Minutes)", "Source"];
        const rows = fetchedLogs.map(l => {
            const inTime = l.checkInTime ? new Date(l.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
            const outTime = l.checkOutTime ? new Date(l.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
            let duration = '-';
            if (l.checkInTime && l.checkOutTime) {
                duration = Math.round((new Date(l.checkOutTime) - new Date(l.checkInTime)) / 60000);
            }
            return [
                formatDate(l.date || l.checkInTime),
                l.status || 'Present',
                inTime,
                outTime,
                duration,
                l.source || 'Manual'
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${guestName}_Trial_Attendance_Logs.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            {/* Top Cards for Trial Attendance */}
            <div className="px-6 md:px-8">
                <SummaryCards cards={cards} loading={loading} />
            </div>

            {/* Trial Attendance DataTable */}
            <div className="px-6 md:px-8">
                <DataTable
                    columns={columns}
                    data={paginatedTrialAttendance}
                    renderRow={renderRow}
                    loading={loading}
                    totalItems={totalItems}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    emptyTitle="No trial attendance records found"
                    emptySubtitle="No trial guests found matching the selected filters or date range."
                />
            </div>

            {/* 360° Attendance History Modal */}
            {selectedTrial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold flex items-center justify-center border border-white/20">
                                    {(selectedTrial.firstName || 'T').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">
                                        {selectedTrial.firstName} {selectedTrial.lastName || ''}
                                    </h3>
                                    <p className="text-xs text-slate-300">
                                        Trial ID: <span className="font-bold text-white">{selectedTrial.enquiryId || `TRL-${(selectedTrial._id || '').substring(0, 5).toUpperCase()}`}</span> • Phone: {selectedTrial.contactNumber || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTrial(null)}
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
                                {fetchedLogs.length > 0 && (
                                    <button
                                        onClick={handleExportModalLogs}
                                        className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                        title="Export Trial Logs CSV"
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
                                    <span className="text-xs font-medium">Loading trial attendance history...</span>
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
                                /* List View */
                                <div>
                                    {fetchedLogs.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400">
                                            <FiClock className="mx-auto text-3xl mb-2 text-slate-300" />
                                            <p className="text-xs font-bold text-slate-600">No attendance logs found</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">No trial check-ins recorded for this period.</p>
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                    <tr>
                                                        <th className="py-2.5 px-4">Date</th>
                                                        <th className="py-2.5 px-4">Check-in Time</th>
                                                        <th className="py-2.5 px-4">Check-out Time</th>
                                                        <th className="py-2.5 px-4">Duration</th>
                                                        <th className="py-2.5 px-4">Source</th>
                                                        <th className="py-2.5 px-4">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {fetchedLogs.map(log => {
                                                        const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                                                        const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                                                        let duration = '-';
                                                        if (log.checkInTime && log.checkOutTime) {
                                                            const diffMins = Math.round((new Date(log.checkOutTime) - new Date(log.checkInTime)) / 60000);
                                                            const hrs = Math.floor(diffMins / 60);
                                                            const mins = diffMins % 60;
                                                            duration = `${hrs > 0 ? `${hrs}h ` : ''}${mins}m`;
                                                        }
                                                        return (
                                                            <tr key={log._id} className="hover:bg-slate-50/80">
                                                                <td className="py-2.5 px-4 font-bold text-slate-800">{formatDate(log.date || log.checkInTime)}</td>
                                                                <td className="py-2.5 px-4 text-emerald-700 font-semibold">{inTime}</td>
                                                                <td className="py-2.5 px-4 text-slate-600">{outTime}</td>
                                                                <td className="py-2.5 px-4 text-slate-700 font-medium">{duration}</td>
                                                                <td className="py-2.5 px-4 text-slate-500">{log.source || 'Manual'}</td>
                                                                <td className="py-2.5 px-4">
                                                                    <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setSelectedTrial(null)}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
