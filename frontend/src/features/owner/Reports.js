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

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const [txRes, activeRes, staffRes] = await Promise.all([
                apiClient.get('/members/transactions/all').catch(() => ({ data: [] })),
                apiClient.get('/member-memberships/active').catch(() => ({ data: [] })),
                apiClient.get('/staff').catch(() => ({ data: [] }))
            ]);
            setTransactions(txRes.data || []);
            setActivePlans(activeRes.data || []);
            setStaffAttendance(staffRes.data || []);
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
        p => `${p.memberId?.memberId || ''} ${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''} ${p.membershipPlanId?.name || ''} ${p.memberId?.contactNumber || ''}`,
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
    const filteredStaffAttendance = filterBySearchAndDate(
        staffAttendance,
        s => s.createdAt || new Date(),
        s => `${s.name || s.user?.name || ''} ${s.phone || s.user?.phone || ''}`
    );

    const handleExportCSV = () => {
        if (activeTab === 'Expiring Plans') {
            exportCSV(filteredExpiring.map(p => {
                const endDate = new Date(p.endDate);
                const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                return {
                    'Member ID': p.memberId?.memberId || 'N/A',
                    'Member Name': `${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''}`.trim() || 'Gym Member',
                    'Contact Number': p.memberId?.contactNumber || 'N/A',
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
        } else {
            exportCSV(filteredStaffAttendance.map(s => ({ 
                'Staff Name': s.name || s.user?.name || 'N/A',
                'Contact Phone': s.phone || s.user?.phone || 'N/A',
                'Role': s.role || s.user?.role || 'Staff',
                'Status': 'Active'
            })), 'Staff_Shifts_Report');
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
                tabs={['Daily Collections', 'Expiring Plans', 'Staff Working Hours']}
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

                {activeTab === 'Staff Working Hours' && (
                    <StaffHoursReport 
                        staffAttendance={filteredStaffAttendance}
                        filterBar={filterBarElement}
                    />
                )}
            </div>
        </PageLayout>
    );
}
