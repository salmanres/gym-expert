import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import ConfirmModal from '../../components/modal/ConfirmModal';
import EmptyState from '../../components/page/EmptyState';
import Loader from '../../components/page/Loader';
import FilterBar from '../../components/page/FilterBar';
import { FiUsers, FiEdit2, FiTrash2, FiPhone, FiMail, FiEye, FiLock } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';

export default function Staff() {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });

    // Check Current User Role
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isOwner = currentUser?.role === 'GYM_OWNER';

    const fetchStaff = async () => {
        try {
            const res = await apiClient.get('/staff');
            setStaffList(res.data);
        } catch (error) {
            toast.error("Failed to load staff members");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleDelete = async (id) => {
        if (!isOwner) {
            toast.error("Only Gym Owner can delete staff members.");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Delete Staff Member',
            message: 'Are you sure you want to delete this staff member? This will revoke their access to the system.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/staff/${id}`);
                    toast.success("Staff member deleted successfully");
                    setStaffList(staffList.filter(s => s._id !== id));
                } catch (error) {
                    toast.error(error.response?.data?.message || "Failed to delete staff member");
                }
            }
        });
    };

    const handleEdit = (staff) => {
        if (!isOwner) {
            toast.error("Only Gym Owner can edit staff members.");
            return;
        }
        navigate(`/dashboard/owner/staff/edit/${staff._id}`, { state: { staff } });
    };

    const filteredStaff = staffList.filter(staff => {
        if (filterRole !== 'All' && staff.role !== filterRole) return false;
        
        const searchStr = `${staff.name} ${staff.email} ${staff.phone}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const columns = [
        { label: 'Name' },
        { label: 'Contact Info' },
        { label: 'Role' },
        { label: 'Wallet (Rewards)' },
        { label: 'Status' },
        { label: 'Actions', className: 'text-center' }
    ];

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'ADMIN':
            case 'BRANCH_MANAGER': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'TRAINER': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'ADMIN': return 'Admin';
            case 'BRANCH_MANAGER': return 'Branch Manager';
            case 'TRAINER': return 'Trainer';
            default: return 'Staff';
        }
    };

    const renderRow = (staff) => (
        <tr key={staff._id} className="hover:bg-slate-50 transition-colors group">
            <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                    {staff.profilePhoto ? (
                        <img src={staff.profilePhoto} alt={staff.name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shadow-sm border border-slate-200 shrink-0">
                            {staff.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <p className="font-bold text-slate-800 text-sm">{staff.name}</p>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex flex-col gap-1">
                    {staff.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <FiPhone className="text-emerald-500 shrink-0" /> {staff.phone}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <FiMail className="text-emerald-500 shrink-0" /> {staff.email}
                    </div>
                </div>
            </td>
            <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${getRoleBadgeColor(staff.role)}`}>
                    {getRoleLabel(staff.role)}
                </span>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 font-black text-slate-800">
                    <span className="text-emerald-500 font-bold">₹</span>
                    {staff.walletBalance || 0}
                </div>
            </td>
            <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${staff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                    {staff.status || 'Active'}
                </span>
            </td>
            <td className="py-3 px-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button onClick={() => navigate(`/dashboard/owner/staff/view/${staff._id}`, { state: { staff } })} className="w-8 h-8 rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="View Profile">
                        <FiEye className="text-sm" />
                    </button>
                    {isOwner && (
                        <>
                            <button onClick={() => handleEdit(staff)} className="w-8 h-8 rounded bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Edit Record">
                                <FiEdit2 className="text-sm" />
                            </button>
                            <button onClick={() => handleDelete(staff._id)} className="w-8 h-8 rounded bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Delete Record">
                                <FiTrash2 className="text-sm" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );

    if (loading) return <Loader text="Loading staff..." />;

    return (
        <PageLayout>
            <PageHeader 
                title="Staff Management" 
                subtitle="Manage trainers, admins, and other staff members"
                onAdd={isOwner ? () => navigate('/dashboard/owner/staff/add') : null}
                addLabel={isOwner ? "Add Staff" : null}
            />

            {!isOwner && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                    <FiLock className="text-amber-600 text-sm shrink-0" />
                    <span>Admin Mode: You have full access to view and manage leads, members, memberships, and reports. Staff creation & editing is reserved for Gym Owner.</span>
                </div>
            )}

            <FilterBar 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                searchPlaceholder="Search by name, email or phone..."
            >
                <select 
                    value={filterRole} 
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full sm:w-auto h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600 shadow-sm"
                >
                    <option value="All">All Roles</option>
                    <option value="TRAINER">Trainers</option>
                    <option value="ADMIN">Admins</option>
                    <option value="STAFF">Other Staff</option>
                </select>
            </FilterBar>

            {filteredStaff.length > 0 ? (
                <DataTable 
                    columns={columns} 
                    data={filteredStaff} 
                    loading={loading}
                    emptyMessage="No staff members found."
                    renderRow={renderRow} 
                />
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <EmptyState 
                        icon={<FiUsers size={48} />}
                        title={searchTerm ? "No staff found" : "No staff yet"}
                        description={searchTerm ? `No staff match "${searchTerm}"` : "Get started by adding your first trainer or admin."}
                        actionLabel={!searchTerm && isOwner ? "Add Staff" : null}
                        onAction={!searchTerm && isOwner ? () => navigate('/dashboard/owner/staff/add') : null}
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
