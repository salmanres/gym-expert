import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import ConfirmModal from '../../components/modal/ConfirmModal';
import EmptyState from '../../components/page/EmptyState';
import Loader from '../../components/page/Loader';
import FilterBar from '../../components/page/FilterBar';
import SummaryCards from '../../components/page/SummaryCards';
import Tabs from '../../components/page/Tabs';
import { FiUsers, FiEdit2, FiTrash2, FiPhone, FiMail, FiEye, FiLock, FiClock, FiUserCheck, FiAward, FiDollarSign, FiBriefcase, FiUserX } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';

export default function Staff() {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All Staff');
    const [filterStatus, setFilterStatus] = useState('All');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

    const handleToggleStatus = (staff) => {
        if (!isOwner) {
            toast.error("Only Gym Owner can change staff status.");
            return;
        }

        const isCurrentlySuspended = staff.status === 'Suspended';
        const targetStatus = isCurrentlySuspended ? 'Active' : 'Suspended';

        setConfirmModal({
            isOpen: true,
            title: isCurrentlySuspended ? 'Activate Staff Member' : 'Suspend Staff Member',
            message: isCurrentlySuspended
                ? `Are you sure you want to activate ${staff.name}? Their system access and login will be restored.`
                : `Are you sure you want to suspend ${staff.name}? They will be blocked from logging into the gym portal.`,
            isDestructive: !isCurrentlySuspended,
            onConfirm: async () => {
                try {
                    await apiClient.put(`/staff/${staff._id}`, { status: targetStatus });
                    toast.success(`Staff member ${isCurrentlySuspended ? 'activated' : 'suspended'} successfully`);
                    setStaffList(prev => prev.map(s => s._id === staff._id ? { ...s, status: targetStatus } : s));
                } catch (error) {
                    toast.error(error.response?.data?.message || `Failed to update staff status`);
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
        const roleUpper = (staff.role || '').toUpperCase();
        if (activeTab === 'Trainers' && roleUpper !== 'TRAINER') return false;
        if (activeTab === 'Admin & Supporting Staff' && roleUpper === 'TRAINER') return false;

        if (filterStatus !== 'All' && (staff.status || 'Active') !== filterStatus) return false;
        
        const searchStr = `${staff.name || ''} ${staff.email || ''} ${staff.phone || ''} ${staff.staffId || ''}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const totalItems = filteredStaff.length;
    const paginatedStaff = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

    const getRoleBadgeStyle = (role) => {
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

    const columns = [
        { label: 'STAFF MEMBER', className: 'w-[28%] pl-4 pr-3' },
        { label: 'CONTACT INFO', className: 'w-[18%] px-3' },
        { label: 'ROLE & SHIFT', className: 'w-[20%] px-3' },
        { label: 'WALLET (REWARDS)', className: 'w-[14%] px-3' },
        { label: 'STATUS', className: 'w-[10%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[10%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (staff, index) => {
        return (
            <tr key={staff._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                {/* STAFF NAME & ID */}
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        {staff.profilePhoto ? (
                            <img 
                                src={staff.profilePhoto} 
                                alt={staff.name} 
                                className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 shrink-0" 
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                                {(staff.name || 'S').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex flex-col items-start min-w-0">
                            <button 
                                onClick={() => navigate(`/dashboard/owner/staff/view/${staff._id}`, { state: { staff } })}
                                className="font-bold text-slate-900 text-[13.5px] hover:text-[#CA0410] transition-colors text-left truncate leading-snug cursor-pointer"
                            >
                                {staff.name}
                            </button>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                ID: <span className="font-bold text-slate-700">{staff.staffId || staff.employeeId || `STF-${staff._id.slice(-4).toUpperCase()}`}</span> • {staff.gender || 'Staff'}
                            </p>
                        </div>
                    </div>
                </td>

                {/* CONTACT INFO */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        {staff.phone && (
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[12.5px] tracking-tight">
                                <FiPhone className="text-slate-400 text-xs shrink-0" />
                                <span>{staff.phone}</span>
                            </div>
                        )}
                        {staff.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 font-normal text-[11.5px]">
                                <FiMail className="text-slate-400 text-[11px] shrink-0" />
                                <span className="truncate max-w-[150px]" title={staff.email}>{staff.email}</span>
                            </div>
                        )}
                    </div>
                </td>

                {/* ROLE & SHIFT */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border w-max ${getRoleBadgeStyle(staff.role)}`}>
                            {getRoleLabel(staff.role)}
                        </span>
                        {staff.shiftStart && staff.shiftEnd ? (
                            <div className="flex items-center gap-1 text-slate-500 font-normal text-[11.5px]">
                                <FiClock className="text-slate-400 text-[10px] shrink-0" />
                                <span>{staff.shiftStart} - {staff.shiftEnd}</span>
                            </div>
                        ) : null}
                    </div>
                </td>

                {/* WALLET (REWARDS) */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-slate-900 text-[13.5px]">
                        <span className="text-emerald-600 font-bold">₹</span>
                        <span>{Number(staff.walletBalance || 0).toLocaleString()}</span>
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        staff.status === 'Active' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        staff.status === 'Suspended' ? 'bg-rose-50 text-[#CA0410] border-rose-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                        {staff.status || 'Active'}
                    </span>
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        {/* View Profile */}
                        <button 
                            onClick={() => navigate(`/dashboard/owner/staff/view/${staff._id}`, { state: { staff } })} 
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                            title="View Profile"
                        >
                            <FiEye size={15} />
                        </button>

                        {/* Edit */}
                        {isOwner && (
                            <button 
                                onClick={() => handleEdit(staff)} 
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                title="Edit Staff"
                            >
                                <FiEdit2 size={14} />
                            </button>
                        )}

                        {/* Suspend / Activate Toggle */}
                        {isOwner && (
                            <button 
                                onClick={() => handleToggleStatus(staff)} 
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 ${
                                    staff.status === 'Suspended'
                                        ? 'border-emerald-200 text-emerald-600 bg-emerald-50/60 hover:border-emerald-400 hover:bg-emerald-100'
                                        : 'border-amber-200 text-amber-700 bg-amber-50/60 hover:border-amber-400 hover:bg-amber-100'
                                }`}
                                title={staff.status === 'Suspended' ? 'Activate Staff' : 'Suspend Staff'}
                            >
                                {staff.status === 'Suspended' ? <FiUserCheck size={14} /> : <FiUserX size={14} />}
                            </button>
                        )}

                        {/* Delete */}
                        {isOwner && (
                            <button 
                                onClick={() => handleDelete(staff._id)} 
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-rose-300 hover:text-[#CA0410] hover:bg-rose-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95" 
                                title="Delete Staff"
                            >
                                <FiTrash2 size={14} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    const totalStaff = staffList.length;
    const trainersCount = staffList.filter(s => (s.role || '').toUpperCase() === 'TRAINER').length;
    const staffCount = staffList.filter(s => (s.role || '').toUpperCase() !== 'TRAINER').length;
    const activeStaffCount = staffList.filter(s => s.status === 'Active' || !s.status).length;

    const summaryCardsData = [
        {
            title: 'Total Staff',
            value: totalStaff,
            subtitle: 'Registered members',
            icon: <FiUsers />,
            bgClass: 'bg-[#FFECEC]',
            iconColor: 'text-[#E53935]',
            onClick: () => { setActiveTab('All Staff'); setCurrentPage(1); }
        },
        {
            title: 'Trainers',
            value: trainersCount,
            subtitle: 'Fitness instructors',
            icon: <FiAward />,
            bgClass: 'bg-[#E8F5E9]',
            iconColor: 'text-[#2E7D32]',
            onClick: () => { setActiveTab('Trainers'); setCurrentPage(1); }
        },
        {
            title: 'Admin & Staff',
            value: staffCount,
            subtitle: 'Admin & ops staff',
            icon: <FiBriefcase />,
            bgClass: 'bg-[#F3E8FF]',
            iconColor: 'text-[#7E22CE]',
            onClick: () => { setActiveTab('Admin & Supporting Staff'); setCurrentPage(1); }
        },
        {
            title: 'Active Duty',
            value: activeStaffCount,
            subtitle: 'Working status',
            icon: <FiUserCheck />,
            bgClass: 'bg-[#E3F2FD]',
            iconColor: 'text-[#1976D2]',
            onClick: () => { setFilterStatus('Active'); setCurrentPage(1); }
        }
    ];

    return (
        <PageLayout>
            <PageHeader 
                title="Staff Management" 
                subtitle="Manage trainers, admins, and other staff members"
                onAdd={isOwner ? () => navigate('/dashboard/owner/staff/add') : null}
                addLabel={isOwner ? "Add Staff" : null}
            />

            <div className="px-6 md:px-8 pb-2 pt-0 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={summaryCardsData} loading={loading} />
            </div>

            <Tabs 
                tabs={[
                    { key: 'All Staff', label: 'All Staff', count: totalStaff },
                    { key: 'Trainers', label: 'Trainers', count: trainersCount },
                    { key: 'Admin & Supporting Staff', label: 'Admin & Supporting Staff', count: staffCount }
                ]}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSearchTerm('');
                    setCurrentPage(1);
                }}
            />

            {!isOwner && (
                <div className="mx-6 md:mx-8 my-2 p-3 bg-amber-50/90 backdrop-blur-sm border border-amber-200/80 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
                    <FiLock className="text-amber-600 text-sm shrink-0" />
                    <span>Admin Mode: You have full access to view and manage leads, members, memberships, and reports. Staff creation & editing is reserved for Gym Owner.</span>
                </div>
            )}

            <FilterBar 
                searchTerm={searchTerm} 
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setCurrentPage(1);
                }} 
                searchPlaceholder="Search by name, email or phone..."
            >
                <select 
                    value={filterStatus} 
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="h-9 px-3 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 text-slate-600 shadow-2xs w-full sm:w-auto"
                >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Only</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </FilterBar>

            <div className="px-6 md:px-8 pb-6 pt-1 bg-[#FAEEEF] w-full flex flex-col gap-4 min-h-0 flex-1">
                <DataTable 
                    columns={columns} 
                    data={paginatedStaff} 
                    loading={loading}
                    emptyMessage={searchTerm ? `No staff match "${searchTerm}"` : "No staff members found."}
                    renderRow={renderRow} 
                    pagination={{
                        currentPage: currentPage,
                        totalItems: totalItems,
                        pageSize: pageSize,
                        onPageChange: (p) => setCurrentPage(p),
                        onPageSizeChange: (s) => setPageSize(s),
                        itemLabel: "staff members"
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
