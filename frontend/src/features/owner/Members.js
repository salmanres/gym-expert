import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import DataTable from '../../components/page/DataTable';
import ConfirmModal from '../../components/modal/ConfirmModal';
import EmptyState from '../../components/page/EmptyState';
import Loader from '../../components/page/Loader';
import SummaryCards from '../../components/page/SummaryCards';
import { FiUsers, FiPhone, FiMail, FiEdit2, FiTrash2, FiPlus, FiCreditCard, FiPauseCircle, FiPlayCircle, FiEye, FiUserCheck, FiUserX, FiUserPlus } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils';

export default function Members() {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All Members');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [filterGender, setFilterGender] = useState('All');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });

    const fetchMembers = async () => {
        try {
            const [membersRes, latestMembershipsRes] = await Promise.all([
                apiClient.get('/members'),
                apiClient.get('/member-memberships/latest')
            ]);

            const latestMemberships = latestMembershipsRes.data || [];
            const membersWithPlans = membersRes.data.map(member => {
                const memberActiveList = latestMemberships.filter(m => (m.memberId?._id || m.memberId) === member._id && (m.membershipStatus === 'Active' || m.membershipStatus === 'Frozen'));
                member.allActiveMemberships = memberActiveList;

                const membership = latestMemberships.find(m => (m.memberId?._id || m.memberId) === member._id);
                let computedStatus = member.status || 'Inactive';

                if (computedStatus !== 'Frozen') {
                    if (!membership) {
                        computedStatus = 'Inactive';
                    } else {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const validityDate = membership.paidUntilDate ? new Date(membership.paidUntilDate) : new Date(membership.endDate);
                        validityDate.setHours(23, 59, 59, 999);

                        const hasPaid = membership.paidAmount > 0;
                        const isExpired = validityDate < today;

                        if (!hasPaid || isExpired) {
                            computedStatus = 'Inactive';
                        } else {
                            computedStatus = 'Active';
                        }
                    }
                }

                if (membership) {
                    member.membershipPlan = membership.membershipPlanId || { name: membership.planName };
                    member.activeMembership = membership;
                    member.planEndDate = membership.endDate;
                    member.paymentStatus = membership.paymentStatus;
                    member.amountPaid = membership.paidAmount;
                }

                member.status = computedStatus;
                return member;
            });

            setMembers(membersWithPlans);
        } catch (error) {
            toast.error("Failed to load members");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    useEffect(() => {
        if (searchTerm && members.length > 0) {
            const lowerSearch = searchTerm.toLowerCase();
            const firstMatch = members.find(member => {
                const searchStr = `${member.firstName} ${member.lastName || ''} ${member.contactNumber} ${member.memberId}`.toLowerCase();
                return searchStr.includes(lowerSearch);
            });

            if (firstMatch) {
                if (activeTab !== firstMatch.status && activeTab !== 'All Members') {
                    setActiveTab(firstMatch.status);
                }
            }
        }
    }, [searchTerm, members, activeTab]);

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Member',
            message: 'Are you sure you want to delete this member? This action cannot be undone and will remove all associated records.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/members/${id}`);
                    toast.success("Member deleted successfully");
                    setMembers(members.filter(m => m._id !== id));
                } catch (error) {
                    toast.error("Failed to delete member");
                }
            }
        });
    };

    const handleEdit = (member) => {
        const formattedDate = member.dob ? new Date(member.dob).toISOString().split('T')[0] : '';
        const formattedJoining = member.joiningDate ? new Date(member.joiningDate).toISOString().split('T')[0] : '';
        const formattedMember = {
            ...member,
            dob: formattedDate,
            joiningDate: formattedJoining
        };
        navigate(`/dashboard/owner/members/edit/${member._id}`, { state: { member: formattedMember } });
    };

    const handleFreezeStatus = async (member, newStatus) => {
        const actionText = newStatus === 'Frozen' ? 'freeze' : 'unfreeze';

        setConfirmModal({
            isOpen: true,
            title: `${newStatus === 'Frozen' ? 'Freeze' : 'Unfreeze'} Membership`,
            message: `Are you sure you want to ${actionText} ${member.firstName}'s membership?`,
            isDestructive: newStatus === 'Frozen',
            onConfirm: async () => {
                try {
                    await apiClient.put(`/members/${member._id}`, { ...member, status: newStatus });
                    toast.success(`Member is now ${newStatus}`);
                    setMembers(members.map(m => m._id === member._id ? { ...m, status: newStatus } : m));
                } catch (error) {
                    toast.error("Failed to update member status");
                }
            }
        });
    };

    const filteredMembers = members.filter(member => {
        if (activeTab === 'Active' && member.status !== 'Active') return false;
        if (activeTab === 'Inactive' && member.status !== 'Inactive') return false;
        if (activeTab === 'Frozen' && member.status !== 'Frozen') return false;

        // Gender Filter
        if (filterGender !== 'All' && member.gender !== filterGender) return false;

        // Joining Date Filter
        if (filterStartDate || filterEndDate) {
            const itemDate = new Date(member.joiningDate);
            itemDate.setHours(0, 0, 0, 0);

            if (filterStartDate) {
                const start = new Date(filterStartDate);
                start.setHours(0, 0, 0, 0);
                if (itemDate < start) return false;
            }
            if (filterEndDate) {
                const end = new Date(filterEndDate);
                end.setHours(23, 59, 59, 999);
                if (itemDate > end) return false;
            }
        }

        const searchStr = `${member.firstName} ${member.lastName || ''} ${member.contactNumber} ${member.memberId}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const totalItems = filteredMembers.length;
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

    const getInitial = (member) => {
        const name = (member?.firstName || member?.name || member?.lastName || '').trim();
        return name ? name.charAt(0).toUpperCase() : 'M';
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Active':
                return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
            case 'Frozen':
                return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
            case 'Inactive':
                return 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const columns = [
        { label: 'MEMBER', className: 'w-[28%] pl-4 pr-3' },
        { label: 'CONTACT INFO', className: 'w-[18%] px-3' },
        { label: 'MEMBERSHIP / PLAN', className: 'w-[22%] px-3' },
        { label: 'STATUS', className: 'w-[12%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[20%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (member, index) => {
        return (
            <tr key={member._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                {/* MEMBER */}
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        {member.profilePhoto ? (
                            <img
                                src={member.profilePhoto}
                                alt={member.firstName}
                                className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 shrink-0"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                                {getInitial(member)}
                            </div>
                        )}

                        <div className="flex flex-col items-start min-w-0">
                            <button
                                onClick={() => navigate(`/dashboard/owner/members/view/${member._id}`, { state: { member } })}
                                className="font-bold text-slate-900 text-[13.5px] hover:text-[#CA0410] transition-colors text-left truncate leading-snug cursor-pointer"
                            >
                                {member.firstName} {member.lastName}
                            </button>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                ID: <span className="font-bold text-slate-700">{member.memberId}</span> • {member.gender || 'Member'} • Joined: {formatDate(member.joiningDate, 'N/A')}
                            </p>

                            {/* Multi-Plan Active Badges */}
                            <div className="flex flex-wrap items-center gap-1 mt-1 whitespace-nowrap">
                                {member.allActiveMemberships && member.allActiveMemberships.length > 0 ? (
                                    member.allActiveMemberships.map((m, i) => {
                                        const pNameRaw = String(m.membershipPlanId?.name || m.planName || '').toLowerCase();
                                        const pTypeRaw = String(m.membershipPlanId?.planType || m.planType || '').toLowerCase();
                                        const isExplicitPT = pTypeRaw.includes('personal training') || pTypeRaw.includes('pt') || pNameRaw.includes('personal training') || pNameRaw.includes('pt package');
                                        const isPT = Boolean(m.isPTConversion) || isExplicitPT;
                                        const pName = m.membershipPlanId?.name || m.planName || 'Plan';
                                        const trName = m.trainerId?.name ? `(${m.trainerId.name})` : '';
                                        const sessInfo = isPT && m.totalSessions > 0 ? `[${m.usedSessions || 0}/${m.totalSessions}]` : '';

                                        return (
                                            <span key={m._id || i} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border shrink-0 ${m.membershipStatus === 'Frozen'
                                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                                    : isPT
                                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                {isPT ? '🟡 PT' : '🟢 Gym'}: {pName} {sessInfo} {trName}
                                            </span>
                                        );
                                    })
                                ) : (
                                    member.membershipPlan && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border border-slate-200 text-slate-700 bg-slate-50 shrink-0">
                                            {member.membershipPlan.name}
                                        </span>
                                    )
                                )}

                                {member.walletBalance > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border border-indigo-200 text-indigo-700 bg-indigo-50 shrink-0">
                                        Wallet: ₹{member.walletBalance}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </td>

                {/* CONTACT INFO */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[12.5px] tracking-tight">
                            <FiPhone className="text-slate-400 text-xs shrink-0" />
                            <span>{member.contactNumber || '-'}</span>
                        </div>
                        {member.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 font-normal text-[11.5px]">
                                <FiMail className="text-slate-400 text-[11px] shrink-0" />
                                <span className="truncate max-w-[160px]" title={member.email}>{member.email}</span>
                            </div>
                        )}
                    </div>
                </td>

                {/* MEMBERSHIP / PLAN DETAILS */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        {member.membershipPlan ? (
                            <>
                                <div>
                                    <span className="text-slate-500 font-normal">Plan: </span>
                                    <span className="font-semibold text-slate-800">{member.membershipPlan.name}</span>
                                </div>
                                {member.planEndDate && (
                                    <div>
                                        <span className="text-slate-500 font-normal">Valid: </span>
                                        <span className="font-semibold text-slate-800">{formatDate(member.planEndDate)}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-slate-500 font-normal">Payment: </span>
                                    <span className={`font-bold ${member.paymentStatus === 'Paid' ? 'text-emerald-600' : member.paymentStatus === 'Partial' ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {member.paymentStatus || 'Pending'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <span className="text-slate-400 font-medium italic">No Active Plan</span>
                        )}
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${getStatusStyle(member.status)}`}>
                        {member.status || 'Inactive'}
                    </span>
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        {/* View Profile */}
                        <button
                            onClick={() => navigate(`/dashboard/owner/members/view/${member._id}`, { state: { member } })}
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="View Member Profile"
                        >
                            <FiEye size={15} />
                        </button>

                        {/* Collect Payment / Dues */}
                        <button
                            onClick={() => navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: member } })}
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-2xs active:scale-95 ${!member.membershipPlan
                                    ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : member.paymentStatus === 'Paid'
                                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-300 cursor-not-allowed'
                                        : 'border-emerald-200 text-emerald-600 bg-white hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer'
                                }`}
                            title={!member.membershipPlan ? 'No Active Plan' : member.paymentStatus === 'Paid' ? 'Fee Fully Paid' : 'Collect Fee'}
                            disabled={!member.membershipPlan || member.paymentStatus === 'Paid'}
                        >
                            <FiCreditCard size={14} />
                        </button>

                        {/* Assign / Renew Plan */}
                        <button
                            onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member } })}
                            className="w-8 h-8 rounded-lg border border-indigo-200 text-indigo-600 bg-white hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title={member.membershipPlan ? "Renew or Upgrade Plan" : "Assign Plan"}
                        >
                            <FiPlus size={15} />
                        </button>

                        {/* Freeze / Unfreeze */}
                        {member.status === 'Frozen' ? (
                            <button
                                onClick={() => handleFreezeStatus(member, 'Active')}
                                className="w-8 h-8 rounded-lg border border-cyan-300 text-cyan-600 bg-cyan-50/90 hover:border-cyan-500 hover:bg-cyan-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Unfreeze Membership"
                            >
                                <FiPlayCircle size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleFreezeStatus(member, 'Frozen')}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-2xs active:scale-95 ${!member.membershipPlan
                                        ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                        : 'border-cyan-200 text-cyan-600 bg-white hover:border-cyan-400 hover:bg-cyan-50 cursor-pointer'
                                    }`}
                                title={!member.membershipPlan ? "No Active Plan" : "Freeze Membership"}
                                disabled={!member.membershipPlan}
                            >
                                <FiPauseCircle size={14} />
                            </button>
                        )}

                        {/* Edit */}
                        <button
                            onClick={() => handleEdit(member)}
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Edit Record"
                        >
                            <FiEdit2 size={14} />
                        </button>

                        {/* Delete */}
                        <button
                            onClick={() => handleDelete(member._id)}
                            className="w-8 h-8 rounded-lg border border-rose-200 text-[#CA0410] bg-rose-50/60 hover:border-rose-300 hover:bg-rose-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Delete Record"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    const totalMembers = members.length;
    const activeMembersCount = members.filter(m => m.status === 'Active').length;
    const inactiveMembersCount = members.filter(m => m.status === 'Inactive' || m.status === 'Expired').length;
    const frozenMembersCount = members.filter(m => m.status === 'Frozen').length;
    const withPlanCount = members.filter(m => m.membershipPlan).length;
    const newThisMonthCount = members.filter(m => {
        const d = new Date(m.joinDate || m.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const summaryCardsData = [
        {
            title: 'Total Members',
            value: totalMembers,
            percentage: '100%',
            percentageColor: 'text-emerald-600',
            subtitle: 'Registered in gym',
            icon: <FiUsers />,
            bgClass: 'bg-[#FFECEC]',
            iconColor: 'text-[#E53935]'
        },
        {
            title: 'Active Members',
            value: activeMembersCount,
            percentage: `${totalMembers > 0 ? Math.round((activeMembersCount / totalMembers) * 100) : 0}%`,
            percentageColor: 'text-emerald-600',
            subtitle: 'Active subscriptions',
            icon: <FiUserCheck />,
            bgClass: 'bg-[#E8F5E9]',
            iconColor: 'text-[#2E7D32]'
        },
        {
            title: 'Inactive / Expired',
            value: inactiveMembersCount,
            percentage: 'Expired',
            percentageColor: 'text-rose-600',
            subtitle: 'Needs renewal',
            icon: <FiUserX />,
            bgClass: 'bg-[#FFF3E0]',
            iconColor: 'text-[#EA580C]'
        },
        {
            title: 'Frozen Members',
            value: frozenMembersCount,
            percentage: 'On Hold',
            percentageColor: 'text-blue-600',
            subtitle: 'Paused memberships',
            icon: <FiPauseCircle />,
            bgClass: 'bg-blue-50',
            iconColor: 'text-blue-600'
        },
        {
            title: 'New This Month',
            value: newThisMonthCount,
            percentage: 'New',
            percentageColor: 'text-purple-600',
            subtitle: 'Joined recently',
            icon: <FiUserPlus />,
            bgClass: 'bg-[#F3E8FF]',
            iconColor: 'text-[#7E22CE]'
        }
    ];

    if (loading) return <Loader text="Loading members..." />;

    return (
        <PageLayout>
            <PageHeader
                title="Members"
                subtitle="Manage active and inactive members"
                onAdd={() => navigate('/dashboard/owner/members/add')}
                addLabel="Add Member"
            />

            <div className="px-6 md:px-8 pb-2 pt-0 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={summaryCardsData} />
            </div>

            <Tabs
                tabs={['All Members', 'Active', 'Inactive', 'Frozen']}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSearchTerm('');
                    setFilterGender('All');
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
                searchPlaceholder="Search by name, phone or ID..."
            >
                <div className="flex items-center bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl shadow-2xs h-9 px-2.5 transition-all focus-within:border-[#CA0410] focus-within:ring-2 focus-within:ring-[#CA0410]/20 w-full sm:w-auto">
                    <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => {
                            setFilterStartDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="text-xs font-medium focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="Joining Date From"
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
                        title="Joining Date To"
                    />
                </div>

                <select
                    value={filterGender}
                    onChange={(e) => {
                        setFilterGender(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="h-9 px-3 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 text-slate-600 shadow-2xs w-full sm:w-auto"
                >
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </FilterBar>

            <div className="px-6 md:px-8 pb-6 pt-1 bg-[#FAEEEF] w-full flex flex-col gap-4 min-h-0 flex-1">
                <DataTable
                    columns={columns}
                    data={paginatedMembers}
                    loading={loading}
                    emptyMessage={searchTerm ? `No members match "${searchTerm}"` : "No members found."}
                    renderRow={renderRow}
                    pagination={{
                        currentPage: currentPage,
                        totalItems: totalItems,
                        pageSize: pageSize,
                        onPageChange: (p) => setCurrentPage(p),
                        onPageSizeChange: (s) => setPageSize(s),
                        itemLabel: "members"
                    }}
                />
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                confirmText={confirmModal.isDestructive ? "Yes, I'm sure" : "Confirm"}
            />
        </PageLayout>
    );
}
