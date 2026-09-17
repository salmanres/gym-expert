import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiEdit2, FiTrash2, FiPlus, FiCreditCard, FiRefreshCw, FiGift, FiPhone, FiCheckCircle, FiClock, FiAlertCircle, FiXCircle, FiUsers, FiEye } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import SummaryCards from '../../components/page/SummaryCards';
import { formatDate } from '../../utils/dateUtils';

function Memberships() {
    const navigate = useNavigate();
    const [memberships, setMemberships] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Plans'); // 'Plans', 'Assign', 'Active', 'Scheduled', 'Expired', 'Renewals'
    const [bonusModal, setBonusModal] = useState({ open: false, membership: null, days: '', reason: '' });
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

            const membersWithPlans = memberRes.data.map(member => {
                const activeMem = activeAndScheduled.find(m => (m.memberId?._id || m.memberId) === member._id && (m.membershipStatus === 'Active' || new Date(m.startDate) <= todayEnd));
                const scheduledMem = activeAndScheduled.find(m => (m.memberId?._id || m.memberId) === member._id && (m.membershipStatus === 'Scheduled' || new Date(m.startDate) > todayEnd));
                const latestMem = latestMemberships.find(m => (m.memberId?._id || m.memberId) === member._id);

                const mainMem = activeMem || scheduledMem || latestMem;

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
        if (!window.confirm('Are you sure you want to delete this membership plan?')) return;
        try {
            await apiClient.delete(`/membership-plans/${id}`);
            toast.success("Membership deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete membership");
        }
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
            if (activeTab === 'Assign') return !member.membershipPlan;
            if (activeTab === 'Scheduled') return (member.scheduledMembership && new Date(member.scheduledMembership.startDate) > todayEnd) || (member.activeMembership?.membershipStatus === 'Scheduled' && new Date(member.activeMembership.startDate) > todayEnd);

            if (!member.planEndDate) return false;
            const endDate = new Date(member.planEndDate);
            const isExpired = endDate < today;
            const isRenewingSoon = endDate >= today && endDate <= nextWeek;

            if (activeTab === 'Active') return !isExpired && (member.activeMembership?.membershipStatus === 'Active' || new Date(member.activeMembership?.startDate) <= todayEnd);
            if (activeTab === 'Expired') return isExpired && !member.scheduledMembership;
            if (activeTab === 'Renewals') return isRenewingSoon;
            return false;
        });
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
        { label: 'MEMBER', className: 'w-[25%] pl-4 pr-3' },
        { label: 'CONTACT', className: 'w-[15%] px-3' },
        { label: 'PLAN DETAILS', className: 'w-[24%] px-3' },
        { label: 'VALIDITY / STATUS', className: 'w-[14%] px-2 text-center' },
        { label: 'PAYMENT', className: 'w-[10%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[12%] pr-4 pl-1 text-center' }
    ];

    // Render Rows for Plans
    const renderPlanRow = (m, index) => {
        return (
            <tr key={m._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                            {(m.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                            <button 
                                onClick={() => handleEdit(m)}
                                className="font-bold text-slate-900 text-[13.5px] hover:text-[#CA0410] transition-colors text-left truncate leading-snug cursor-pointer"
                            >
                                {m.name}
                            </button>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                {m.sessions > 0 ? `${m.sessions} Sessions` : 'Unlimited Access'}
                            </p>
                        </div>
                    </div>
                </td>
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-wrap gap-1">
                        {(() => {
                            const rawTypes = Array.isArray(m.planType) ? m.planType : [m.planType || 'Gym Access'];
                            const flattened = rawTypes.flatMap(pt => typeof pt === 'string' ? pt.split('+').map(s => s.trim()) : [pt]);
                            return flattened.map((pt, i) => (
                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                    {pt}
                                </span>
                            ));
                        })()}
                    </div>
                </td>
                <td className="py-2.5 px-3 align-middle">
                    <span className="font-bold text-slate-900 text-[13px]">
                        {m.duration} {m.durationUnit || 'Months'}
                    </span>
                </td>
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-emerald-600 text-[14px]">
                        <span>₹</span>
                        <span>{Number(m.price || 0).toLocaleString()}</span>
                    </div>
                </td>
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        m.isActive 
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
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
        const isScheduledTab = activeTab === 'Scheduled' && m.scheduledMembership;
        const currentMem = isScheduledTab ? m.scheduledMembership : m.activeMembership;
        const planName = currentMem?.membershipPlanId?.name || currentMem?.planName || m.membershipPlan?.name;
        const startDate = currentMem?.startDate ? new Date(currentMem.startDate) : (m.planStartDate ? new Date(m.planStartDate) : null);
        const endDate = currentMem?.endDate ? new Date(currentMem.endDate) : (m.planEndDate ? new Date(m.planEndDate) : null);
        const paidUntilDate = currentMem?.paidUntilDate ? new Date(currentMem.paidUntilDate) : null;
        const paymentStat = currentMem?.paymentStatus || m.paymentStatus;
        const isPartial = paymentStat === 'Partial';

        const isExpired = !isScheduledTab && endDate && endDate < today;
        const isRenewingSoon = !isScheduledTab && endDate && endDate >= today && endDate <= nextWeek;

        return (
            <tr key={m._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        {m.profilePhoto ? (
                            <img src={m.profilePhoto} alt={m.firstName} className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                                {(m.firstName || 'M').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex flex-col items-start min-w-0">
                            <button 
                                onClick={() => navigate(`/dashboard/owner/members/view/${m._id}`, { state: { member: m } })}
                                className="font-bold text-slate-900 text-[13.5px] hover:text-[#CA0410] transition-colors text-left truncate leading-snug cursor-pointer"
                            >
                                {m.firstName} {m.lastName}
                            </button>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                ID: <span className="font-bold text-slate-700">{m.memberId}</span> • {m.gender || 'Member'}
                            </p>
                        </div>
                    </div>
                </td>
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[12.5px] tracking-tight">
                        <FiPhone className="text-slate-400 text-xs shrink-0" />
                        <span>{m.contactNumber || '-'}</span>
                    </div>
                </td>
                <td className="py-2.5 px-3 align-middle">
                    {planName ? (
                        <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                            <span className="font-semibold text-slate-800 text-[12.5px]">{planName}</span>
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-slate-500 font-normal text-[11.5px]">
                                    {startDate ? formatDate(startDate) : ''} - {isPartial && paidUntilDate ? formatDate(paidUntilDate) : (endDate ? formatDate(endDate) : '')}
                                </span>
                                {currentMem?.bonusDays > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        +{currentMem.bonusDays}d
                                    </span>
                                )}
                            </div>
                            {isPartial && paidUntilDate && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-max">
                                    Paid till {formatDate(paidUntilDate)} (₹{currentMem?.paidAmount || 0} / ₹{currentMem?.finalPrice || 0})
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 font-medium italic text-xs">No Active Plan</span>
                    )}
                </td>
                <td className="py-2.5 px-2 text-center align-middle">
                    {isScheduledTab ? (
                        <span className="inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs bg-indigo-50 text-indigo-700 border-indigo-200">
                            Scheduled
                        </span>
                    ) : endDate ? (
                        <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                            isExpired 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : isRenewingSoon 
                                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            {isExpired ? 'Expired' : isRenewingSoon ? 'Expiring Soon' : 'Active'}
                        </span>
                    ) : '-'}
                </td>
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        paymentStat === 'Paid' 
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' 
                            : paymentStat === 'Partial' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {paymentStat || 'Pending'}
                    </span>
                </td>
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        {(m.paymentStatus === 'Pending' || m.paymentStatus === 'Partial') && m.membershipPlan && activeTab !== 'Assign' && (
                            <button 
                                onClick={() => navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: m } })} 
                                className="w-8 h-8 rounded-lg border border-emerald-200 text-emerald-600 bg-white hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                title="Collect Fee"
                            >
                                <FiCreditCard size={14} />
                            </button>
                        )}
                        {activeTab === 'Active' && m.activeMembership && (
                            <button 
                                onClick={() => setBonusModal({ open: true, membership: m.activeMembership, days: '', reason: '' })} 
                                className="w-8 h-8 rounded-lg border border-indigo-200 text-indigo-600 bg-white hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                title="Add Bonus Days / Offer"
                            >
                                <FiGift size={14} />
                            </button>
                        )}
                        {(activeTab === 'Expired' || activeTab === 'Renewals') && (
                            <button 
                                onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, isRenew: true } })} 
                                className="w-8 h-8 rounded-lg border border-blue-200 text-blue-600 bg-white hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                title="Renew Plan"
                            >
                                <FiRefreshCw size={14} />
                            </button>
                        )}
                        <button 
                            onClick={() => navigate(`/dashboard/owner/members/view/${m._id}`, { state: { member: m } })} 
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                            title="View Profile"
                        >
                            <FiEye size={15} />
                        </button>
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
            subtitle: 'Current running plans',
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

    const tabs = ['Plans', 'Assign', 'Active', 'Scheduled', 'Expired', 'Renewals'];

    return (
        <PageLayout>
            <PageHeader 
                title="Membership Management" 
                subtitle="Manage subscription packages and member assignments" 
                onAdd={activeTab === 'Plans' ? handleAddNew : null} 
                addLabel={activeTab === 'Plans' ? "Add Plan" : ""} 
            />
            
            <div className="px-6 md:px-8 pb-2 pt-0 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={summaryCardsData} />
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
        </PageLayout>
    );
}
export default Memberships;
