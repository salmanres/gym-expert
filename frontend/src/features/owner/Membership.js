import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiEdit2, FiTrash2, FiCreditCard, FiRefreshCw, FiGift, FiPhone, FiMail, FiCheckCircle, FiAlertCircle, FiXCircle, FiEye, FiActivity } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import SummaryCards from '../../components/page/SummaryCards';
import ConfirmModal from '../../components/modal/ConfirmModal';
import { formatDate } from '../../utils/dateUtils';

const isPTMembership = (membership) => {
    if (!membership) return false;
    const plan = membership?.membershipPlanId && typeof membership.membershipPlanId === 'object'
        ? membership.membershipPlanId
        : membership;
    const name = String(plan?.name || membership?.planName || '').toLowerCase();
    const type = Array.isArray(plan?.planType)
        ? plan.planType.join(' ').toLowerCase()
        : String(plan?.planType || membership?.planType || '').toLowerCase();

    return Boolean(membership?.isPTConversion) ||
        type.includes('personal training') ||
        type.includes('pt') ||
        name.includes('personal training') ||
        name.includes('pt package') ||
        (plan?.sessions || 0) > 0 ||
        (membership?.totalSessions || 0) > 0;
};

function Memberships() {
    const navigate = useNavigate();
    const [memberships, setMemberships] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Plans'); // 'Plans', 'Assign', 'Active', 'Scheduled', 'Expired'
    const [bonusModal, setBonusModal] = useState({ open: false, membership: null, days: '', reason: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });
    const [gymSettings, setGymSettings] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('All');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [memRes, memberRes, latestMembershipsRes, activeMembershipsRes, gymRes] = await Promise.all([
                apiClient.get('/membership-plans'),
                apiClient.get('/members'),
                apiClient.get('/member-memberships/latest'),
                apiClient.get('/member-memberships/active').catch(() => ({ data: [] })),
                apiClient.get('/gyms/my-gym').catch(() => ({ data: null }))
            ]);

            if (gymRes?.data) setGymSettings(gymRes.data);

            const latestMemberships = latestMembershipsRes.data || [];
            const activeAndScheduled = activeMembershipsRes.data || [];

            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const parseLocalDateStart = (val) => {
                if (!val) return null;
                if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                    const [y, m, d] = val.split('T')[0].split('-').map(Number);
                    return new Date(y, m - 1, d, 0, 0, 0, 0);
                }
                const d = new Date(val);
                d.setHours(0, 0, 0, 0);
                return d;
            };

            const parseLocalDateEnd = (val) => {
                if (!val) return null;
                if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                    const [y, m, d] = val.split('T')[0].split('-').map(Number);
                    return new Date(y, m - 1, d, 23, 59, 59, 999);
                }
                const d = new Date(val);
                d.setHours(23, 59, 59, 999);
                return d;
            };

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const allFetchedMems = [...activeAndScheduled, ...latestMemberships];

            const membersWithPlans = memberRes.data.map(member => {
                const memIdStr = member._id?.toString();
                const memberMemberships = allFetchedMems
                    .filter(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr)
                    .filter((m, idx, self) => m._id && self.findIndex(s => s._id?.toString() === m._id?.toString()) === idx);
                
                const isCurrentlyActive = m => {
                    if (m.membershipStatus === 'Cancelled') return false;
                    if (m.membershipStatus === 'Frozen') return true;
                    const start = parseLocalDateStart(m.startDate);
                    const end = parseLocalDateEnd(m.endDate);
                    if (!start || !end) return m.membershipStatus === 'Active';
                    return start <= todayEnd && end >= todayStart;
                };

                const allActiveMems = memberMemberships.filter(isCurrentlyActive);
                const activeGymMem = allActiveMems.find(m => !isPTMembership(m)) || memberMemberships.find(m => !isPTMembership(m) && m.membershipStatus === 'Active');
                const activePTMem = allActiveMems.find(isPTMembership) || memberMemberships.find(m => isPTMembership(m) && m.membershipStatus === 'Active');
                const activeMem = activeGymMem || activePTMem || allActiveMems[0];

                const scheduledMemberships = memberMemberships.filter(m => {
                    if (m.membershipStatus === 'Cancelled' || m.membershipStatus === 'Frozen') return false;
                    if (allActiveMems.some(a => a._id?.toString() === m._id?.toString())) return false;
                    const start = parseLocalDateStart(m.startDate);
                    return Boolean(start && start > todayEnd) || m.membershipStatus === 'Scheduled';
                });
                const scheduledGymMem = scheduledMemberships.find(m => !isPTMembership(m));
                const scheduledPTMem = scheduledMemberships.find(isPTMembership);
                const scheduledMem = scheduledGymMem || scheduledPTMem || scheduledMemberships[0];

                const latestMem = latestMemberships.find(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr);

                const mainMem = activeGymMem || activeMem || scheduledMem || latestMem;

                member.allActiveMemberships = allActiveMems;
                member.activeGymMembership = activeGymMem;
                member.activePTMembership = activePTMem;
                member.scheduledGymMembership = scheduledGymMem;
                member.scheduledPTMembership = scheduledPTMem;

                if (mainMem) {
                    member.membershipPlan = mainMem.membershipPlanId || { name: mainMem.planName };
                    member.activeMembership = activeMem || mainMem;
                    member.scheduledMembership = scheduledMem;
                    member.planStartDate = mainMem.startDate;

                    member.planEndDate = mainMem.endDate;
                    member.paidUntilDate = mainMem.paidUntilDate;

                    member.paymentStatus = mainMem.paymentStatus;
                }
                return member;
            });

            setMemberships(memRes.data);
            setMembers(membersWithPlans);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to fetch data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddNew = () => navigate('/dashboard/owner/membership/add');
    const handleEdit = (m) => navigate(`/dashboard/owner/membership/edit/${m._id}`, { state: { membership: m } });

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Membership Plan',
            message: 'Are you sure you want to delete this membership plan? This action cannot be undone.',
            isDestructive: true,
            confirmText: 'Delete Plan',
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/membership-plans/${id}`);
                    toast.success("Membership deleted");
                    fetchData();
                } catch (error) {
                    toast.error("Failed to delete membership");
                }
            }
        });
    };

    const handleAddBonus = async (e) => {
        e.preventDefault();
        if (!bonusModal.days || !bonusModal.reason) {
            toast.error("Please enter days and reason");
            return;
        }

        try {
            await apiClient.post(`/member-memberships/${bonusModal.membership._id}/bonus`, {
                days: bonusModal.days,
                reason: bonusModal.reason
            });
            toast.success("Bonus days added successfully!");
            setBonusModal({ open: false, membership: null, days: '', reason: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add bonus days");
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Derived Data
    const getMembersByStatus = () => {
        return members.filter(member => {
            if (activeTab === 'Assign') return !member.membershipPlan && !member.activeMembership;
            if (activeTab === 'Scheduled') return Boolean(member.scheduledMembership || member.scheduledGymMembership || member.scheduledPTMembership);

            const gymEnd = member.activeGymMembership?.endDate ? new Date(member.activeGymMembership.endDate) : null;
            const ptEnd = member.activePTMembership?.endDate ? new Date(member.activePTMembership.endDate) : null;
            const effectiveEnd = (gymEnd && gymEnd >= today) 
                ? gymEnd 
                : ((ptEnd && ptEnd >= today) ? ptEnd : (member.planEndDate ? new Date(member.planEndDate) : null));

            if (!effectiveEnd) return false;
            const isExpired = effectiveEnd < today;

            if (activeTab === 'Active') return !isExpired && Boolean(member.activeMembership || member.activeGymMembership || member.activePTMembership);
            if (activeTab === 'Expired') return isExpired && !member.scheduledMembership && !member.scheduledGymMembership && !member.scheduledPTMembership;
            return false;
        });
    };

    const filteredMemberships = memberships.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredMembers = getMembersByStatus().filter(m => {
        if (filterPaymentStatus !== 'All' && (m.paymentStatus || 'Pending') !== filterPaymentStatus) return false;

        return (
            (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.contactNumber || '').includes(searchTerm)
        );
    });

    // Paginated datasets
    const totalPlans = filteredMemberships.length;
    const paginatedPlans = filteredMemberships.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const totalMembersInTab = filteredMembers.length;
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

    // Column Definitions
    const planColumns = [
        { label: 'PLAN NAME', className: 'w-[28%] pl-4 pr-3' },
        { label: 'TYPE & SESSIONS', className: 'w-[22%] px-3' },
        { label: 'DURATION', className: 'w-[14%] px-3' },
        { label: 'PRICE', className: 'w-[14%] px-3' },
        { label: 'STATUS', className: 'w-[10%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[12%] pr-4 pl-1 text-center' }
    ];

    const memberColumns = [
        { label: 'MEMBER', className: 'w-[22%] pl-4 pr-3' },
        { label: 'CONTACT', className: 'w-[14%] px-3' },
        { label: 'PLAN DETAILS', className: 'w-[25%] px-3' },
        { label: 'VALIDITY / STATUS', className: 'w-[12%] px-2 text-center' },
        { label: 'PAYMENT', className: 'w-[10%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[17%] pr-4 pl-1 text-center' }
    ];

    // Render Rows for Plans
    const renderPlanRow = (m, index) => {
        return (
            <tr key={m._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                <td className="py-3.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-sm flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                            {(m.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                            <button
                                onClick={() => handleEdit(m)}
                                className="font-bold text-slate-900 text-[14.5px] hover:text-[#CA0410] transition-colors text-left truncate leading-snug cursor-pointer"
                            >
                                {m.name}
                            </button>
                            <p className="text-[12.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                {m.sessions > 0 ? `${m.sessions} Sessions` : 'Unlimited Access'}
                            </p>
                        </div>
                    </div>
                </td>
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex flex-wrap gap-1.5">
                        {(() => {
                            const rawTypes = Array.isArray(m.planType) ? m.planType : [m.planType || 'Gym Access'];
                            const flattened = rawTypes.flatMap(pt => typeof pt === 'string' ? pt.split('+').map(s => s.trim()) : [pt]);
                            return flattened.map((pt, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                    {pt}
                                </span>
                            ));
                        })()}
                    </div>
                </td>
                <td className="py-3.5 px-3 align-middle">
                    <span className="font-bold text-slate-900 text-[13.5px]">
                        {m.duration} {m.durationUnit || 'Months'}
                    </span>
                </td>
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-emerald-600 text-[14px]">
                        <span>₹</span>
                        <span>{Number(m.price || 0).toLocaleString()}</span>
                    </div>
                </td>
                <td className="py-3.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${m.isActive
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                        {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="py-3.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        <button
                            onClick={() => handleEdit(m)}
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Edit Plan"
                        >
                            <FiEdit2 size={14} />
                        </button>
                        <button
                            onClick={() => handleDelete(m._id)}
                            className="w-8 h-8 rounded-lg border border-rose-200 text-[#CA0410] bg-rose-50/60 hover:border-rose-300 hover:bg-rose-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Delete Plan"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    // Render Rows for Member Assignments
    const renderMemberRow = (m, index) => {
        const isScheduledTab = activeTab === 'Scheduled' && Boolean(m.scheduledMembership || m.scheduledGymMembership || m.scheduledPTMembership);

        // Identify Gym and PT memberships
        const gymMem = isScheduledTab
            ? (m.scheduledGymMembership || (!isPTMembership(m.scheduledMembership) ? m.scheduledMembership : null))
            : (m.activeGymMembership || (!isPTMembership(m.activeMembership) ? m.activeMembership : null));

        const ptMem = isScheduledTab
            ? (m.scheduledPTMembership || (isPTMembership(m.scheduledMembership) ? m.scheduledMembership : null))
            : (m.activePTMembership || (isPTMembership(m.activeMembership) ? m.activeMembership : null));

        const fallbackMem = isScheduledTab
            ? m.scheduledMembership
            : (m.activeMembership || (m.membershipPlan ? { planName: m.membershipPlan.name, startDate: m.planStartDate, endDate: m.planEndDate, paymentStatus: m.paymentStatus } : null));

        const hasAnyPlan = Boolean(gymMem || ptMem || fallbackMem);

        // Gym Details
        const gymPlanName = gymMem?.membershipPlanId?.name || gymMem?.planName || (!ptMem ? (fallbackMem?.membershipPlanId?.name || fallbackMem?.planName) : null);
        const gymStartDate = gymMem?.startDate ? new Date(gymMem.startDate) : (!ptMem && m.planStartDate ? new Date(m.planStartDate) : null);
        const gymEndDate = gymMem?.endDate ? new Date(gymMem.endDate) : (!ptMem && m.planEndDate ? new Date(m.planEndDate) : null);
        const gymPaidUntilDate = gymMem?.paidUntilDate ? new Date(gymMem.paidUntilDate) : (!ptMem && m.paidUntilDate ? new Date(m.paidUntilDate) : null);
        const gymPaymentStat = gymMem?.paymentStatus || (!ptMem ? m.paymentStatus : 'Paid');
        const gymIsPartial = gymPaymentStat === 'Partial';

        // PT Details
        const ptPlanName = ptMem?.membershipPlanId?.name || ptMem?.planName || 'Personal Training';
        const ptStartDate = ptMem?.startDate ? new Date(ptMem.startDate) : null;
        const ptEndDate = ptMem?.endDate ? new Date(ptMem.endDate) : null;
        const ptPaidUntilDate = ptMem?.paidUntilDate ? new Date(ptMem.paidUntilDate) : null;
        const ptTrainer = ptMem?.trainerId?.name || ptMem?.trainerName || ptMem?.assignedTrainer?.name || '';
        const ptTotalSessions = ptMem?.totalSessions || ptMem?.membershipPlanId?.sessionCount || ptMem?.sessionCount || 0;
        const ptUsedSessions = ptMem?.usedSessions ?? ptMem?.completedSessions ?? 0;
        const ptPaymentStat = ptMem?.paymentStatus;
        const ptIsPartial = ptPaymentStat === 'Partial';

        // Effective date for row status (Active / Expiring Soon / Expired)
        const validDates = [];
        if (gymEndDate && !isNaN(gymEndDate.getTime())) validDates.push(gymEndDate.getTime());
        if (ptEndDate && !isNaN(ptEndDate.getTime())) validDates.push(ptEndDate.getTime());

        const unexpiredDates = validDates.filter(t => t >= today.getTime());
        const effectiveEnd = unexpiredDates.length > 0
            ? new Date(Math.max(...unexpiredDates))
            : (validDates.length > 0 ? new Date(Math.max(...validDates)) : null);

        const isExpired = !isScheduledTab && effectiveEnd && effectiveEnd < today;
        const isRenewingSoon = !isScheduledTab && effectiveEnd && effectiveEnd >= today && effectiveEnd <= nextWeek;

        // Overall payment status
        let paymentStat = 'Paid';
        const relevantStatuses = [gymMem?.paymentStatus, ptMem?.paymentStatus].filter(Boolean);
        if (relevantStatuses.length === 0) {
            paymentStat = m.paymentStatus || 'Pending';
        } else if (relevantStatuses.includes('Pending')) {
            paymentStat = relevantStatuses.includes('Paid') ? 'Partial' : 'Pending';
        } else if (relevantStatuses.includes('Partial')) {
            paymentStat = 'Partial';
        } else {
            paymentStat = 'Paid';
        }

        const hasDuePayment = (m.paymentStatus === 'Pending' || m.paymentStatus === 'Partial' || gymPaymentStat === 'Partial' || ptPaymentStat === 'Partial' || gymPaymentStat === 'Pending' || ptPaymentStat === 'Pending');

        const avatar = getAvatarStyle(m.firstName || m.name, index);

        return (
            <tr key={m._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                <td className="py-3.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-3">
                        {m.profilePhoto ? (
                            <img src={m.profilePhoto} alt={m.firstName} className="w-9 h-9 rounded-full object-cover shadow-2xs border border-slate-200 shrink-0" />
                        ) : (
                            <div className={`w-9 h-9 rounded-full ${avatar.bg} ${avatar.text} border border-slate-200/80 font-bold text-sm flex items-center justify-center shrink-0 leading-none select-none shadow-2xs`}>
                                {(m.firstName || 'M').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex flex-col items-start min-w-0">
                            <button
                                onClick={() => navigate(`/dashboard/owner/members/view/${m._id}`, { state: { member: m } })}
                                className="font-bold text-slate-900 text-[14.5px] hover:text-[#CA0410] transition-colors text-left truncate leading-snug cursor-pointer"
                            >
                                {m.firstName} {m.lastName}
                            </button>
                            <p className="text-[12px] text-slate-500 font-normal mt-0.5 leading-tight">
                                ID: <span className="font-bold text-slate-700">{m.memberId}</span> • {m.gender || 'Member'}
                            </p>
                        </div>
                    </div>
                </td>
                <td className="py-3.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[12.5px] leading-snug">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[14px] tracking-tight">
                            <FiPhone className="text-slate-400 text-xs shrink-0" />
                            <span>{m.contactNumber || '-'}</span>
                        </div>
                        {m.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 font-normal text-[11.5px]">
                                <FiMail className="text-slate-400 text-[11px] shrink-0" />
                                <span className="truncate max-w-[150px]" title={m.email}>{m.email}</span>
                            </div>
                        )}
                    </div>
                </td>
                <td className="py-3.5 px-3 align-middle">
                    {hasAnyPlan ? (
                        <div className="flex flex-col gap-1.5 text-[12.5px] leading-snug">
                            {/* Gym Plan Section */}
                            {gymPlanName && (
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-800 text-[13.5px]">{gymPlanName}</span>
                                        {gymMem?.bonusDays > 0 && (
                                             <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                +{gymMem.bonusDays}d
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-slate-500 font-normal text-[12px]">
                                            {gymStartDate ? formatDate(gymStartDate) : ''} - {gymIsPartial && gymPaidUntilDate ? formatDate(gymPaidUntilDate) : (gymEndDate ? formatDate(gymEndDate) : '')}
                                        </span>
                                    </div>
                                    {gymIsPartial && gymPaidUntilDate && (
                                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-max">
                                            Paid till {formatDate(gymPaidUntilDate)} (₹{gymMem?.paidAmount || 0} / ₹{gymMem?.finalPrice || 0})
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* PT Package Section */}
                            {ptMem && (
                                <div className={`flex flex-col gap-1 ${gymPlanName ? 'pt-1.5 border-t border-dashed border-slate-200' : ''}`}>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                            🟡 PT: {ptPlanName}
                                        </span>
                                        {ptTrainer && (
                                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                Trainer: {ptTrainer}
                                            </span>
                                        )}
                                        {ptTotalSessions > 0 && (
                                            <span className="text-[10.5px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200">
                                                {ptUsedSessions}/{ptTotalSessions} Sess
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap text-slate-500 font-normal text-[11.5px]">
                                        <span>
                                            {ptStartDate ? formatDate(ptStartDate) : ''} - {ptIsPartial && ptPaidUntilDate ? formatDate(ptPaidUntilDate) : (ptEndDate ? formatDate(ptEndDate) : '')}
                                        </span>
                                        {ptIsPartial && (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                                PT Paid: ₹{ptMem?.paidAmount || 0} / ₹{ptMem?.finalPrice || 0}
                                            </span>
                                        )}
                                        {ptPaymentStat === 'Pending' && (
                                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                                PT Due: ₹{Math.max(0, (ptMem?.finalPrice || ptMem?.price || 0) - (ptMem?.paidAmount || 0))}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 font-medium italic text-xs">No Active Plan</span>
                    )}
                </td>
                <td className="py-3.5 px-2 text-center align-middle">
                    {isScheduledTab ? (
                        <span className="inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs bg-indigo-50 text-indigo-700 border-indigo-200">
                            Scheduled
                        </span>
                    ) : effectiveEnd ? (
                        <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${isExpired
                                ? 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]'
                                : isRenewingSoon
                                    ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                                    : 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                            }`}>
                            {isExpired ? 'Expired' : isRenewingSoon ? 'Expiring Soon' : 'Active'}
                        </span>
                    ) : '-'}
                </td>
                <td className="py-3.5 px-2 text-center align-middle">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className={`inline-flex items-center justify-center text-[12px] font-bold rounded-lg px-3 py-1 border leading-none shadow-2xs ${paymentStat === 'Paid'
                                ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                                : paymentStat === 'Partial'
                                    ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                                    : 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]'
                            }`}>
                            {paymentStat}
                        </span>
                        {gymMem && ptMem && gymMem.paymentStatus && ptMem.paymentStatus && gymMem.paymentStatus !== ptMem.paymentStatus && (
                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                                Gym: {gymMem.paymentStatus} • PT: {ptMem.paymentStatus}
                            </span>
                        )}
                    </div>
                </td>
                <td className="py-3.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        {/* 1. View Profile */}
                        <button
                            onClick={() => navigate(`/dashboard/owner/members/view/${m._id}`, { state: { member: m } })}
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="View Member Profile"
                        >
                            <FiEye size={15} />
                        </button>

                        {/* 2. Collect Fee */}
                        <button
                            onClick={() => navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: m } })}
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-2xs active:scale-95 ${
                                !hasDuePayment || activeTab === 'Assign'
                                    ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : 'border-emerald-200 text-emerald-600 bg-white hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer'
                            }`}
                            title={!hasDuePayment ? 'Fee Fully Paid' : 'Collect Fee'}
                            disabled={!hasDuePayment || activeTab === 'Assign'}
                        >
                            <FiCreditCard size={14} />
                        </button>

                        {/* 3. Edit Plan */}
                        {activeTab === 'Scheduled' && (m.scheduledGymMembership || m.scheduledMembership) && (
                            <button
                                onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, targetMembership: m.scheduledGymMembership || m.scheduledMembership, isEdit: true } })}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Edit Scheduled Plan"
                            >
                                <FiEdit2 size={13} />
                            </button>
                        )}
                        {activeTab === 'Scheduled' && m.scheduledPTMembership && (
                            <button
                                onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, targetMembership: m.scheduledPTMembership, isEdit: true } })}
                                className="w-8 h-8 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Edit Scheduled PT Package"
                            >
                                <FiActivity size={13} />
                            </button>
                        )}
                        {activeTab !== 'Scheduled' && gymMem && (
                            <button
                                onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, targetMembership: gymMem, isEdit: true } })}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title={ptMem ? "Edit Gym Membership" : "Edit Plan"}
                            >
                                <FiEdit2 size={13} />
                            </button>
                        )}
                        {activeTab !== 'Scheduled' && ptMem && (
                            <button
                                onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, targetMembership: ptMem, isEdit: true } })}
                                className="w-8 h-8 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Edit PT Package"
                            >
                                <FiActivity size={13} />
                            </button>
                        )}
                        {activeTab !== 'Scheduled' && !gymMem && !ptMem && m.activeMembership && (
                            <button
                                onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, targetMembership: m.activeMembership, isEdit: true } })}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Edit Active Plan"
                            >
                                <FiEdit2 size={13} />
                            </button>
                        )}

                        {/* 4. Renew / Upgrade Plan */}
                        {(activeTab === 'Active' || activeTab === 'Expired') && (
                            <button
                                onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, activeMembership: gymMem || m.activeMembership, isRenew: true } })}
                                className="w-8 h-8 rounded-lg border border-indigo-200 text-indigo-600 bg-white hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Renew / Upgrade Plan"
                            >
                                <FiRefreshCw size={14} />
                            </button>
                        )}

                        {/* 5. Add Bonus Days / Offer */}
                        {activeTab === 'Active' && (gymMem || m.activeMembership) && (
                            <button
                                onClick={() => setBonusModal({ open: true, membership: gymMem || m.activeMembership, days: '', reason: '' })}
                                className="w-8 h-8 rounded-lg border border-purple-200 text-purple-600 bg-white hover:border-purple-400 hover:bg-purple-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Add Bonus Days / Offer"
                            >
                                <FiGift size={14} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    const totalPlansCount = memberships.length;
    const activeMembershipsCount = members.filter(m => m.activeMembership).length;
    const scheduledMembershipsCount = members.filter(m => m.scheduledMembership).length;
    const expiredCount = members.filter(m => {
        if (!m.planEndDate) return false;
        const d = new Date(m.paidUntilDate || m.planEndDate);
        return d < new Date();
    }).length;
    const expiringSoonCount = members.filter(m => {
        if (!m.planEndDate) return false;
        const d = new Date(m.paidUntilDate || m.planEndDate);
        const now = new Date();
        const in30 = new Date();
        in30.setDate(now.getDate() + 30);
        return d >= now && d <= in30;
    }).length;
    const totalMembersCount = members.length;

    const summaryCardsData = [
        {
            title: 'Membership Plans',
            value: totalPlansCount,
            percentage: 'Active',
            percentageColor: 'text-emerald-600',
            subtitle: 'Packages offered',
            icon: <FiCreditCard />,
            bgClass: 'bg-[#FFECEC]',
            iconColor: 'text-[#E53935]'
        },
        {
            title: 'Active Memberships',
            value: activeMembershipsCount,
            percentage: `${totalMembersCount > 0 ? Math.round((activeMembershipsCount / totalMembersCount) * 100) : 0}%`,
            percentageColor: 'text-emerald-600',
            subtitle: scheduledMembershipsCount > 0 ? `${scheduledMembershipsCount} scheduled future` : 'Current running plans',
            icon: <FiCheckCircle />,
            bgClass: 'bg-[#E8F5E9]',
            iconColor: 'text-[#2E7D32]'
        },
        {
            title: 'Expiring Soon',
            value: expiringSoonCount,
            percentage: '30 Days',
            percentageColor: 'text-amber-600',
            subtitle: 'Renewal follow-up',
            icon: <FiAlertCircle />,
            bgClass: 'bg-[#FFF3E0]',
            iconColor: 'text-[#EA580C]'
        },
        {
            title: 'Expired Plans',
            value: expiredCount,
            percentage: 'Overdue',
            percentageColor: 'text-rose-600',
            subtitle: 'Action required',
            icon: <FiXCircle />,
            bgClass: 'bg-[#FFEBEE]',
            iconColor: 'text-[#E53935]'
        }
    ];

    const tabs = ['Plans', 'Assign', 'Active', 'Scheduled', 'Expired'];

    return (
        <PageLayout>
            <PageHeader
                title="Membership Management"
                subtitle="Manage subscription packages and member assignments"
                onAdd={activeTab === 'Plans' ? handleAddNew : null}
                addLabel={activeTab === 'Plans' ? "Add Plan" : ""}
            />

            <div className="px-6 md:px-8 pb-2 pt-0 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={summaryCardsData} loading={loading} />
            </div>

            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSearchTerm('');
                    setFilterPaymentStatus('All');
                    setCurrentPage(1);
                }}
            />

            <FilterBar
                searchTerm={searchTerm}
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setCurrentPage(1);
                }}
                searchPlaceholder={activeTab === 'Plans' ? "Search plans..." : "Search members..."}
            >
                {activeTab !== 'Plans' && (
                    <select
                        value={filterPaymentStatus}
                        onChange={(e) => {
                            setFilterPaymentStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="h-9 px-3 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 text-slate-600 shadow-2xs w-full sm:w-auto"
                    >
                        <option value="All">All Payment Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                    </select>
                )}
            </FilterBar>

            <div className="px-6 md:px-8 pb-6 pt-1 bg-[#FAEEEF] w-full flex flex-col gap-4 min-h-0 flex-1">
                {activeTab === 'Plans' ? (
                    <DataTable
                        columns={planColumns}
                        data={paginatedPlans}
                        loading={loading}
                        emptyMessage="No membership plans found."
                        renderRow={renderPlanRow}
                        pagination={{
                            currentPage: currentPage,
                            totalItems: totalPlans,
                            pageSize: pageSize,
                            onPageChange: (p) => setCurrentPage(p),
                            onPageSizeChange: (s) => setPageSize(s),
                            itemLabel: "plans"
                        }}
                    />
                ) : (
                    <DataTable
                        columns={memberColumns}
                        data={paginatedMembers}
                        loading={loading}
                        emptyMessage={`No ${activeTab.toLowerCase()} members found.`}
                        renderRow={renderMemberRow}
                        pagination={{
                            currentPage: currentPage,
                            totalItems: totalMembersInTab,
                            pageSize: pageSize,
                            onPageChange: (p) => setCurrentPage(p),
                            onPageSizeChange: (s) => setPageSize(s),
                            itemLabel: "members"
                        }}
                    />
                )}
            </div>

            {/* Bonus Days Modal */}
            {bonusModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-rose-100">
                        <div className="bg-[#CA0410] p-4 text-white flex items-center gap-3">
                            <FiGift className="text-2xl" />
                            <div>
                                <h3 className="font-bold text-lg">Add Bonus Days</h3>
                                <p className="text-xs text-rose-100">Reward member with extra validity</p>
                            </div>
                        </div>
                        <form onSubmit={handleAddBonus} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Number of Days <span className="text-rose-500">*</span></label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-bold"
                                    value={bonusModal.days}
                                    onChange={e => setBonusModal({ ...bonusModal, days: e.target.value })}
                                    placeholder="e.g. 5 (or -5 to remove)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Select Offer / Reason <span className="text-rose-500">*</span></label>
                                {gymSettings?.couponOffers?.filter(c => c.isActive && c.bonusDays > 0).length > 0 && (
                                    <select
                                        className="w-full px-3 py-2 mb-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-sm bg-slate-50 font-semibold cursor-pointer"
                                        onChange={(e) => {
                                            const selected = gymSettings.couponOffers.find(c => c.code === e.target.value);
                                            if (selected) {
                                                setBonusModal(prev => ({
                                                    ...prev,
                                                    reason: `${selected.title} (${selected.code})`,
                                                    days: selected.bonusDays
                                                }));
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>-- Select a predefined offer --</option>
                                        {gymSettings.couponOffers.filter(c => c.isActive && c.bonusDays > 0).map(c => (
                                            <option key={c.code} value={c.code}>{c.title} (+{c.bonusDays} Days)</option>
                                        ))}
                                    </select>
                                )}
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-medium"
                                    value={bonusModal.reason}
                                    onChange={e => setBonusModal({ ...bonusModal, reason: e.target.value })}
                                    placeholder="e.g. 100% Attendance Reward"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setBonusModal({ open: false, membership: null, days: '', reason: '' })} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-[#CA0410] hover:bg-[#a8030d] rounded-xl transition-colors cursor-pointer shadow-2xs">
                                    Add Days
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDestructive={confirmModal.isDestructive}
            />
        </PageLayout>
    );
}
export default Memberships;
