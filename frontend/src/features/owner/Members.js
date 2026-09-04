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
import { FiUsers, FiPhone, FiMail, FiEdit2, FiTrash2, FiPlus, FiCreditCard, FiPauseCircle, FiPlayCircle, FiEye } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';

export default function Members() {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All Members');
    
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
                        today.setHours(0,0,0,0);
                        
                        const validityDate = membership.paidUntilDate ? new Date(membership.paidUntilDate) : new Date(membership.endDate);
                        validityDate.setHours(23,59,59,999);
                        
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
                    setActiveTab(firstMatch.status); // Usually 'Active', 'Inactive', 'Frozen'
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

        const searchStr = `${member.firstName} ${member.lastName || ''} ${member.contactNumber} ${member.memberId}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const columns = [
        { label: 'Member ID' },
        { label: 'Member Name' },
        { label: 'Contact Info' },
        { label: 'Status' },
        { label: 'Actions', className: 'text-center' }
    ];

    const renderRow = (member) => (
        <tr key={member._id} className="hover:bg-slate-50 transition-colors group">
            <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded border border-slate-200">
                    {member.memberId}
                </span>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                    {member.profilePhoto ? (
                        <img src={member.profilePhoto} alt={member.firstName} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shadow-sm border border-slate-200 shrink-0">
                            {member.firstName.charAt(0).toUpperCase()}{member.lastName ? member.lastName.charAt(0).toUpperCase() : ''}
                        </div>
                    )}
                    <div>
                        <p className="font-bold text-slate-800 text-sm">{member.firstName} {member.lastName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{member.gender} • Joined: {new Date(member.joiningDate).toLocaleDateString()}</p>
                        
                        {/* Multi-Plan Active Badges */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                            {member.allActiveMemberships && member.allActiveMemberships.length > 0 ? (
                                member.allActiveMemberships.map((m, i) => {
                                    const pNameRaw = String(m.membershipPlanId?.name || m.planName || '').toLowerCase();
                                    const pTypeRaw = String(m.membershipPlanId?.planType || m.planType || '').toLowerCase();
                                    const isExplicitPT = pTypeRaw.includes('personal training') || pTypeRaw.includes('pt') || pNameRaw.includes('personal training') || pNameRaw.includes('pt package');
                                    const isPT = Boolean(m.isPTConversion) || isExplicitPT;
                                    const pName = m.membershipPlanId?.name || m.planName || 'Plan';
                                    const trName = m.trainerId?.name ? `(Trainer: ${m.trainerId.name})` : '';
                                    const sessInfo = isPT && m.totalSessions > 0 ? `[${m.usedSessions || 0}/${m.totalSessions}]` : '';

                                    return (
                                        <span key={m._id || i} className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                                            m.membershipStatus === 'Frozen' 
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
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        {member.membershipPlan.name}
                                    </span>
                                )
                            )}

                            {member.walletBalance > 0 && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                    Wallet: ₹{member.walletBalance}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <FiPhone className="text-emerald-500 shrink-0" /> {member.contactNumber}
                    </div>
                    {member.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <FiMail className="text-emerald-500 shrink-0" /> {member.email}
                        </div>
                    )}
                </div>
            </td>
            <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : member.status === 'Frozen' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {member.status}
                </span>
            </td>
            <td className="py-3 px-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button onClick={() => navigate(`/dashboard/owner/members/view/${member._id}`, { state: { member } })} className="w-8 h-8 rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="View Profile">
                        <FiEye className="text-sm" />
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: member } })} 
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors shadow-sm ${!member.membershipPlan || member.paymentStatus === 'Paid' ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`} 
                        title={!member.membershipPlan ? 'No Active Plan' : member.paymentStatus === 'Paid' ? 'Fee Fully Paid' : 'Collect Fee'}
                        disabled={!member.membershipPlan || member.paymentStatus === 'Paid'}
                    >
                        <FiCreditCard className="text-sm" />
                    </button>
                    
                    <button 
                        onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member } })} 
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors shadow-sm ${!member.membershipPlan ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'}`}
                        title={member.membershipPlan ? "Renew or Upgrade Plan" : "Assign Plan"}
                    >
                        <FiPlus className="text-sm" />
                    </button>
                    
                    {member.status === 'Frozen' ? (
                        <button 
                            onClick={() => handleFreezeStatus(member, 'Active')} 
                            className={`w-8 h-8 rounded flex items-center justify-center transition-colors shadow-sm ${!member.membershipPlan ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`} 
                            title={!member.membershipPlan ? "No Active Plan" : "Unfreeze Membership"}
                            disabled={!member.membershipPlan}
                        >
                            <FiPlayCircle className="text-sm" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleFreezeStatus(member, 'Frozen')} 
                            className={`w-8 h-8 rounded flex items-center justify-center transition-colors shadow-sm ${!member.membershipPlan ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white'}`} 
                            title={!member.membershipPlan ? "No Active Plan" : "Freeze Membership"}
                            disabled={!member.membershipPlan}
                        >
                            <FiPauseCircle className="text-sm" />
                        </button>
                    )}
                    <button onClick={() => handleEdit(member)} className="w-8 h-8 rounded bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Edit Record">
                        <FiEdit2 className="text-sm" />
                    </button>
                    <button onClick={() => handleDelete(member._id)} className="w-8 h-8 rounded bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Delete Record">
                        <FiTrash2 className="text-sm" />
                    </button>
                </div>
            </td>
        </tr>
    );

    if (loading) return <Loader text="Loading members..." />;

    return (
        <PageLayout>
            <PageHeader 
                title="Members" 
                subtitle="Manage active and inactive members"
                onAdd={() => navigate('/dashboard/owner/members/add')}
                addLabel="Add Member"
            />
            <Tabs 
                tabs={['All Members', 'Active', 'Inactive', 'Frozen']}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSearchTerm('');
                    setFilterGender('All');
                    setFilterStartDate('');
                    setFilterEndDate('');
                }}
            />

            <FilterBar 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                searchPlaceholder="Search by name, phone or ID..."
            >
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm h-10 px-2 transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 w-full sm:w-auto">
                    <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="text-sm focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="Joining Date From"
                    />
                    <span className="text-slate-300 mx-2 font-medium text-xs">TO</span>
                    <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="text-sm focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="Joining Date To"
                    />
                </div>
                
                <select 
                    value={filterGender} 
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full sm:w-auto h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600 shadow-sm"
                >
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </FilterBar>

            {filteredMembers.length > 0 ? (
                <div className="px-4 py-4 flex-1 overflow-y-auto w-full">
                    <DataTable 
                        columns={columns} 
                        data={filteredMembers} 
                        loading={loading}
                        emptyMessage="No members found."
                        renderRow={renderRow} 
                    />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <EmptyState 
                        icon={<FiUsers size={48} />}
                        title={searchTerm ? "No members found" : "No members yet"}
                        description={searchTerm ? `No members match "${searchTerm}"` : "Get started by adding your first gym member."}
                        actionLabel={!searchTerm ? "Add Member" : null}
                        onAction={!searchTerm ? () => navigate('/dashboard/owner/members/add') : null}
                    />
                </div>
            )}

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
