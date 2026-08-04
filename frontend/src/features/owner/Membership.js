import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiEdit2, FiTrash2, FiCheckCircle, FiXCircle, FiPlus, FiAlertCircle, FiCreditCard, FiRefreshCw, FiGift } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';

function Memberships() {
    const navigate = useNavigate();
    const [memberships, setMemberships] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Plans'); // 'Plans', 'Assign', 'Active', 'Expired', 'Renewals'
    const [bonusModal, setBonusModal] = useState({ open: false, membership: null, days: '', reason: '' });
    
    // Filters
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('All');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [memRes, memberRes, activeMembershipsRes] = await Promise.all([
                apiClient.get('/membership-plans'),
                apiClient.get('/members'),
                apiClient.get('/member-memberships/active')
            ]);
            
            const activeMemberships = activeMembershipsRes.data;
            const membersWithPlans = memberRes.data.map(member => {
                const membership = activeMemberships.find(m => m.memberId?._id === member._id);
                if (membership) {
                    member.membershipPlan = membership.membershipPlanId;
                    member.activeMembership = membership;
                    member.planStartDate = membership.startDate;
                    member.planEndDate = membership.endDate;
                    member.paymentStatus = membership.paymentStatus;
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
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Derived Data
    const getMembersByStatus = () => {
        return members.filter(member => {
            if (!member.planEndDate) return activeTab === 'Assign';
            
            const endDate = new Date(member.planEndDate);
            const isExpired = endDate < today;
            const isRenewingSoon = endDate >= today && endDate <= nextWeek;
            
            if (activeTab === 'Assign') return !member.membershipPlan;
            if (activeTab === 'Active') return !isExpired;
            if (activeTab === 'Expired') return isExpired;
            if (activeTab === 'Renewals') return isRenewingSoon;
            return false;
        });
    };

    const filteredMemberships = memberships.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredMembers = getMembersByStatus().filter(m => {
        // Payment Status Filter
        if (filterPaymentStatus !== 'All' && (m.paymentStatus || 'Pending') !== filterPaymentStatus) return false;

        return (
            (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.contactNumber || '').includes(searchTerm)
        );
    });

    // Column Definitions
    const planColumns = [
        { label: 'Plan Name' },
        { label: 'Type' },
        { label: 'Duration' },
        { label: 'Price' },
        { label: 'Status' },
        { label: 'Actions', className: 'text-center' }
    ];

    const memberColumns = [
        { label: 'Member' },
        { label: 'Contact' },
        { label: 'Plan Details' },
        { label: 'End Date' },
        { label: 'Payment' },
        { label: 'Action', className: 'text-center' }
    ];

    // Render Rows
    const renderPlanRow = (m) => (
        <tr key={m._id} className="hover:bg-slate-50 transition-colors">
            <td className="py-3 px-4">
                <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                {m.sessions > 0 && <span className="text-[10px] text-slate-500 font-medium">{m.sessions} Sessions</span>}
            </td>
            <td className="py-3 px-4 text-sm text-slate-600 font-medium">
                <div className="flex flex-wrap gap-1">
                    {(Array.isArray(m.planType) ? m.planType : [m.planType || 'Gym Access']).map((pt, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                            {pt}
                        </span>
                    ))}
                </div>
            </td>
            <td className="py-3 px-4 text-sm text-slate-600">{m.duration} {m.durationUnit || 'Months'}</td>
            <td className="py-3 px-4 text-sm font-semibold text-emerald-600">₹{m.price}</td>
            <td className="py-3 px-4">
                {m.isActive ? 
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded w-max"><FiCheckCircle /> Active</span> : 
                    <span className="flex items-center gap-1 text-rose-600 text-xs font-bold bg-rose-50 px-2 py-1 rounded w-max"><FiXCircle /> Inactive</span>}
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleEdit(m)} className="w-8 h-8 rounded bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white flex items-center justify-center shadow-sm" title="Edit">
                        <FiEdit2 className="text-sm" />
                    </button>
                    <button onClick={() => handleDelete(m._id)} className="w-8 h-8 rounded bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center shadow-sm" title="Delete">
                        <FiTrash2 className="text-sm" />
                    </button>
                </div>
            </td>
        </tr>
    );

    const renderMemberRow = (m) => {
        const endDate = m.planEndDate ? new Date(m.planEndDate) : null;
        const isExpired = endDate && endDate < today;
        const isRenewingSoon = endDate && endDate >= today && endDate <= nextWeek;

        return (
            <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                        {m.profilePhoto ? (
                            <img src={m.profilePhoto} alt={m.firstName} className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shadow-sm border border-slate-200 shrink-0">
                                {m.firstName.charAt(0).toUpperCase()}{m.lastName ? m.lastName.charAt(0).toUpperCase() : ''}
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-slate-500">{m.memberId}</p>
                        </div>
                    </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600 font-medium">
                    {m.contactNumber}
                </td>
                <td className="py-3 px-4">
                    {m.membershipPlan ? (
                        <div>
                            <p className="font-bold text-slate-700 text-sm">{m.membershipPlan.name}</p>
                            <p className="text-[10px] text-slate-500">{new Date(m.planStartDate).toLocaleDateString()} to {endDate.toLocaleDateString()}</p>
                            {m.activeMembership?.bonusDays > 0 && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-1">+{m.activeMembership.bonusDays} Bonus Days</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-slate-400 italic">No Plan</span>
                    )}
                </td>
                <td className="py-3 px-4">
                    {endDate ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 w-max ${isExpired ? 'bg-rose-50 text-rose-600' : isRenewingSoon ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isExpired ? <FiXCircle /> : isRenewingSoon ? <FiAlertCircle /> : <FiCheckCircle />}
                            {isExpired ? 'Expired' : isRenewingSoon ? 'Expiring Soon' : 'Active'}
                        </span>
                    ) : '-'}
                </td>
                <td className="py-3 px-4 text-sm">
                    {m.paymentStatus === 'Paid' ? (
                        <span className="text-emerald-600 font-bold">Paid</span>
                    ) : (
                        <span className="text-rose-600 font-bold">{m.paymentStatus}</span>
                    )}
                </td>
                <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {(m.paymentStatus === 'Pending' || m.paymentStatus === 'Partial') && m.membershipPlan && activeTab !== 'Assign' && (
                            <button onClick={() => navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: m } })} className="w-8 h-8 rounded bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Collect Fee">
                                <FiCreditCard className="text-sm" />
                            </button>
                        )}
                        {activeTab === 'Active' && m.activeMembership && (
                            <button onClick={() => setBonusModal({ open: true, membership: m.activeMembership, days: '', reason: '' })} className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Add Bonus Days / Offer">
                                <FiGift className="text-sm" />
                            </button>
                        )}
                        {(activeTab === 'Expired' || activeTab === 'Renewals') && (
                            <button onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m, isRenew: true } })} className="w-8 h-8 rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Renew Plan">
                                <FiRefreshCw className="text-sm" />
                            </button>
                        )}
                        <button onClick={() => navigate(`/dashboard/owner/membership/assign`, { state: { member: m } })} className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title={activeTab === 'Assign' ? 'Assign Plan' : 'Update Membership'}>
                            {activeTab === 'Assign' ? <FiPlus className="text-sm" /> : <FiEdit2 className="text-sm" />}
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    const tabs = ['Plans', 'Assign', 'Active', 'Expired', 'Renewals'];

    return (
        <PageLayout>
            <PageHeader 
                title="Membership Management" 
                subtitle="Manage subscription packages and member assignments" 
                onAdd={activeTab === 'Plans' ? handleAddNew : null} 
                addLabel={activeTab === 'Plans' ? "Add Plan" : ""} 
            />
            
            <Tabs 
                tabs={tabs} 
                activeTab={activeTab} 
                onTabChange={(tab) => { 
                    setActiveTab(tab); 
                    setSearchTerm(''); 
                    setFilterPaymentStatus('All');
                }} 
            />

            <FilterBar 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                searchPlaceholder={activeTab === 'Plans' ? "Search plans..." : "Search members..."}
            >
                {activeTab !== 'Plans' && (
                    <select 
                        value={filterPaymentStatus} 
                        onChange={(e) => setFilterPaymentStatus(e.target.value)}
                        className="w-full sm:w-auto h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600 shadow-sm"
                    >
                        <option value="All">All Payment Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                    </select>
                )}
            </FilterBar>

            {activeTab === 'Plans' ? (
                <DataTable 
                    columns={planColumns} 
                    data={filteredMemberships} 
                    loading={loading} 
                    emptyMessage="No membership plans found." 
                    renderRow={renderPlanRow} 
                />
            ) : (
                <DataTable 
                    columns={memberColumns} 
                    data={filteredMembers} 
                    loading={loading} 
                    emptyMessage={`No ${activeTab.toLowerCase()} members found.`} 
                    renderRow={renderMemberRow} 
                />
            )}

            {/* Bonus Days Modal */}
            {bonusModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="bg-indigo-600 p-4 text-white flex items-center gap-3">
                            <FiGift className="text-2xl" />
                            <div>
                                <h3 className="font-bold text-lg">Add Bonus Days</h3>
                                <p className="text-xs text-indigo-200">Reward member with extra validity</p>
                            </div>
                        </div>
                        <form onSubmit={handleAddBonus} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Number of Days <span className="text-rose-500">*</span></label>
                                <input 
                                    type="number" 
                                    required 
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={bonusModal.days}
                                    onChange={e => setBonusModal({ ...bonusModal, days: e.target.value })}
                                    placeholder="e.g. 5 (or -5 to remove)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Offer Name <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={bonusModal.reason}
                                    onChange={e => setBonusModal({ ...bonusModal, reason: e.target.value })}
                                    placeholder="e.g. Referred a friend"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setBonusModal({ open: false, membership: null, days: '', reason: '' })} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
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
