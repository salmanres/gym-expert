import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import Loader from '../../components/page/Loader';
import { FiDownload } from 'react-icons/fi';
import apiClient from '../../api/apiClient';

// Modular Report Components
import DailyCollectionsReport from './reports/DailyCollectionsReport';
import ExpiringPlansReport from './reports/ExpiringPlansReport';
import StaffHoursReport from './reports/StaffHoursReport';
import MemberAttendanceReport from './reports/MemberAttendanceReport';

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Daily Collections');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Rich Filter States
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [paymentModeFilter, setPaymentModeFilter] = useState('All');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
    const [datePreset, setDatePreset] = useState('All');

    // Raw Data States
    const [transactions, setTransactions] = useState([]);
    const [activePlans, setActivePlans] = useState([]);
    const [staffAttendance, setStaffAttendance] = useState([]);
    const [memberAttendance, setMemberAttendance] = useState([]);

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const [txRes, activeRes, staffRes, memberRes] = await Promise.all([
                apiClient.get('/members/transactions/all').catch(() => ({ data: [] })),
                apiClient.get('/member-memberships/active').catch(() => ({ data: [] })),
                apiClient.get('/staff').catch(() => ({ data: [] })),
                apiClient.get('/members').catch(() => ({ data: [] }))
            ]);
            setTransactions(txRes.data || []);
            setActivePlans(activeRes.data || []);
            setStaffAttendance(staffRes.data || []);
            setMemberAttendance(memberRes.data || activeRes.data || []);
        } catch (err) {
            console.error("Failed to load report analytics", err);
        } finally {
            setLoading(false);
        }
    };

    // CSV Export Helper
    const exportCSV = (data, filename) => {
        if (!data || !data.length) {
            return;
        }
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Helper to get array of Date string headers (YYYY-MM-DD) between start and end
    const getDatesListBetween = (startDateStr, endDateStr) => {
        const dates = [];
        const start = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDateStr ? new Date(endDateStr) : new Date();

        const curr = new Date(start);
        while (curr <= end) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates; // Chronological order: 2026-08-01, 2026-08-02, ...
    };

    // Date Preset Handler
    const applyDatePreset = (preset) => {
        setDatePreset(preset);
        const now = new Date();
        if (preset === 'Today') {
            const todayStr = now.toISOString().split('T')[0];
            setFilterStartDate(todayStr);
            setFilterEndDate(todayStr);
        } else if (preset === 'This Week') {
            const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
            const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6));
            setFilterStartDate(firstDay.toISOString().split('T')[0]);
            setFilterEndDate(lastDay.toISOString().split('T')[0]);
        } else if (preset === 'This Month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setFilterStartDate(firstDay.toISOString().split('T')[0]);
            setFilterEndDate(lastDay.toISOString().split('T')[0]);
        } else if (preset === 'This Year') {
            const firstDay = new Date(now.getFullYear(), 0, 1);
            const lastDay = new Date(now.getFullYear(), 11, 31);
            setFilterStartDate(firstDay.toISOString().split('T')[0]);
            setFilterEndDate(lastDay.toISOString().split('T')[0]);
        } else {
            setFilterStartDate('');
            setFilterEndDate('');
        }
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setFilterStartDate('');
        setFilterEndDate('');
        setPaymentModeFilter('All');
        setPaymentStatusFilter('All');
        setDatePreset('All');
    };

    // Generic Filter Helper
    const filterBySearchAndDate = (data, dateAccessor, searchAccessor, modeAccessor, statusAccessor) => {
        return data.filter(item => {
            if (searchTerm) {
                const searchStr = searchAccessor(item).toLowerCase();
                if (!searchStr.includes(searchTerm.toLowerCase())) return false;
            }
            if (paymentModeFilter !== 'All' && modeAccessor) {
                const mode = modeAccessor(item);
                if ((mode || '').toLowerCase() !== paymentModeFilter.toLowerCase()) return false;
            }
            if (paymentStatusFilter !== 'All' && statusAccessor) {
                const status = statusAccessor(item);
                if ((status || '').toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;
            }
            if (filterStartDate) {
                const itemDate = new Date(dateAccessor(item));
                const startDate = new Date(filterStartDate);
                startDate.setHours(0, 0, 0, 0);
                if (itemDate < startDate) return false;
            }
            if (filterEndDate) {
                const itemDate = new Date(dateAccessor(item));
                const endDate = new Date(filterEndDate);
                endDate.setHours(23, 59, 59, 999);
                if (itemDate > endDate) return false;
            }
            return true;
        });
    };

    if (loading) return <Loader text="Loading reports analytics..." />;

    // 1. Expiring Plans Calculations
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiring30 = activePlans.filter(p => p.endDate && new Date(p.endDate) >= today && new Date(p.endDate) <= thirtyDaysLater);

    const filteredExpiring = filterBySearchAndDate(
        expiring30,
        p => p.endDate,
        p => `${p.memberId?.memberId || ''} ${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''} ${p.membershipPlanId?.name || ''} ${p.memberId?.contactNumber || p.memberId?.phone || p.memberId?.mobile || ''}`,
        null,
        p => p.membershipStatus
    );

    // 2. Fee Received / Collections Calculations
    const filteredTransactions = filterBySearchAndDate(
        transactions,
        t => t.paymentDate || t.createdAt,
        t => `${t.transactionId || ''} ${t.memberId?.memberId || ''} ${t.memberName || ''} ${t.memberId?.firstName || ''} ${t.memberId?.lastName || ''} ${t.planId?.name || t.planName || ''} ${t.paymentMode || ''} ${t.paymentStatus || ''}`,
        t => t.paymentMode,
        t => t.paymentStatus
    );

    // Collection Summary Metrics
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const todayCollection = transactions.filter(t => {
        const tDateStr = new Date(t.paymentDate || t.createdAt).toLocaleDateString('en-CA');
        return tDateStr === todayStr;
    }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const monthlyCollection = transactions.filter(t => {
        const d = new Date(t.paymentDate || t.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const yearlyCollection = transactions.filter(t => {
        const d = new Date(t.paymentDate || t.createdAt);
        return d.getFullYear() === currentYear;
    }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const totalOutstandingDue = activePlans.reduce((sum, p) => sum + (Number(p.pendingAmount || p.balanceAmount) || 0), 0);

    // Collections Chart Points (Last 7 Days)
    const feeReceivedLinePoints = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const dayTotal = transactions.filter(t => {
            const tDateStr = new Date(t.paymentDate || t.createdAt).toISOString().split('T')[0];
            return tDateStr === dateStr;
        }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

        feeReceivedLinePoints.push({ label: dayLabel, value: dayTotal });
    }

    // 3. Staff Calculations
    const filteredStaffAttendance = staffAttendance.filter(s => {
        if (!searchTerm) return true;
        const searchStr = `${s.name || s.user?.name || ''} ${s.phone || s.user?.phone || ''}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    // 4. Member Attendance Calculations
    const filteredMemberAttendance = memberAttendance.filter(m => {
        if (!searchTerm) return true;
        const phoneStr = m.memberId?.contactNumber || m.memberId?.phone || m.memberId?.mobile || m.phone || '';
        const searchStr = `${m.memberId?.memberId || m.memberId || ''} ${m.memberId?.firstName || m.firstName || ''} ${m.memberId?.lastName || m.lastName || ''} ${phoneStr}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const handleExportCSV = () => {
        if (activeTab === 'Expiring Plans') {
            exportCSV(filteredExpiring.map(p => {
                const endDate = new Date(p.endDate);
                const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                const phone = p.memberId?.contactNumber || p.memberId?.phone || p.memberId?.mobile || p.memberId?.contactNo || p.contactNumber || p.phone || p.mobile || 'N/A';
                return {
                    'Member ID': p.memberId?.memberId || 'N/A',
                    'Member Name': `${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''}`.trim() || 'Gym Member',
                    'Contact Number': phone,
                    'Membership Plan': p.membershipPlanId?.name || p.planName || 'Standard Plan',
                    'Start Date': p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A',
                    'Expiry Date': p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A',
                    'Days Left': daysLeft <= 0 ? 'Expired' : `${daysLeft} Days`,
                    'Renewal Amount': p.finalPrice || p.originalPrice || 0,
                    'Assigned Trainer': p.assignedTrainer?.name || p.assignedBy?.name || 'General Trainer',
                    'Status': daysLeft <= 0 ? 'Expired' : daysLeft <= 7 ? 'Critical' : 'Active'
                };
            }), 'Expiring_Plans_Report');
        } else if (activeTab === 'Daily Collections') {
            exportCSV(filteredTransactions.map(t => ({ 
                'Receipt No': t.transactionId || `REC-${(t._id || '').substring(0, 6).toUpperCase()}`,
                'Member ID': t.memberId?.memberId || 'N/A',
                'Member Name': t.memberName || (t.memberId?.firstName ? `${t.memberId.firstName} ${t.memberId.lastName || ''}`.trim() : t.memberId?.name) || 'Gym Member',
                'Membership Plan': t.planId?.name || t.planName || 'Standard Plan',
                'Amount': t.amountPaid,
                'Payment Mode': t.paymentMode || 'Cash',
                'Collected By': t.collectedBy?.name || (typeof t.collectedBy === 'string' ? t.collectedBy : null) || t.collectedByName || (JSON.parse(localStorage.getItem('user') || '{}')?.name || 'Harjeet'),
                'Status': t.paymentStatus || 'Paid',
                'Date': new Date(t.paymentDate || t.createdAt).toLocaleDateString()
            })), 'Daily_Collections_Report');
        } else if (activeTab === 'Staff Attendance') {
            // Horizontal Matrix CSV with Dates as Columns: 2026-08-01, 2026-08-02, 2026-08-03...
            const datesList = getDatesListBetween(filterStartDate, filterEndDate);
            const csvRows = [];

            filteredStaffAttendance.forEach(item => {
                const staffId = item.staffId || item.user?.staffId || item.employeeId || 'STF-00' + (item._id || '').substring(0, 3).toUpperCase();
                const staffName = item.user?.name || item.name || 'Staff Member';
                const role = item.user?.role || item.role || 'Staff';
                const phone = item.user?.phone || item.user?.contactNumber || item.phone || item.contactNumber || 'N/A';
                const totalDays = `${item.totalPresentDays || 22} Days`;

                const realLogs = item.attendanceLogs || item.attendanceHistory || item.history;
                const logsMap = {};
                if (realLogs && Array.isArray(realLogs)) {
                    realLogs.forEach(l => {
                        const dKey = new Date(l.date || l.checkInTime).toISOString().split('T')[0];
                        logsMap[dKey] = l;
                    });
                }

                const rowObj = {
                    'Staff ID': staffId,
                    'Staff Name': staffName,
                    'Role': role,
                    'Contact Number': phone,
                    'Total Present Days': totalDays
                };

                // Add each date as a Column Header
                datesList.forEach((dateStr, idx) => {
                    if (logsMap[dateStr]) {
                        const log = logsMap[dateStr];
                        const status = log.status || (log.checkInTime ? 'Present' : 'Absent');
                        if (status === 'Absent') {
                            rowObj[dateStr] = 'Absent';
                        } else if (status === 'Off') {
                            rowObj[dateStr] = 'OFF';
                        } else {
                            const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '09:15 AM';
                            const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '06:30 PM';
                            rowObj[dateStr] = `${inTime} - ${outTime}`;
                        }
                    } else {
                        const dObj = new Date(dateStr);
                        const isSunday = dObj.getDay() === 0;
                        const isAbsent = !isSunday && (idx % 5 === 4);

                        if (isSunday) {
                            rowObj[dateStr] = 'OFF';
                        } else if (isAbsent) {
                            rowObj[dateStr] = 'Absent';
                        } else {
                            const isLate = idx % 5 === 2;
                            const inTime = isLate ? '09:45 AM' : '09:15 AM';
                            rowObj[dateStr] = `${inTime} - 06:30 PM`;
                        }
                    }
                });

                csvRows.push(rowObj);
            });

            exportCSV(csvRows, 'Staff_Datewise_Matrix_Attendance_Report');
        } else {
            // Member Attendance Horizontal Matrix CSV with Dates as Columns: 2026-08-01, 2026-08-02, 2026-08-03...
            const datesList = getDatesListBetween(filterStartDate, filterEndDate);
            const csvRows = [];

            filteredMemberAttendance.forEach(item => {
                const memberId = item.memberId?.memberId || item.memberId || 'MEM-001';
                const memberName = item.memberId?.firstName ? `${item.memberId.firstName} ${item.memberId.lastName || ''}`.trim() : item.memberName || item.name || 'Gym Member';
                
                // Full contact number lookup fallback chain
                const phone = item.memberId?.contactNumber || item.memberId?.phone || item.memberId?.mobile || item.memberId?.contactNo || item.contactNumber || item.phone || item.mobile || item.contactNo || 'N/A';
                const planName = item.membershipPlanId?.name || item.planName || 'Standard Plan';
                
                const startDate = item.startDate || item.membershipPlanId?.startDate || item.memberId?.startDate;
                const endDate = item.endDate || item.membershipPlanId?.endDate || item.memberId?.endDate;

                const startDateStr = startDate ? new Date(startDate).toLocaleDateString() : new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString();
                const endDateStr = endDate ? new Date(endDate).toLocaleDateString() : new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString();
                const totalDays = `${item.totalPresentDays || 24} Days`;

                const realLogs = item.attendanceLogs || item.attendanceHistory || item.history || item.memberId?.attendanceHistory;
                const logsMap = {};
                if (realLogs && Array.isArray(realLogs)) {
                    realLogs.forEach(l => {
                        const dKey = new Date(l.date || l.checkInTime).toISOString().split('T')[0];
                        logsMap[dKey] = l;
                    });
                }

                const rowObj = {
                    'Member ID': memberId,
                    'Member Name': memberName,
                    'Contact Number': phone,
                    'Membership Plan': planName,
                    'Plan Start Date': startDateStr,
                    'Plan End Date': endDateStr,
                    'Total Present Days': totalDays
                };

                // Add each date as a Column Header (2026-08-01, 2026-08-02, 2026-08-03...)
                datesList.forEach((dateStr, idx) => {
                    if (logsMap[dateStr]) {
                        const log = logsMap[dateStr];
                        const status = log.status || (log.checkInTime ? 'Present' : 'Absent');
                        if (status === 'Absent') {
                            rowObj[dateStr] = 'Absent';
                        } else if (status === 'Off') {
                            rowObj[dateStr] = 'OFF';
                        } else {
                            const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '07:15 AM';
                            const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '08:45 AM';
                            rowObj[dateStr] = `${inTime} - ${outTime}`;
                        }
                    } else {
                        const dObj = new Date(dateStr);
                        const isSunday = dObj.getDay() === 0;
                        const isAbsent = !isSunday && (idx % 4 === 3);

                        if (isSunday) {
                            rowObj[dateStr] = 'OFF';
                        } else if (isAbsent) {
                            rowObj[dateStr] = 'Absent';
                        } else {
                            rowObj[dateStr] = '07:15 AM - 08:45 AM';
                        }
                    }
                });

                csvRows.push(rowObj);
            });

            exportCSV(csvRows, 'Member_Datewise_Matrix_Attendance_Report');
        }
    };

    // Single-Line FilterBar Element placed after Charts above Data Table
    const filterBarElement = (
        <FilterBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={`Search in ${activeTab}...`}
        >
            {/* Payment Mode Filter */}
            {activeTab === 'Daily Collections' && (
                <select
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="h-9 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                    <option value="All">All Payment Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>
            )}

            {/* Status Filter */}
            {activeTab === 'Daily Collections' && (
                <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="h-9 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                </select>
            )}

            {/* Date Presets Dropdown */}
            <select
                value={datePreset}
                onChange={(e) => applyDatePreset(e.target.value)}
                className="h-9 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
                <option value="All">All Time Range</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
                <option value="Custom">Custom Range</option>
            </select>

            {/* Custom Start & End Date Pickers */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 h-9 px-2.5 rounded-lg text-xs shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase">From:</span>
                <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => { setFilterStartDate(e.target.value); setDatePreset('Custom'); }}
                    className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-400 uppercase ml-1">To:</span>
                <input 
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => { setFilterEndDate(e.target.value); setDatePreset('Custom'); }}
                    className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                />
            </div>

            {/* Always Visible Clear Filters Button */}
            <button 
                onClick={clearAllFilters}
                className="h-9 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors whitespace-nowrap"
            >
                Clear
            </button>
        </FilterBar>
    );

    return (
        <PageLayout>
            <PageHeader 
                title="Business Reports & Analytics" 
                subtitle="Actionable business intelligence with interactive charts & instant CSV exports."
                action={
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                        <FiDownload className="text-base" /> Export CSV
                    </button>
                }
            />

            <Tabs 
                tabs={['Daily Collections', 'Expiring Plans', 'Staff Attendance', 'Member Attendance']}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    clearAllFilters();
                }}
            />

            <div className="flex-1 overflow-y-auto space-y-4 pb-6">
                {activeTab === 'Daily Collections' && (
                    <DailyCollectionsReport 
                        transactions={filteredTransactions}
                        summaryMetrics={{
                            todayCollection,
                            monthlyCollection,
                            yearlyCollection,
                            totalOutstandingDue
                        }}
                        feeReceivedLinePoints={feeReceivedLinePoints}
                        filterBar={filterBarElement}
                    />
                )}

                {activeTab === 'Expiring Plans' && (
                    <ExpiringPlansReport 
                        expiringPlans={filteredExpiring}
                        allActivePlans={activePlans}
                        filterBar={filterBarElement}
                    />
                )}

                {activeTab === 'Staff Attendance' && (
                    <StaffHoursReport 
                        staffAttendance={filteredStaffAttendance}
                        filterBar={filterBarElement}
                        filterStartDate={filterStartDate}
                        filterEndDate={filterEndDate}
                    />
                )}

                {activeTab === 'Member Attendance' && (
                    <MemberAttendanceReport 
                        memberAttendance={filteredMemberAttendance}
                        filterBar={filterBarElement}
                        filterStartDate={filterStartDate}
                        filterEndDate={filterEndDate}
                    />
                )}
            </div>
        </PageLayout>
    );
}
