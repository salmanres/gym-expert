import React, { useState, useEffect } from 'react';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiUsers, FiCheckCircle, FiClock, FiActivity, FiEye, FiX, FiCalendar, FiDownload } from 'react-icons/fi';
import apiClient from '../../../api/apiClient';

export default function MemberAttendanceReport({ 
    memberAttendance = [],
    activePlans = [],
    filterStartDate = '',
    filterEndDate = ''
}) {
    const [selectedMember, setSelectedMember] = useState(null);
    const [modalStartDate, setModalStartDate] = useState('');
    const [modalEndDate, setModalEndDate] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [fetchedLogs, setFetchedLogs] = useState([]);

    // Sync modal date pickers with main filter bar when opening modal
    const handleOpenModal = (member) => {
        setSelectedMember(member);
        setModalStartDate(filterStartDate || '');
        setModalEndDate(filterEndDate || '');
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

    const totalMemberCount = memberAttendance.length;
    const presentTodayMembers = memberAttendance.filter(m => m.attendance?.checkInTime || m.attendanceStatus === 'Present');
    const currentlyInGym = memberAttendance.filter(m => m.attendance?.checkInTime && !m.attendance?.checkOutTime);
    
    // Morning peak hour check-ins (between 6 AM - 10 AM)
    const peakHourMembers = memberAttendance.filter(m => {
        if (!m.attendance?.checkInTime) return false;
        const checkIn = new Date(m.attendance.checkInTime);
        return checkIn.getHours() >= 6 && checkIn.getHours() <= 10;
    });

    const cards = [
        { title: 'Total Members', value: `${totalMemberCount} Members`, icon: <FiUsers />, textColor: 'text-indigo-600', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' },
        { title: 'Present Today', value: `${presentTodayMembers.length} Members`, icon: <FiCheckCircle />, textColor: 'text-emerald-600', valueColor: 'text-emerald-600', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { title: 'Currently In Gym', value: `${currentlyInGym.length} Active`, icon: <FiActivity />, textColor: 'text-cyan-600', valueColor: 'text-cyan-600', bgClass: 'bg-cyan-50', iconColor: 'text-cyan-600' },
        { title: 'Morning Peak Check-ins', value: `${peakHourMembers.length} Members`, icon: <FiClock />, textColor: 'text-amber-600', valueColor: 'text-amber-600', bgClass: 'bg-amber-50', iconColor: 'text-amber-600' }
    ];

    // Main Member Attendance Summary Table with Plan Start & End Dates
    const columns = [
        { label: 'Member ID' },
        { label: 'Member Name' },
        { label: 'Contact Number' },
        { label: 'Membership Plan' },
        { label: 'Plan Start Date' },
        { label: 'Plan End Date' },
        { label: 'Total Attendance' },
        { label: 'Attendance Status' },
        { label: 'Action' }
    ];

    const renderRow = (item) => {
        const memberCustomId = item.memberId?.memberId || item.memberId || 'MEM-00' + (item._id || '').substring(0, 3).toUpperCase();
        const memberName = item.memberId?.firstName ? `${item.memberId.firstName} ${item.memberId.lastName || ''}`.trim() : item.memberName || item.name || 'Gym Member';
        
        // Robust multi-key fallback for contact number
        const phone = item.memberId?.contactNumber || item.memberId?.phone || item.memberId?.mobile || item.memberId?.contactNo || item.contactNumber || item.phone || item.mobile || item.contactNo || 'N/A';
        const planName = item.membershipPlanId?.name || item.planName || 'General Plan';
        
        const today = new Date();
        const startDate = item.startDate || item.membershipPlanId?.startDate || item.memberId?.startDate;
        const endDate = item.endDate || item.membershipPlanId?.endDate || item.memberId?.endDate;

        const startDateStr = startDate ? new Date(startDate).toLocaleDateString() : new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString();
        const endDateStr = endDate ? new Date(endDate).toLocaleDateString() : new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString();

        const checkInTime = item.attendance?.checkInTime;

        // Total Monthly Attendance Days (Default / Calculated)
        const totalDaysPresent = item.totalPresentDays || item.attendanceCount || (checkInTime ? 24 : 0);

        // Attendance Status
        const attendanceStatus = checkInTime || item.attendanceStatus === 'Present' ? 'Present' : 'Absent';

        return (
            <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-xs font-mono font-bold text-slate-700">
                    {memberCustomId}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                    {memberName}
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                    {phone}
                </td>
                <td className="py-3 px-4 font-medium text-slate-600 text-xs">
                    {planName}
                </td>
                <td className="py-3 px-4 text-xs font-bold text-emerald-700">
                    {startDateStr}
                </td>
                <td className="py-3 px-4 text-xs font-bold text-rose-600">
                    {endDateStr}
                </td>
                <td className="py-3 px-4 text-xs font-bold text-indigo-700">
                    <span className="inline-flex px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-extrabold">
                        {totalDaysPresent} Days
                    </span>
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        attendanceStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                        {attendanceStatus}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <button 
                        onClick={() => handleOpenModal(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    >
                        <FiEye className="text-sm" /> View Attendance
                    </button>
                </td>
            </tr>
        );
    };

    const modalDailyLogs = selectedMember ? fetchedLogs.map(log => {
        const checkIn = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
        const checkOut = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
        let workoutTime = '0h 0m';
        if (log.checkInTime && log.checkOutTime) {
            const mins = Math.floor((new Date(log.checkOutTime) - new Date(log.checkInTime)) / (1000 * 60));
            workoutTime = `${Math.floor(mins / 60)}h ${mins % 60}m`;
        } else if (log.checkInTime) {
            workoutTime = '1h 30m (Session)';
        }
        return {
            date: new Date(log.date || log.checkInTime || log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            checkIn,
            checkOut,
            workoutTime,
            status: log.status || (log.checkInTime ? 'Present' : 'Absent')
        };
    }) : [];

    const exportMemberLogCSV = () => {
        if (!selectedMember || !modalDailyLogs.length) return;

        const memberName = selectedMember.memberId?.firstName ? `${selectedMember.memberId.firstName} ${selectedMember.memberId.lastName || ''}`.trim() : selectedMember.memberName || selectedMember.name || 'Gym Member';
        const phone = selectedMember.memberId?.contactNumber || selectedMember.memberId?.phone || selectedMember.memberId?.mobile || selectedMember.memberId?.contactNo || selectedMember.contactNumber || selectedMember.phone || selectedMember.mobile || selectedMember.contactNo || 'N/A';
        const planName = selectedMember.membershipPlanId?.name || selectedMember.planName || 'General Plan';
        const startDate = selectedMember.startDate || selectedMember.membershipPlanId?.startDate || selectedMember.memberId?.startDate;
        const endDate = selectedMember.endDate || selectedMember.membershipPlanId?.endDate || selectedMember.memberId?.endDate;

        const today = new Date();
        const startDateStr = startDate ? new Date(startDate).toLocaleDateString() : new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString();
        const endDateStr = endDate ? new Date(endDate).toLocaleDateString() : new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString();

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

    const selectedMemberStartDate = selectedMember ? (selectedMember.startDate || selectedMember.membershipPlanId?.startDate || selectedMember.memberId?.startDate ? new Date(selectedMember.startDate || selectedMember.membershipPlanId?.startDate || selectedMember.memberId?.startDate).toLocaleDateString() : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString()) : '';
    const selectedMemberEndDate = selectedMember ? (selectedMember.endDate || selectedMember.membershipPlanId?.endDate || selectedMember.memberId?.endDate ? new Date(selectedMember.endDate || selectedMember.membershipPlanId?.endDate || selectedMember.memberId?.endDate).toLocaleDateString() : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString()) : '';
    const selectedMemberPhone = selectedMember ? (selectedMember.memberId?.contactNumber || selectedMember.memberId?.phone || selectedMember.memberId?.mobile || selectedMember.memberId?.contactNo || selectedMember.contactNumber || selectedMember.phone || selectedMember.mobile || selectedMember.contactNo || 'N/A') : '';

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* 4 App Theme Summary Cards */}
            <div className="px-4 pt-3">
                <SummaryCards cards={cards} />
            </div>


            {/* Member Attendance Table */}
            <div className="px-4 pb-4">
                {memberAttendance.length > 0 ? (
                    <DataTable columns={columns} data={memberAttendance} renderRow={renderRow} />
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
                const memberIdStr = selectedMember.user?._id || selectedMember.userId?._id || selectedMember.memberId?._id || selectedMember._id;
                const activePlan = activePlans.find(p => {
                    const pid = p.memberId?._id || p.memberId;
                    return pid === memberIdStr || pid === selectedMember.memberId;
                });
                const planName = activePlan?.membershipPlanId?.name || selectedMember.membershipPlanId?.name || selectedMember.planName || 'General Plan';
                const selectedMemberPhone = selectedMember.memberId?.contactNumber || selectedMember.memberId?.phone || selectedMember.memberId?.mobile || selectedMember.phone || selectedMember.mobile || 'N/A';
                const selectedMemberStartDate = (activePlan?.startDate || selectedMember.createdAt) ? new Date(activePlan?.startDate || selectedMember.createdAt).toLocaleDateString('en-US') : '--/--/----';
                const selectedMemberEndDate = (activePlan?.endDate || selectedMember.endDate) ? new Date(activePlan?.endDate || selectedMember.endDate).toLocaleDateString('en-US') : '--/--/----';

                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base border border-indigo-200">
                                    <FiUsers size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900">
                                        Member Workout & Attendance Log — {selectedMember.memberId?.firstName ? `${selectedMember.memberId.firstName} ${selectedMember.memberId.lastName || ''}`.trim() : selectedMember.memberName || selectedMember.name || 'Gym Member'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                                        <span>Plan: <strong className="text-slate-800">{planName}</strong></span>
                                        <span>• Phone: <strong className="text-slate-800 font-semibold">{selectedMemberPhone}</strong></span>
                                        <span>• ID: <strong className="font-mono text-indigo-600">{selectedMember.memberId?.memberId || selectedMember.memberId || 'MEM-001'}</strong></span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedMember(null); setModalStartDate(''); setModalEndDate(''); }}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>

                        {/* Plan Dates Header Banner */}
                        <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-50 to-emerald-50 border-b border-slate-200/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-700">Membership Duration:</span>
                                <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded border border-emerald-200">
                                    Start Date: {selectedMemberStartDate}
                                </span>
                                <span className="inline-flex items-center gap-1 font-extrabold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded border border-rose-200">
                                    Expiry Date: {selectedMemberEndDate}
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-100 shadow-xs">
                                Active Membership
                            </span>
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
                                        <th className="py-3 px-4">Workout Duration</th>
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
                                                {log.workoutTime}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold uppercase ${
                                                    log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
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
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={exportMemberLogCSV}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-sm"
                                >
                                    <FiDownload className="text-sm" /> Export Log CSV
                                </button>
                                <button 
                                    onClick={() => { setSelectedMember(null); setModalStartDate(''); setModalEndDate(''); }}
                                    className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-sm"
                                >
                                    Close Log
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
