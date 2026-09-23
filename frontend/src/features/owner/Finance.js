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
import Loader from '../../components/page/Loader';
import { FiCreditCard, FiEye, FiTrash2, FiPhone, FiDollarSign, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiClock, FiRefreshCw, FiPlus, FiEdit2, FiUser } from 'react-icons/fi';
import { formatDate, toInputDateFormat } from '../../utils/dateUtils';
import DatePicker from '../../components/form/DatePicker';

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

    const [editTxModal, setEditTxModal] = useState({
        open: false,
        transaction: null,
        amountPaid: '',
        paymentMode: 'Cash',
        paymentDate: '',
        transactionId: '',
        notes: '',
        submitting: false
    });
    
    const navigate = useNavigate();

    const openPaymentModal = (m) => {
        navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: m } });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [memRes, txRes, activeRes, latestRes] = await Promise.all([
                apiClient.get('/members'),
                apiClient.get('/members/transactions/all'),
                apiClient.get('/member-memberships/active'),
                apiClient.get('/member-memberships/latest').catch(() => ({ data: [] }))
            ]);
            
            const activeMemberships = activeRes.data || [];
            const latestMemberships = latestRes.data || [];
            const membersWithPlans = (memRes.data || []).map(member => {
                const memIdStr = (member._id || member.id || '').toString();
                const membership = activeMemberships.find(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr)
                    || latestMemberships.find(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr);
                if (membership) {
                    member.activeMembership = membership;
                    member.membershipPlan = membership.membershipPlanId;
                    member.paymentStatus = membership.paymentStatus;
                    member.amountPaid = membership.paidAmount;
                    member.planStartDate = membership.startDate;
                    member.planEndDate = membership.endDate;
                    member.finalPrice = membership.finalPrice !== undefined ? membership.finalPrice : membership.originalPrice;
                    member.originalPrice = membership.originalPrice;
                    member.balanceAmount = membership.balanceAmount;
                    member.discount = membership.discount;
                }
                return member;
            }).filter(m => m.membershipPlan || m.activeMembership);
            
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

    const openEditTxModal = (tx) => {
        setEditTxModal({
            open: true,
            transaction: tx,
            amountPaid: tx.amountPaid || '',
            paymentMode: tx.paymentMode || 'Cash',
            paymentDate: toInputDateFormat(tx.paymentDate || tx.createdAt || new Date()),
            transactionId: tx.transactionId || '',
            notes: tx.notes || '',
            submitting: false
        });
    };

    const handleUpdateTxSubmit = async (e) => {
        e.preventDefault();
        if (!editTxModal.transaction) return;
        const amt = Number(editTxModal.amountPaid);
        if (isNaN(amt) || amt <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setEditTxModal(prev => ({ ...prev, submitting: true }));
        try {
            await apiClient.put(`/members/transactions/${editTxModal.transaction._id}`, {
                amountPaid: amt,
                paymentMode: editTxModal.paymentMode,
                paymentDate: editTxModal.paymentDate,
                transactionId: editTxModal.transactionId,
                notes: editTxModal.notes
            });
            toast.success("Payment transaction updated successfully!");
            setEditTxModal({ open: false, transaction: null, amountPaid: '', paymentMode: 'Cash', paymentDate: '', transactionId: '', notes: '', submitting: false });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update transaction");
            setEditTxModal(prev => ({ ...prev, submitting: false }));
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

    const getMemberDue = (m) => {
        const totalFee = Number(
            m.activeMembership?.finalPrice !== undefined && m.activeMembership?.finalPrice !== null
                ? m.activeMembership.finalPrice
                : (m.activeMembership?.originalPrice !== undefined && m.activeMembership?.originalPrice !== null
                    ? m.activeMembership.originalPrice
                    : (m.finalPrice !== undefined && m.finalPrice !== null
                        ? m.finalPrice
                        : (m.membershipPlan?.price || 0)))
        );
        const paidAmount = Number(
            m.activeMembership?.paidAmount !== undefined && m.activeMembership?.paidAmount !== null
                ? m.activeMembership.paidAmount
                : (m.amountPaid || 0)
        );
        return Number(
            m.activeMembership?.balanceAmount !== undefined && m.activeMembership?.balanceAmount !== null
                ? m.activeMembership.balanceAmount
                : Math.max(0, totalFee - paidAmount)
        );
    };

    const filteredMembers = members.filter(m => {
        const matchesSearch = (m.firstName + ' ' + (m.lastName || '')).toLowerCase().includes(searchTerm.toLowerCase()) || (m.contactNumber || '').includes(searchTerm);
        if (!matchesSearch) return false;
        
        // Apply Dropdown Filters
        const due = getMemberDue(m);
        const effectiveStatus = due === 0 ? 'Paid' : (m.amountPaid > 0 ? 'Partial' : 'Pending');
        if (filterStatus !== 'All' && (m.paymentStatus || effectiveStatus) !== filterStatus) return false;
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
        if (activeTab === 'Pending Dues') return due > 0;
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
        { label: 'MEMBER', className: 'w-[22%] pl-4 pr-2' },
        { label: 'PLAN & TOTAL', className: 'w-[18%] px-2' },
        { label: 'DISCOUNT', className: 'w-[12%] px-2 text-center' },
        { label: 'PAID AMOUNT', className: 'w-[14%] px-2' },
        { label: 'DUE AMOUNT', className: 'w-[12%] px-2' },
        { label: 'STATUS', className: 'w-[10%] px-1 text-center' },
        { label: 'ACTIONS', className: 'w-[12%] pr-4 pl-1 text-center' }
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
                            <>
                                <button 
                                    onClick={() => navigate(`/dashboard/owner/members/view/${member._id}`)} 
                                    className="w-8 h-8 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50/60 hover:border-indigo-300 hover:bg-indigo-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                    title="View Member Profile"
                                >
                                    <FiUser size={14} />
                                </button>
                                <button 
                                    onClick={() => navigate(`/dashboard/owner/finance/receipt/${member._id}`)} 
                                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                    title="View Receipt"
                                >
                                    <FiEye size={14} />
                                </button>
                            </>
                        )}
                        <button 
                            onClick={() => openEditTxModal(t)} 
                            className="w-8 h-8 rounded-lg border border-amber-200 text-amber-700 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                            title="Edit Transaction"
                        >
                            <FiEdit2 size={14} />
                        </button>
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
        const originalFee = Number(
            m.activeMembership?.originalPrice !== undefined && m.activeMembership?.originalPrice !== null
                ? m.activeMembership.originalPrice
                : (m.originalPrice !== undefined && m.originalPrice !== null
                    ? m.originalPrice
                    : (m.activeMembership?.finalPrice !== undefined && m.activeMembership?.finalPrice !== null
                        ? m.activeMembership.finalPrice
                        : (m.finalPrice !== undefined && m.finalPrice !== null
                            ? m.finalPrice
                            : (m.membershipPlan?.price || 0))))
        );
        const discountAmount = Number(
            m.activeMembership?.discount !== undefined && m.activeMembership?.discount !== null
                ? m.activeMembership.discount
                : (m.discount || 0)
        );
        const totalFee = Number(
            m.activeMembership?.finalPrice !== undefined && m.activeMembership?.finalPrice !== null
                ? m.activeMembership.finalPrice
                : (m.finalPrice !== undefined && m.finalPrice !== null
                    ? m.finalPrice
                    : Math.max(0, originalFee - discountAmount))
        );
        const paidAmount = Number(
            m.activeMembership?.paidAmount !== undefined && m.activeMembership?.paidAmount !== null
                ? m.activeMembership.paidAmount
                : (m.amountPaid || 0)
        );
        const dueAmount = Number(
            m.activeMembership?.balanceAmount !== undefined && m.activeMembership?.balanceAmount !== null
                ? m.activeMembership.balanceAmount
                : Math.max(0, totalFee - paidAmount)
        );
        const isPaid = dueAmount === 0 || m.paymentStatus === 'Paid' || m.activeMembership?.paymentStatus === 'Paid';
        const isPartial = !isPaid && (paidAmount > 0 || m.paymentStatus === 'Partial' || m.activeMembership?.paymentStatus === 'Partial');
        const displayName = `${m.firstName} ${m.lastName || ''}`.trim() || 'Gym Member';

        return (
            <tr key={m._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                <td className="py-2.5 pl-4 pr-2 align-middle">
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

                <td className="py-2.5 px-2 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        <span className="font-bold text-slate-900 text-[12.5px]">{m.activeMembership?.planName || m.membershipPlan?.name || 'General Plan'}</span>
                        <span className="text-slate-500 font-normal text-[11.5px]">Fee: ₹{originalFee.toLocaleString()}</span>
                    </div>
                </td>

                <td className="py-2.5 px-2 text-center align-middle">
                    {discountAmount > 0 ? (
                        <span className="inline-flex items-center text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            ₹{discountAmount.toLocaleString()}
                        </span>
                    ) : (
                        <span className="text-slate-400 text-xs font-semibold">—</span>
                    )}
                </td>

                <td className="py-2.5 px-2 align-middle">
                    <div className="flex items-center gap-1 font-bold text-emerald-600 text-[14px]">
                        <span>₹</span>
                        <span>{paidAmount.toLocaleString()}</span>
                    </div>
                </td>

                <td className="py-2.5 px-2 align-middle">
                    <div className={`flex items-center gap-1 font-bold text-[13.5px] ${dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        <span>₹</span>
                        <span>{dueAmount.toLocaleString()}</span>
                    </div>
                </td>

                <td className="py-2.5 px-1 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12px] font-bold rounded-lg px-2.5 py-1 border leading-none shadow-2xs ${
                        isPaid ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'}
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
                            onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member: m, activeMembership: m.activeMembership, isRenew: true } })} 
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

    const totalPendingDues = members.reduce((sum, m) => sum + Math.max(0, getMemberDue(m)), 0);
    const totalTxCount = transactions.length;
    const fullyPaidMembersCount = members.filter(m => getMemberDue(m) === 0).length;
    const dueMembersCount = members.filter(m => getMemberDue(m) > 0).length;

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
                <SummaryCards cards={summaryCardsData} loading={loading} />
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
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <DatePicker
                        compact={true}
                        value={filterStartDate}
                        onChange={(e) => {
                            setFilterStartDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="From Date"
                    />
                    <span className="text-slate-400 font-bold text-[10px]">TO</span>
                    <DatePicker
                        compact={true}
                        value={filterEndDate}
                        onChange={(e) => {
                            setFilterEndDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="To Date"
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

            {/* EDIT TRANSACTION MODAL */}
            {editTxModal.open && editTxModal.transaction && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-base">Edit Payment Transaction</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Receipt: <span className="font-mono font-bold text-slate-700">{editTxModal.transaction.transactionId || editTxModal.transaction._id?.slice(-6)}</span>
                                </p>
                            </div>
                            <button onClick={() => setEditTxModal({ open: false, transaction: null })} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
                        </div>

                        <form onSubmit={handleUpdateTxSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
                                <input 
                                    type="number" 
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-bold text-slate-900 bg-white"
                                    value={editTxModal.amountPaid} 
                                    onChange={(e) => setEditTxModal(prev => ({ ...prev, amountPaid: e.target.value }))} 
                                    placeholder="Enter amount"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-xs font-bold bg-white cursor-pointer"
                                        value={editTxModal.paymentMode} 
                                        onChange={(e) => setEditTxModal(prev => ({ ...prev, paymentMode: e.target.value }))}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Card">Card</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-xs font-medium text-slate-800 bg-white"
                                        value={editTxModal.paymentDate} 
                                        onChange={(e) => setEditTxModal(prev => ({ ...prev, paymentDate: e.target.value }))} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Ref / UTR (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-xs font-medium text-slate-800 bg-white"
                                    value={editTxModal.transactionId} 
                                    onChange={(e) => setEditTxModal(prev => ({ ...prev, transactionId: e.target.value }))} 
                                    placeholder="e.g. UPI-123456"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-xs font-medium text-slate-800 bg-white"
                                    value={editTxModal.notes} 
                                    onChange={(e) => setEditTxModal(prev => ({ ...prev, notes: e.target.value }))} 
                                    placeholder="e.g. Partial installment correction"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setEditTxModal({ open: false, transaction: null })} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
                                <button type="submit" disabled={editTxModal.submitting} className="px-4 py-2 text-xs font-bold text-white bg-[#CA0410] hover:bg-[#a8030d] rounded-xl shadow-2xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                                    {editTxModal.submitting ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
