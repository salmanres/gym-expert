import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import SummaryCards from '../../components/page/SummaryCards';
import { FiCreditCard, FiEye, FiTrash2, FiPhone, FiDollarSign, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiClock, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';

export default function Finance() {
    const [members, setMembers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Payments'); // 'Payments', 'Pending Dues', 'Transactions'
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterMode, setFilterMode] = useState('All');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    
    const navigate = useNavigate();

    const openPaymentModal = (m) => {
        navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: m } });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [memRes, txRes, activeRes] = await Promise.all([
                apiClient.get('/members'),
                apiClient.get('/members/transactions/all'),
                apiClient.get('/member-memberships/active')
            ]);
            
            const activeMemberships = activeRes.data;
            const membersWithPlans = memRes.data.map(member => {
                const membership = activeMemberships.find(m => m.memberId?._id === member._id);
                if (membership) {
                    member.membershipPlan = membership.membershipPlanId;
                    member.paymentStatus = membership.paymentStatus;
                    member.amountPaid = membership.paidAmount;
                    member.planStartDate = membership.startDate;
                    member.planEndDate = membership.endDate;
                }
                return member;
            }).filter(m => m.membershipPlan);
            
            setMembers(membersWithPlans);
            setTransactions((txRes.data || []).filter(t => Number(t.amountPaid) > 0));
            setLoading(false);
        } catch (error) {
            toast.error("Failed to fetch finance records");
            setLoading(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm("Are you sure you want to delete this transaction record? This action cannot be undone.")) {
            return;
        }
        try {
            await apiClient.delete(`/members/transactions/${id}`);
            toast.success("Transaction deleted successfully");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete transaction");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

    const filteredMembers = members.filter(m => {
        const matchesSearch = (m.firstName + ' ' + (m.lastName || '')).toLowerCase().includes(searchTerm.toLowerCase()) || (m.contactNumber || '').includes(searchTerm);
        if (!matchesSearch) return false;
        
        // Apply Dropdown Filters
        if (filterStatus !== 'All' && (m.paymentStatus || 'Pending') !== filterStatus) return false;
        if (filterMode !== 'All' && (m.paymentMode || 'Cash') !== filterMode) return false;

        // Apply Date Range Filter
        if (filterStartDate || filterEndDate) {
            const dateToUse = m.paymentDate || m.planStartDate;
            if (!dateToUse) return false;
            
            const itemDate = new Date(dateToUse);
            itemDate.setHours(0,0,0,0);

            if (filterStartDate) {
                const start = new Date(filterStartDate);
                start.setHours(0,0,0,0);
                if (itemDate < start) return false;
            }
            if (filterEndDate) {
                const end = new Date(filterEndDate);
                end.setHours(23,59,59,999);
                if (itemDate > end) return false;
            }
        }

        // Apply Tab Filters
        if (activeTab === 'Pending Dues') return m.paymentStatus === 'Pending' || m.paymentStatus === 'Partial';
        return true; 
    });

    const filteredTransactions = transactions.filter(t => {
        const member = t.memberId;
        if (!member) return false;
        const matchesSearch = (member.firstName + ' ' + (member.lastName || '')).toLowerCase().includes(searchTerm.toLowerCase()) || (member.contactNumber || '').includes(searchTerm);
        if (!matchesSearch) return false;
        
        if (filterStatus !== 'All' && (t.paymentStatus || 'Paid') !== filterStatus) return false;
        if (filterMode !== 'All' && (t.paymentMode || 'Cash') !== filterMode) return false;

        if (filterStartDate || filterEndDate) {
            const dateToUse = t.paymentDate;
            if (!dateToUse) return false;
            
            const itemDate = new Date(dateToUse);
            itemDate.setHours(0,0,0,0);

            if (filterStartDate) {
                const start = new Date(filterStartDate);
                start.setHours(0,0,0,0);
                if (itemDate < start) return false;
            }
            if (filterEndDate) {
                const end = new Date(filterEndDate);
                end.setHours(23,59,59,999);
                if (itemDate > end) return false;
            }
        }
        return true;
    });

    // Pagination Slices
    const totalMembersItems = filteredMembers.length;
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const totalTxItems = filteredTransactions.length;
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const totalItems = activeTab === 'Transactions' ? totalTxItems : totalMembersItems;
    const paginatedData = activeTab === 'Transactions' ? paginatedTransactions : paginatedMembers;

    const paymentColumns = [
        { label: 'MEMBER', className: 'w-[24%] pl-4 pr-3' },
        { label: 'PLAN & TOTAL', className: 'w-[18%] px-3' },
        { label: 'PAID AMOUNT', className: 'w-[15%] px-3' },
        { label: 'DUE AMOUNT', className: 'w-[15%] px-3' },
        { label: 'STATUS', className: 'w-[12%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[16%] pr-4 pl-1 text-center' }
    ];

    const transactionColumns = [
        { label: 'MEMBER', className: 'w-[28%] pl-4 pr-3' },
        { label: 'RECEIPT NO', className: 'w-[16%] px-3' },
        { label: 'DATE & TIME', className: 'w-[16%] px-3' },
        { label: 'AMOUNT PAID', className: 'w-[14%] px-3' },
        { label: 'PAYMENT MODE', className: 'w-[14%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[12%] pr-4 pl-1 text-center' }
    ];

    const columns = activeTab === 'Transactions' ? transactionColumns : paymentColumns;

    const renderTransactionRow = (t, index) => {
        const member = t.memberId || {};
        const receiptNo = t.transactionId || `REC-${(t._id || '').substring(0, 6).toUpperCase()}`;

        return (
            <tr key={t._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        {member.profilePhoto ? (
                            <img src={member.profilePhoto} alt={member.firstName} className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                                {(member.firstName || 'M').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex flex-col items-start min-w-0">
                            <span className="font-bold text-slate-900 text-[13.5px] leading-tight truncate">
                                {member.firstName} {member.lastName}
                            </span>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                {member.contactNumber || '-'}
                            </p>
                        </div>
                    </div>
                </td>

                <td className="py-2.5 px-3 align-middle">
                    <span className="font-mono font-bold text-slate-800 text-[12.5px]">
                        {receiptNo}
                    </span>
                </td>

                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col text-[11.5px] leading-tight">
                        <span className="font-bold text-slate-900 text-[12.5px]">
                            {formatDate(t.paymentDate, 'N/A')}
                        </span>
                        <span className="text-slate-500 text-[11px] font-normal mt-0.5">
                            {t.paymentDate ? new Date(t.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                    </div>
                </td>

                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-emerald-600 text-[14px]">
                        <span>₹</span>
                        <span>{Number(t.amountPaid || 0).toLocaleString()}</span>
                    </div>
                </td>

                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        (t.paymentMode || '').toLowerCase() === 'cash' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        (t.paymentMode || '').toLowerCase() === 'upi' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                        {t.paymentMode || 'Cash'}
                    </span>
                </td>

                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        {member._id && (
                            <button 
                                onClick={() => navigate(`/dashboard/owner/finance/receipt/${member._id}`)} 
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                title="View Receipt"
                            >
                                <FiEye size={15} />
                            </button>
                        )}
                        <button 
                            onClick={() => handleDeleteTransaction(t._id)} 
                            className="w-8 h-8 rounded-lg border border-rose-200 text-[#CA0410] bg-rose-50/60 hover:border-rose-300 hover:bg-rose-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                            title="Delete Transaction"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    const renderPaymentRow = (m, index) => {
        const planPrice = Number(m.membershipPlan?.price || 0);
        const paidAmount = Number(m.amountPaid || 0);
        const dueAmount = Math.max(0, planPrice - paidAmount);
        const isPaid = m.paymentStatus === 'Paid' || dueAmount === 0;
        const isPartial = m.paymentStatus === 'Partial';
        const displayName = `${m.firstName} ${m.lastName || ''}`.trim() || 'Gym Member';

        return (
            <tr key={m._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        {m.profilePhoto ? (
                            <img src={m.profilePhoto} alt={m.firstName} className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                                {(displayName || 'M').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex flex-col items-start min-w-0">
                            <button 
                                onClick={() => navigate(`/dashboard/owner/members/view/${m._id}`, { state: { member: m } })}
                                className="font-bold text-slate-900 text-[13.5px] hover:text-[#CA0410] transition-colors text-left truncate leading-snug cursor-pointer max-w-[170px]"
                            >
                                {displayName}
                            </button>
                            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                <FiPhone className="text-slate-400 text-xs shrink-0" />
                                <span>{m.contactNumber || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </td>

                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        <span className="font-bold text-slate-900 text-[12.5px]">{m.membershipPlan?.name || 'General Plan'}</span>
                        <span className="text-slate-500 font-normal text-[11.5px]">Total: ₹{planPrice.toLocaleString()}</span>
                    </div>
                </td>

                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-emerald-600 text-[14px]">
                        <span>₹</span>
                        <span>{paidAmount.toLocaleString()}</span>
                    </div>
                </td>

                <td className="py-2.5 px-3 align-middle">
                    <div className={`flex items-center gap-1 font-bold text-[13.5px] ${dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        <span>₹</span>
                        <span>{dueAmount.toLocaleString()}</span>
                    </div>
                </td>

                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        isPaid ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {m.paymentStatus || 'Pending'}
                    </span>
                </td>

                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        <button 
                            onClick={() => openPaymentModal(m)} 
                            className="w-8 h-8 rounded-lg border border-emerald-200 text-emerald-600 bg-white hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0" 
                            title={isPaid ? 'Update / Record Payment' : 'Collect Fee'}
                        >
                            <FiCreditCard size={14} />
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member: m, isRenew: true } })} 
                            className="w-8 h-8 rounded-lg border border-indigo-200 text-indigo-600 bg-white hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0" 
                            title="Renew Plan / Extend Membership"
                        >
                            <FiRefreshCw size={13} />
                        </button>
                        {(paidAmount > 0 || isPaid || isPartial) && (
                            <button 
                                onClick={() => navigate(`/dashboard/owner/finance/receipt/${m._id}`)} 
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0" 
                                title="View Receipt"
                            >
                                <FiEye size={15} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    const totalRevenue = transactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const thisMonthRevenue = transactions.filter(t => {
        const d = new Date(t.paymentDate || t.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const totalPendingDues = members.filter(m => m.paymentStatus === 'Partial' || m.paymentStatus === 'Pending').reduce((sum, m) => sum + Math.max(0, (m.membershipPlan?.price || 0) - (m.amountPaid || 0)), 0);
    const totalTxCount = transactions.length;
    const fullyPaidMembersCount = members.filter(m => m.paymentStatus === 'Paid').length;
    const dueMembersCount = members.filter(m => m.paymentStatus === 'Partial' || m.paymentStatus === 'Pending').length;

    const summaryCardsData = [
        {
            title: 'Total Revenue',
            value: `₹${Math.round(totalRevenue).toLocaleString()}`,
            percentage: '+15%',
            percentageColor: 'text-emerald-600',
            subtitle: 'Lifetime collected',
            icon: <FiDollarSign />,
            bgClass: 'bg-[#E8F5E9]',
            iconColor: 'text-[#2E7D32]'
        },
        {
            title: 'This Month',
            value: `₹${Math.round(thisMonthRevenue).toLocaleString()}`,
            percentage: 'Current',
            percentageColor: 'text-emerald-600',
            subtitle: 'Monthly collection',
            icon: <FiTrendingUp />,
            bgClass: 'bg-[#FFECEC]',
            iconColor: 'text-[#E53935]'
        },
        {
            title: 'Outstanding Dues',
            value: `₹${Math.round(totalPendingDues).toLocaleString()}`,
            percentage: `${dueMembersCount} Due`,
            percentageColor: 'text-rose-600',
            subtitle: 'Pending collection',
            icon: <FiAlertCircle />,
            bgClass: 'bg-[#FFF3E0]',
            iconColor: 'text-[#EA580C]'
        },
        {
            title: 'Paid Members',
            value: fullyPaidMembersCount,
            percentage: `${members.length > 0 ? Math.round((fullyPaidMembersCount / members.length) * 100) : 0}%`,
            percentageColor: 'text-emerald-600',
            subtitle: '100% Cleared fees',
            icon: <FiCheckCircle />,
            bgClass: 'bg-[#F3E8FF]',
            iconColor: 'text-[#7E22CE]'
        }
    ];

    return (
        <PageLayout>
            <PageHeader 
                title="Fee Management" 
                subtitle="Track and collect membership fees" 
                actionButton={
                    <div className="flex items-center gap-2.5">
                        <button 
                            onClick={() => navigate('/dashboard/owner/membership/assign')}
                            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                            <FiRefreshCw size={13} className="text-emerald-400" /> Renew / Assign Plan
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/owner/finance/collect')}
                            className="h-9 px-3.5 rounded-xl bg-[#CA0410] hover:bg-[#B0030E] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                            <FiCreditCard size={13} /> Collect Fee
                        </button>
                    </div>
                }
            />
            
            <div className="px-6 md:px-8 pt-1 pb-3 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={summaryCardsData} />
            </div>

            <Tabs 
                tabs={['Payments', 'Pending Dues', 'Transactions']} 
                activeTab={activeTab} 
                onTabChange={(tab) => { 
                    setActiveTab(tab); 
                    setSearchTerm('');
                    setFilterStatus('All');
                    setFilterMode('All');
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setCurrentPage(1);
                }} 
            />

            <FilterBar 
                searchTerm={searchTerm} 
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setCurrentPage(1);
                }} 
                searchPlaceholder={activeTab === 'Transactions' ? "Search transactions by member, receipt or mode..." : "Search members by name, phone or plan..."}
            >
                <div className="flex items-center bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl shadow-2xs h-9 px-2.5 transition-all focus-within:border-[#CA0410] focus-within:ring-2 focus-within:ring-[#CA0410]/20 w-full sm:w-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">From:</span>
                    <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => {
                            setFilterStartDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="text-xs font-medium focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="Start Date"
                    />
                    <span className="text-slate-300 mx-2 font-medium text-[10px]">TO</span>
                    <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => {
                            setFilterEndDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="text-xs font-medium focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="End Date"
                    />
                </div>
                
                {activeTab === 'Payments' && (
                    <select 
                        value={filterStatus} 
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="h-9 px-3 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 text-slate-600 shadow-2xs w-full sm:w-auto"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                    </select>
                )}

                {activeTab === 'Transactions' && (
                    <select 
                        value={filterMode} 
                        onChange={(e) => {
                            setFilterMode(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="h-9 px-3 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 text-slate-600 shadow-2xs w-full sm:w-auto"
                    >
                        <option value="All">All Payment Modes</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Other">Other</option>
                    </select>
                )}
            </FilterBar>

            <div className="px-6 md:px-8 pb-6 pt-1 bg-[#FAEEEF] w-full flex flex-col gap-4 min-h-0 flex-1">
                <DataTable 
                    columns={columns} 
                    data={paginatedData} 
                    loading={loading} 
                    emptyMessage="No records found for the selected filter." 
                    renderRow={activeTab === 'Transactions' ? renderTransactionRow : renderPaymentRow} 
                    pagination={{
                        currentPage: currentPage,
                        totalItems: totalItems,
                        pageSize: pageSize,
                        onPageChange: (p) => setCurrentPage(p),
                        onPageSizeChange: (s) => setPageSize(s),
                        itemLabel: activeTab === 'Transactions' ? "transactions" : "records"
                    }}
                />
            </div>
        </PageLayout>
    );
}
