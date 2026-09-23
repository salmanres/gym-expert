import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import EmptyState from '../../components/page/EmptyState';
import Loader from '../../components/page/Loader';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import SummaryCards from '../../components/page/SummaryCards';
import { FiCheckCircle, FiXCircle, FiClock, FiUserCheck, FiPhone, FiX, FiCalendar, FiUsers, FiTrendingUp, FiActivity } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from '../../utils/toast';
import DatePicker from '../../components/form/DatePicker';
import { formatDate, toInputDateFormat, getTodayInputDate } from '../../utils/dateUtils';

export default function AttendanceDashboard() {
    const [sheet, setSheet] = useState([]);
    const [gymStatus, setGymStatus] = useState({ isClosed: false, closedReason: '' });
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayInputDate());
    const [activeTab, setActiveTab] = useState('Members');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
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
        setCurrentPage(1);
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

    const isStaffTab = activeTab === 'Staff';
    const isTrialTab = activeTab === 'Trial';
    
    // Filter Sheet by Search Term
    const filteredSheet = sheet.filter(item => {
        if (!searchTerm) return true;
        const name = (item.user?.name || item.user?.firstName || '').toLowerCase();
        const phone = (item.user?.phone || item.user?.contactNumber || '').toLowerCase();
        const id = (item.user?.memberId || item.user?.staffId || item.user?._id || '').toLowerCase();
        const plan = (item.user?.planName || '').toLowerCase();
        const memStatus = (item.user?.membershipStatus || item.user?.status || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || phone.includes(term) || id.includes(term) || plan.includes(term) || memStatus.includes(term);
    });

    const totalItems = filteredSheet.length;
    const paginatedSheet = filteredSheet.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = isStaffTab ? [
        { label: 'STAFF MEMBER', className: 'w-[22%] pl-4 pr-3' },
        { label: 'CONTACT', className: 'w-[13%] px-3' },
        { label: 'SHIFT', className: 'w-[11%] px-3' },
        { label: 'ATTENDANCE', className: 'w-[12%] px-2 text-center' },
        { label: 'CHECK IN', className: 'w-[10%] px-3' },
        { label: 'CHECK OUT', className: 'w-[10%] px-3' },
        { label: 'WORK HOURS', className: 'w-[10%] px-3' },
        { label: 'ACTIONS', className: 'w-[12%] pr-4 pl-1 text-center' }
    ] : isTrialTab ? [
        { label: 'TRIAL LEAD', className: 'w-[22%] pl-4 pr-3' },
        { label: 'CONTACT', className: 'w-[13%] px-3' },
        { label: 'LEAD STATUS', className: 'w-[12%] px-2 text-center' },
        { label: 'ATTENDANCE', className: 'w-[12%] px-2 text-center' },
        { label: 'CHECK IN', className: 'w-[10%] px-3' },
        { label: 'CHECK OUT', className: 'w-[10%] px-3' },
        { label: 'WORKOUT HOURS', className: 'w-[10%] px-3' },
        { label: 'ACTIONS', className: 'w-[11%] pr-4 pl-1 text-center' }
    ] : [
        { label: 'MEMBER', className: 'w-[20%] pl-4 pr-3' },
        { label: 'CONTACT', className: 'w-[12%] px-3' },
        { label: 'MEMBERSHIP STATUS', className: 'w-[14%] px-2 text-center' },
        { label: 'ATTENDANCE', className: 'w-[12%] px-2 text-center' },
        { label: 'CHECK IN', className: 'w-[10%] px-3' },
        { label: 'CHECK OUT', className: 'w-[10%] px-3' },
        { label: 'WORKOUT HOURS', className: 'w-[11%] px-3' },
        { label: 'ACTIONS', className: 'w-[11%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (item, index) => {
        const { user, attendance } = item;
        let currentStatus = attendance?.status || 'Unmarked';
        const displayName = (user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim() || `Member (${(user.memberId || user._id.slice(-5)).toUpperCase()})`;
        const memStatus = user.membershipStatus || user.status || 'No Plan';
        
        const todayStr = getTodayInputDate();
        const isPastDate = selectedDate < todayStr;
        
        if (currentStatus === 'Unmarked' && gymStatus.isClosed) {
            currentStatus = 'Holiday';
        } else if (currentStatus === 'Unmarked' && isPastDate) {
            currentStatus = 'Absent';
        }

        const workHoursStr = calculateWorkHours(attendance?.checkInTime, attendance?.checkOutTime);
        
        return (
            <tr key={user._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                {/* PERSON */}
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        {user.profilePhoto ? (
                            <img src={user.profilePhoto} alt={displayName} className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                                {(displayName || 'M').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex flex-col items-start min-w-0">
                            <p className="font-bold text-slate-900 text-[13.5px] leading-tight truncate max-w-[170px]">
                                {displayName}
                            </p>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                {isStaffTab && user.role ? (
                                    <span className="font-bold text-[#CA0410] uppercase">{user.role}</span>
                                ) : (
                                    <span>ID: <span className="font-bold text-slate-700">{user.memberId || user.staffId || user._id.slice(-5)}</span></span>
                                )}
                            </p>
                        </div>
                    </div>
                </td>

                {/* CONTACT */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[12.5px] tracking-tight">
                        <FiPhone className="text-slate-400 text-xs shrink-0" />
                        <span>{user.phone || 'N/A'}</span>
                    </div>
                </td>

                {/* SHIFT (for Staff) */}
                {isStaffTab && (
                    <td className="py-2.5 px-3 align-middle">
                        {user.shiftStart && user.shiftEnd ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[11.5px] rounded-full border border-slate-200">
                                <FiClock className="text-slate-500 text-[10px]" /> {user.shiftStart} - {user.shiftEnd}
                            </span>
                        ) : (
                            <span className="text-[11.5px] text-slate-400 font-medium">Not set</span>
                        )}
                    </td>
                )}

                {/* LEAD STATUS (for Trial) */}
                {isTrialTab && (
                    <td className="py-2.5 px-2 text-center align-middle">
                        <span className="inline-flex items-center justify-center text-[11.5px] font-bold rounded-lg px-2.5 py-0.5 border leading-none shadow-2xs bg-purple-50 text-purple-700 border-purple-200">
                            {user.status || 'Trial'}
                        </span>
                    </td>
                )}

                {/* MEMBERSHIP STATUS (for Members) */}
                {!isStaffTab && !isTrialTab && (
                    <td className="py-2.5 px-2 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className={`inline-flex items-center justify-center text-[11.5px] font-bold rounded-lg px-2.5 py-0.5 border leading-none shadow-2xs ${
                                memStatus === 'Active' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                                memStatus === 'Frozen' ? 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]' :
                                'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]'
                            }`}>
                                {memStatus}
                            </span>
                            {user.planName && (
                                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[125px]" title={user.planName}>
                                    {user.planName}
                                </span>
                            )}
                        </div>
                    </td>
                )}

                {/* ATTENDANCE STATUS */}
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12px] font-bold rounded-lg px-3 py-1 border leading-none shadow-2xs ${
                        currentStatus === 'Present' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        currentStatus === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        currentStatus === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        currentStatus === 'Half-Day' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        currentStatus === 'Holiday' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                        {currentStatus === 'Holiday' ? `Off (${gymStatus.closedReason || 'Closed'})` : (currentStatus === 'Unmarked' ? 'Not Marked' : currentStatus)}
                    </span>
                </td>

                {/* CHECK IN */}
                <td className="py-2.5 px-3 align-middle">
                    {attendance?.checkInTime ? (
                         <span className="text-[12.5px] text-slate-900 font-bold">
                             {new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                    ) : <span className="text-slate-400 font-medium text-xs">-</span>}
                </td>

                {/* CHECK OUT */}
                <td className="py-2.5 px-3 align-middle">
                    {attendance?.checkOutTime ? (
                         <span className="text-[12.5px] text-slate-900 font-bold">
                             {new Date(attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                    ) : <span className="text-slate-400 font-medium text-xs">-</span>}
                </td>

                {/* WORK / WORKOUT HOURS */}
                <td className="py-2.5 px-3 align-middle">
                    {attendance?.checkInTime ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11.5px] font-bold border ${attendance?.checkOutTime ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {workHoursStr}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400 font-medium">-</span>
                    )}
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {!(selectedDate > todayStr) && (
                            <>
                                {(currentStatus === 'Unmarked' || currentStatus === 'Absent' || currentStatus === 'Holiday') && (
                                    <button 
                                        onClick={() => handleMarkAttendance(user._id, 'Present')}
                                        className="w-8 h-8 rounded-lg border border-emerald-200 text-emerald-600 bg-white hover:bg-emerald-50 hover:border-emerald-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                                        title="Mark Present"
                                    >
                                        <FiCheckCircle size={15} className="text-emerald-600" />
                                    </button>
                                )}

                                {(currentStatus === 'Unmarked' || currentStatus === 'Holiday') && (
                                    <button 
                                        onClick={() => handleMarkAttendance(user._id, 'Absent')}
                                        className="w-8 h-8 rounded-lg border border-rose-200 text-[#CA0410] bg-white hover:bg-rose-50 hover:border-rose-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                                        title="Mark Absent"
                                    >
                                        <FiXCircle size={15} className="text-[#CA0410]" />
                                    </button>
                                )}

                                {currentStatus === 'Present' && !attendance?.checkOutTime && (
                                    <button 
                                        onClick={() => handleMarkAttendance(user._id, null)}
                                        className="w-8 h-8 rounded-lg border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                                        title="Check Out"
                                    >
                                        <FiClock size={15} className="text-blue-600" />
                                    </button>
                                )}
                                
                                {currentStatus !== 'Absent' && currentStatus !== 'Unmarked' && (
                                    <button 
                                        onClick={() => handleMarkAttendance(user._id, 'Absent')}
                                        className="w-8 h-8 rounded-lg border border-rose-200 text-[#CA0410] bg-white hover:bg-rose-50 hover:border-rose-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                                        title="Override to Absent"
                                    >
                                        <FiXCircle size={14} className="text-rose-600" /> 
                                    </button>
                                )}

                                {currentStatus !== 'Unmarked' && (
                                    <button 
                                        onClick={() => handleMarkAttendance(user._id, 'Clear')}
                                        className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 bg-white hover:bg-slate-100 hover:border-slate-300 flex items-center justify-center transition-all shadow-2xs cursor-pointer shrink-0"
                                        title="Clear Attendance"
                                    >
                                        <FiX size={14} className="text-slate-500" /> 
                                    </button>
                                )}
                            </>
                        )}
                        {(selectedDate > todayStr) && (
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Future Date</span>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    const totalCount = sheet.length;
    const presentCount = sheet.filter(s => s.attendance?.status === 'Present').length;
    const todayStr = getTodayInputDate();
    const absentCount = sheet.filter(s => {
        const currentStatus = s.attendance?.status || 'Unmarked';
        return currentStatus === 'Absent' || (!gymStatus.isClosed && currentStatus === 'Unmarked' && selectedDate < todayStr);
    }).length;
    const currentlyActiveCount = sheet.filter(s => s.attendance?.checkInTime && !s.attendance?.checkOutTime).length;
    const completedSessionsCount = sheet.filter(s => s.attendance?.checkOutTime).length;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    const offCount = gymStatus.isClosed ? sheet.filter(s => !s.attendance?.status).length : 0;

    const summaryCardsData = [
        {
            title: 'Present Today',
            value: presentCount,
            percentage: `${attendancePercentage}%`,
            percentageColor: 'text-emerald-600',
            subtitle: 'Checked in today',
            icon: <FiCheckCircle />,
            bgClass: 'bg-[#E8F5E9]',
            iconColor: 'text-[#2E7D32]'
        },
        {
            title: 'Absent / Unmarked',
            value: absentCount,
            percentage: 'Absent',
            percentageColor: 'text-rose-600',
            subtitle: 'Not attended today',
            icon: <FiXCircle />,
            bgClass: 'bg-[#FFEBEE]',
            iconColor: 'text-[#E53935]'
        },
        {
            title: 'Currently in Gym',
            value: currentlyActiveCount,
            percentage: 'Live',
            percentageColor: 'text-blue-600',
            subtitle: 'Active workout sessions',
            icon: <FiClock />,
            bgClass: 'bg-[#E3F2FD]',
            iconColor: 'text-[#1976D2]'
        },
        {
            title: 'Attendance Rate',
            value: `${attendancePercentage}%`,
            percentage: 'Daily',
            percentageColor: 'text-amber-600',
            subtitle: 'Present vs Total members',
            icon: <FiTrendingUp />,
            bgClass: 'bg-[#FFF9C4]',
            iconColor: 'text-[#F57F17]'
        }
    ];

    return (
        <PageLayout>
            <PageHeader 
                title="Daily Attendance Dashboard" 
                subtitle="View and manually override attendance for your members or staff."
            />

            <div className="px-6 md:px-8 pb-2 pt-0 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={summaryCardsData} loading={loading} />
            </div>

            <Tabs 
                tabs={['Members', 'Staff', 'Trial']} 
                activeTab={activeTab} 
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSearchTerm('');
                    setCurrentPage(1);
                }} 
            />

            {gymStatus.isClosed && (
                <div className="mx-6 md:mx-8 my-2 p-3.5 bg-indigo-50/90 backdrop-blur-sm border border-indigo-200/80 rounded-xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                        </span>
                        <span className="text-xs font-bold text-indigo-900">
                            Gym is Closed Today ({gymStatus.closedReason || 'Weekly Off'}). Unmarked records show as "Off".
                        </span>
                    </div>
                </div>
            )}

            <FilterBar
                searchTerm={searchTerm}
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setCurrentPage(1);
                }}
                searchPlaceholder={`Search ${activeTab.toLowerCase()} by name, phone...`}
            >
                {/* Date Picker Input */}
                <div className="shrink-0">
                    <DatePicker
                        compact={true}
                        value={selectedDate}
                        max={getTodayInputDate()}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        placeholder="Select Date"
                    />
                </div>

                {/* Quick Metric Badges */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 h-9 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold shadow-2xs">
                        <span>Present:</span>
                        <span className="font-black text-[13px]">{presentCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 h-9 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold shadow-2xs">
                        <span>Absent:</span>
                        <span className="font-black text-[13px]">{absentCount}</span>
                    </div>
                    {gymStatus.isClosed && (
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold shadow-2xs">
                            <span>Off:</span>
                            <span className="font-black text-[13px]">{offCount}</span>
                        </div>
                    )}
                </div>
            </FilterBar>

            <div className="px-6 md:px-8 pb-6 pt-1 bg-[#FAEEEF] w-full flex flex-col gap-4 min-h-0 flex-1">
                <DataTable 
                    columns={columns} 
                    data={paginatedSheet} 
                    loading={loading}
                    emptyMessage={searchTerm ? `No ${activeTab.toLowerCase()} match "${searchTerm}".` : `No ${activeTab.toLowerCase()} records found.`}
                    renderRow={renderRow} 
                    pagination={{
                        currentPage: currentPage,
                        totalItems: totalItems,
                        pageSize: pageSize,
                        onPageChange: (p) => setCurrentPage(p),
                        onPageSizeChange: (s) => setPageSize(s),
                        itemLabel: activeTab.toLowerCase()
                    }}
                />
            </div>
        </PageLayout>
    );
}
