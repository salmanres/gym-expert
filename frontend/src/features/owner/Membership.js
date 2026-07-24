import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiEdit2, FiTrash2, FiCheckCircle, FiXCircle, FiPlus, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import Tabs from '../../components/page/Tabs'; // assuming we have or will create a simple Tabs or just render them manually. We will render them manually to be safe.

function Memberships() {
    const navigate = useNavigate();
    const [memberships, setMemberships] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Plans'); // 'Plans', 'Assign', 'Active', 'Expired', 'Renewals'

    const fetchData = async () => {
        setLoading(true);
        try {
            const [memRes, memberRes] = await Promise.all([
                apiClient.get('/memberships'),
                apiClient.get('/members') // Assumes getMembers populates membershipPlan
            ]);
            setMemberships(memRes.data);
            setMembers(memberRes.data);
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
            await apiClient.delete(`/memberships/${id}`);
            toast.success("Membership deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete membership");
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
    const filteredMembers = getMembersByStatus().filter(m => 
        (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.contactNumber.includes(searchTerm)
    );

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
                    <p className="font-bold text-slate-800 text-sm">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-slate-500">{m.memberId}</p>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600 font-medium">
                    {m.contactNumber}
                </td>
                <td className="py-3 px-4">
                    {m.membershipPlan ? (
                        <div>
                            <p className="font-bold text-slate-700 text-sm">{m.membershipPlan.name}</p>
                            <p className="text-[10px] text-slate-500">{new Date(m.planStartDate).toLocaleDateString()} to {endDate.toLocaleDateString()}</p>
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
                    <div className="flex items-center justify-center">
                        <button onClick={() => navigate(activeTab === 'Assign' ? `/dashboard/owner/membership/assign` : `/dashboard/owner/members/edit/${m._id}`, { state: { member: m } })} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded text-xs font-bold transition-colors flex items-center gap-1">
                            {activeTab === 'Assign' ? <><FiPlus /> Assign</> : 'Update'}
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
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                onAdd={activeTab === 'Plans' ? handleAddNew : null} 
                addLabel={activeTab === 'Plans' ? "Add Plan" : ""} 
            />
            
            <Tabs 
                tabs={tabs} 
                activeTab={activeTab} 
                onTabChange={(tab) => { setActiveTab(tab); setSearchTerm(''); }} 
            />

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
        </PageLayout>
    );
}
export default Memberships;
