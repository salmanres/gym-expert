import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Tabs from '../../components/page/Tabs';
import SummaryCards from '../../components/page/SummaryCards';
import LineChart from '../../components/page/LineChart';
import FilterBar from '../../components/page/FilterBar';
import DataTable from '../../components/page/DataTable';
import EmptyState from '../../components/page/EmptyState';
import Loader from '../../components/page/Loader';
import { 
    FiAlertCircle, FiClock, FiDollarSign, FiDownload, 
    FiUsers, FiCalendar, FiTrendingUp, FiCheckCircle, FiPieChart 
} from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Daily Collections');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Date Filters
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [activePlans, setActivePlans] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [staffAttendance, setStaffAttendance] = useState([]);

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const [activePlansRes, txRes, staffAttRes] = await Promise.all([
                    apiClient.get('/member-memberships/active').catch(() => ({ data: [] })),
                    apiClient.get('/members/transactions/all').catch(() => ({ data: [] })),
                    apiClient.get(`/attendance/daily-sheet?date=${todayStr}&type=staff`).catch(() => ({ data: [] }))
                ]);

                setActivePlans(activePlansRes.data || []);
                setTransactions((txRes.data || []).filter(t => Number(t.amountPaid) > 0));
                setStaffAttendance(staffAttRes.data || []);
            } catch (err) {
                toast.error("Failed to load report data");
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, []);

    // CSV Export Helper
    const exportCSV = (data, filename) => {
        if (!data || !data.length) {
            toast.info("No data available to export");
            return;
        }
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${v ?? ''}"`).join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filename} report!`);
    };

    // Filter Helper
    const filterBySearchAndDate = (items, getDate, getSearchStr) => {
        return items.filter(item => {
            if (filterStartDate || filterEndDate) {
                const rawDate = getDate(item);
                if (!rawDate) return false;
                const itemDateStr = new Date(rawDate).toISOString().split('T')[0];

                const startStr = filterStartDate || filterEndDate;
                const endStr = filterEndDate || filterStartDate;

                if (itemDateStr < startStr || itemDateStr > endStr) return false;
            }
            if (searchTerm) {
                return getSearchStr(item).toLowerCase().includes(searchTerm.toLowerCase());
            }
            return true;
        });
    };

    if (loading) return <Loader text="Loading reports analytics..." />;

    // 1. Expiring Plans Calculations
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiring30 = activePlans.filter(p => p.endDate && new Date(p.endDate) >= today && new Date(p.endDate) <= thirtyDaysLater);
    const expiring7 = activePlans.filter(p => p.endDate && new Date(p.endDate) >= today && new Date(p.endDate) <= sevenDaysLater);

    const filteredExpiring = filterBySearchAndDate(
        expiring30,
        p => p.endDate,
        p => `${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''} ${p.membershipPlanId?.name || ''}`
    );
    const totalExpiringVal = filteredExpiring.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    // 2. Pending Dues Calculations
    const pendingDuesMemberships = activePlans.filter(p => Number(p.pendingAmount) > 0);
    const filteredPendingDues = filterBySearchAndDate(
        pendingDuesMemberships,
        p => p.createdAt || p.startDate,
        p => `${p.memberId?.firstName || ''} ${p.memberId?.lastName || ''} ${p.membershipPlanId?.name || ''}`
    );
    const totalPendingDuesAmount = filteredPendingDues.reduce((sum, p) => sum + (Number(p.pendingAmount) || 0), 0);
    const avgPending = filteredPendingDues.length ? Math.round(totalPendingDuesAmount / filteredPendingDues.length) : 0;

    // 3. Fee Received / Collections Calculations (Dynamic per Date Filter)
    const filteredTransactions = filterBySearchAndDate(
        transactions,
        t => t.paymentDate || t.createdAt,
        t => `${t.memberName || t.memberId?.name || ''} ${t.paymentMode || ''}`
    );

    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const cashCollections = filteredTransactions
        .filter(t => (t.paymentMode || '').toLowerCase() === 'cash')
        .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const upiCollections = filteredTransactions
        .filter(t => (t.paymentMode || '').toLowerCase() === 'upi')
        .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const cardCollections = filteredTransactions
        .filter(t => ['card', 'debit card', 'credit card'].includes((t.paymentMode || '').toLowerCase()))
        .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const otherCollections = totalRevenue - (cashCollections + upiCollections + cardCollections);

    // Dynamic Line Chart points based on selected Date Range or Default 1-Week
    let feeReceivedLinePoints = [];
    const effectiveStartStr = filterStartDate || (filterEndDate ? filterEndDate : null);
    const effectiveEndStr = filterEndDate || (filterStartDate ? filterStartDate : null);

    if (effectiveStartStr && effectiveEndStr) {
        const start = new Date(effectiveStartStr);
        const end = new Date(effectiveEndStr);
        const dayCount = Math.min(30, Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1));
        
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

            const dayTotal = transactions.filter(t => {
                const tDateStr = new Date(t.paymentDate || t.createdAt).toISOString().split('T')[0];
                return tDateStr === dateStr;
            }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

            feeReceivedLinePoints.push({ label: dayLabel, value: dayTotal });
        }
    } else {
        // Default: 1 Week (Past 7 Days)
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

            const dayTotal = transactions.filter(t => {
                const tDateStr = new Date(t.paymentDate || t.createdAt).toISOString().split('T')[0];
                return tDateStr === dateStr;
            }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

            feeReceivedLinePoints.push({ label: dayLabel, value: dayTotal });
        }
    }

    // 4. Staff Calculations
    const filteredStaffAttendance = filterBySearchAndDate(
        staffAttendance,
        s => s.attendance?.date || new Date(),
        s => `${s.user?.name || ''} ${s.user?.phone || ''}`
    );
    const onDutyStaff = filteredStaffAttendance.filter(s => s.attendance?.checkInTime && !s.attendance?.checkOutTime);
    const completedStaff = filteredStaffAttendance.filter(s => s.attendance?.checkOutTime);

    // Standard Cards per Tab
    const cardsByTab = {
        'Daily Collections': [
            { title: 'Total Collections', value: `₹${totalRevenue.toLocaleString()}`, icon: <FiDollarSign />, textColor: 'text-emerald-600', valueColor: 'text-emerald-600', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { title: 'Total Payments Count', value: `${filteredTransactions.length} Transactions`, icon: <FiTrendingUp />, textColor: 'text-indigo-600', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' },
            { title: 'Average Payment / Txn', value: `₹${filteredTransactions.length ? Math.round(totalRevenue / filteredTransactions.length).toLocaleString() : 0}`, icon: <FiPieChart />, textColor: 'text-blue-600', valueColor: 'text-blue-600', bgClass: 'bg-blue-50', iconColor: 'text-blue-600' }
        ],
        'Expiring Plans': [
            { title: 'Critical (Next 7 Days)', value: `${expiring7.length} Plans`, icon: <FiAlertCircle />, textColor: 'text-rose-500', valueColor: 'text-rose-600', bgClass: 'bg-rose-50', iconColor: 'text-rose-600' },
            { title: 'Expiring (Next 30 Days)', value: `${expiring30.length} Plans`, icon: <FiCalendar />, textColor: 'text-amber-500', valueColor: 'text-amber-600', bgClass: 'bg-amber-50', iconColor: 'text-amber-600' },
            { title: 'Est. Renewal Value', value: `₹${totalExpiringVal.toLocaleString()}`, icon: <FiDollarSign />, textColor: 'text-indigo-500', valueColor: 'text-slate-800', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' }
        ],
        'Pending Dues': [
            { title: 'Total Defaulters', value: `${filteredPendingDues.length} Members`, icon: <FiUsers />, textColor: 'text-rose-500', valueColor: 'text-rose-600', bgClass: 'bg-rose-50', iconColor: 'text-rose-600' },
            { title: 'Total Dues Outstanding', value: `₹${totalPendingDuesAmount.toLocaleString()}`, icon: <FiDollarSign />, textColor: 'text-slate-500', valueColor: 'text-slate-800', bgClass: 'bg-slate-100', iconColor: 'text-slate-700' },
            { title: 'Average Due Per Member', value: `₹${avgPending.toLocaleString()}`, icon: <FiTrendingUp />, textColor: 'text-indigo-500', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' }
        ],
        'Staff Working Hours': [
            { title: 'Total Staff Registered', value: `${filteredStaffAttendance.length} Members`, icon: <FiUsers />, textColor: 'text-slate-500', valueColor: 'text-slate-800', bgClass: 'bg-slate-100', iconColor: 'text-slate-700' },
            { title: 'Currently On Duty', value: `${onDutyStaff.length} On Duty`, icon: <FiCheckCircle />, textColor: 'text-emerald-600', valueColor: 'text-emerald-600', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { title: 'Shifts Completed Today', value: `${completedStaff.length} Shifts`, icon: <FiClock />, textColor: 'text-blue-600', valueColor: 'text-blue-600', bgClass: 'bg-blue-50', iconColor: 'text-blue-600' }
        ]
    };

    // Tab Columns & Data Table Details
    let columns = [];
    let filteredData = [];
    let renderRow = null;
    let emptyIcon = <FiAlertCircle size={48} />;
    let emptyTitle = "No records found";

    if (activeTab === 'Daily Collections') {
        columns = [
            { label: 'Member Name' },
            { label: 'Amount Collected' },
            { label: 'Payment Mode' },
            { label: 'Date & Time' }
        ];
        filteredData = filteredTransactions;
        renderRow = (tx) => (
            <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                    {tx.memberName || tx.memberId?.name || 'Gym Member'}
                </td>
                <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                    ₹{Number(tx.amountPaid || 0).toLocaleString()}
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded uppercase ${
                        (tx.paymentMode || '').toLowerCase() === 'cash' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        (tx.paymentMode || '').toLowerCase() === 'upi' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                        {tx.paymentMode || 'Cash'}
                    </span>
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-500">
                    {new Date(tx.paymentDate || tx.createdAt).toLocaleDateString()}
                </td>
            </tr>
        );
        emptyIcon = <FiDollarSign size={48} />;
        emptyTitle = "No collection records found";
    } else if (activeTab === 'Expiring Plans') {
        columns = [
            { label: 'Member Name' },
            { label: 'Plan Name' },
            { label: 'Expiry Date' },
            { label: 'Status / Days Left' }
        ];
        filteredData = filteredExpiring;
        renderRow = (p) => {
            const daysLeft = Math.ceil((new Date(p.endDate) - today) / (1000 * 60 * 60 * 24));
            return (
                <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                        {p.memberId?.firstName} {p.memberId?.lastName || ''}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 text-xs">
                        {p.membershipPlanId?.name || 'Custom Plan'}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-rose-600">
                        {new Date(p.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold ${daysLeft <= 7 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {daysLeft <= 0 ? 'Expiring Today' : `${daysLeft} Days Left`}
                        </span>
                    </td>
                </tr>
            );
        };
        emptyIcon = <FiCalendar size={48} />;
        emptyTitle = "No plans expiring soon";
    } else if (activeTab === 'Pending Dues') {
        columns = [
            { label: 'Member Name' },
            { label: 'Plan Name' },
            { label: 'Total Amount' },
            { label: 'Pending Dues' }
        ];
        filteredData = filteredPendingDues;
        renderRow = (p) => (
            <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                    {p.memberId?.firstName} {p.memberId?.lastName || ''}
                </td>
                <td className="py-3 px-4 font-medium text-slate-600 text-xs">
                    {p.membershipPlanId?.name || 'Standard Plan'}
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                    ₹{Number(p.totalAmount || 0).toLocaleString()}
                </td>
                <td className="py-3 px-4 font-black text-rose-600 text-sm">
                    ₹{Number(p.pendingAmount || 0).toLocaleString()}
                </td>
            </tr>
        );
        emptyIcon = <FiAlertCircle size={48} />;
        emptyTitle = "No pending dues found";
    } else if (activeTab === 'Staff Working Hours') {
        columns = [
            { label: 'Staff / Trainer Name' },
            { label: 'Shift Status' },
            { label: 'Check In' },
            { label: 'Check Out' }
        ];
        filteredData = filteredStaffAttendance;
        renderRow = (item) => (
            <tr key={item.user._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">{item.user.name}</td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold uppercase ${item.attendance?.checkOutTime ? 'bg-blue-50 text-blue-700 border border-blue-200' : item.attendance?.checkInTime ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                        {item.attendance?.checkOutTime ? 'Completed' : item.attendance?.checkInTime ? 'On Duty' : 'Not Checked In'}
                    </span>
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-600">
                    {item.attendance?.checkInTime ? new Date(item.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-600">
                    {item.attendance?.checkOutTime ? new Date(item.attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                </td>
            </tr>
        );
        emptyIcon = <FiClock size={48} />;
        emptyTitle = "No staff attendance records found";
    }

    return (
        <PageLayout>
            <PageHeader 
                title="Business Reports & Analytics" 
                subtitle="Actionable business report intelligence with CSV exports & fee received line charts."
                action={
                    <button 
                        onClick={() => {
                            if (activeTab === 'Expiring Plans') exportCSV(filteredData.map(p => ({ Member: `${p.memberId?.firstName} ${p.memberId?.lastName || ''}`, Plan: p.membershipPlanId?.name || 'Custom', ExpiryDate: new Date(p.endDate).toLocaleDateString() })), 'Expiring_Plans_Report');
                            else if (activeTab === 'Pending Dues') exportCSV(filteredData.map(p => ({ Member: `${p.memberId?.firstName} ${p.memberId?.lastName || ''}`, TotalAmount: p.totalAmount, PendingDues: p.pendingAmount })), 'Pending_Dues_Report');
                            else if (activeTab === 'Daily Collections') exportCSV(filteredData.map(t => ({ Member: t.memberName || t.memberId?.name || 'N/A', Amount: t.amountPaid, Mode: t.paymentMode, Date: new Date(t.paymentDate || t.createdAt).toLocaleDateString() })), 'Daily_Collections_Report');
                            else exportCSV(filteredData.map(s => ({ Staff: s.user?.name, CheckIn: s.attendance?.checkInTime || 'N/A', CheckOut: s.attendance?.checkOutTime || 'N/A' })), 'Staff_Shifts_Report');
                        }}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                        <FiDownload className="text-base" /> Export CSV
                    </button>
                }
            />

            <Tabs 
                tabs={['Daily Collections', 'Expiring Plans', 'Pending Dues', 'Staff Working Hours']}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSearchTerm('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                }}
            />

            {/* Standard 0-Margin Content Wrapper matching Members.js & Finance.js */}
            <div className="p-4 md:p-6 space-y-6 m-0 border-0">
                {/* Filter Bar (Search + Date Range Picker) */}
                <FilterBar 
                    searchTerm={searchTerm} 
                    onSearchChange={setSearchTerm} 
                    searchPlaceholder={`Search ${activeTab.toLowerCase()}...`}
                >
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm h-10 px-2 transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 w-full sm:w-auto">
                        <input 
                            type="date" 
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="text-sm focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                            title="From Date"
                        />
                        <span className="text-slate-300 mx-2 font-medium text-xs">TO</span>
                        <input 
                            type="date" 
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="text-sm focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                            title="To Date"
                        />
                    </div>
                </FilterBar>

                {/* 1. Standard Top Summary Cards */}
                <SummaryCards cards={cardsByTab[activeTab]} />

                {/* 2. Side-by-Side LineChart & Payment Method Breakdown Panel */}
                {activeTab === 'Daily Collections' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Main LineChart */}
                        <div className="lg:col-span-2">
                            <LineChart 
                                title={effectiveStartStr && effectiveEndStr ? `Fee Received Trend (${effectiveStartStr} to ${effectiveEndStr})` : "Fee Received (1-Week Trend)"}
                                subtitle={effectiveStartStr && effectiveEndStr ? "Total collections grouped day-by-day in selected date range" : "Daily collections overview for the last 7 days"}
                                points={feeReceivedLinePoints}
                                color="#10b981"
                            />
                        </div>

                        {/* Payment Mode Breakdown Side Panel */}
                        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                                            Payment Breakdown
                                        </h4>
                                        <p className="text-xs text-slate-400">Cash, UPI & Card collections</p>
                                    </div>
                                    <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                        <FiPieChart className="text-lg" />
                                    </span>
                                </div>

                                <div className="space-y-3.5">
                                    {/* Cash */}
                                    <div>
                                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                                            <span className="flex items-center gap-1.5 text-amber-700">
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                                                Cash Received
                                            </span>
                                            <span className="text-slate-800 font-black">₹{cashCollections.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalRevenue ? Math.round((cashCollections / totalRevenue) * 100) : 0}%` }}></div>
                                        </div>
                                    </div>

                                    {/* UPI */}
                                    <div>
                                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                                            <span className="flex items-center gap-1.5 text-indigo-700">
                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                                                UPI Payments
                                            </span>
                                            <span className="text-slate-800 font-black">₹{upiCollections.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalRevenue ? Math.round((upiCollections / totalRevenue) * 100) : 0}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Card & Transfers */}
                                    <div>
                                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                                            <span className="flex items-center gap-1.5 text-blue-700">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                                                Card & Transfers
                                            </span>
                                            <span className="text-slate-800 font-black">₹{(cardCollections + otherCollections).toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalRevenue ? Math.round(((cardCollections + otherCollections) / totalRevenue) * 100) : 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium">Total Mode Revenue</span>
                                <span className="font-black text-emerald-600 text-sm">₹{totalRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Detailed Data Table */}
                {filteredData.length > 0 ? (
                    <DataTable 
                        columns={columns} 
                        data={filteredData} 
                        loading={loading}
                        emptyMessage={`No ${activeTab.toLowerCase()} records found.`}
                        renderRow={renderRow} 
                    />
                ) : (
                    <EmptyState 
                        icon={emptyIcon}
                        title={searchTerm ? `No ${activeTab.toLowerCase()} records match search` : emptyTitle}
                        description={searchTerm ? `No results for "${searchTerm}"` : `There are no ${activeTab.toLowerCase()} records available.`}
                    />
                )}
            </div>
        </PageLayout>
    );
}
