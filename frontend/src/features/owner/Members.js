import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Tabs from '../../components/page/Tabs';
import DataTable from '../../components/page/DataTable';
import EmptyState from '../../components/page/EmptyState';
import Loader from '../../components/page/Loader';
import { FiUsers, FiPhone, FiMail, FiEdit2, FiTrash2 } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';

export default function Members() {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All Members');

    const fetchMembers = async () => {
        try {
            const { data } = await apiClient.get('/members');
            setMembers(data);
        } catch (error) {
            toast.error("Failed to load members");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this member?')) {
            try {
                await apiClient.delete(`/members/${id}`);
                toast.success("Member deleted successfully");
                setMembers(members.filter(m => m._id !== id));
            } catch (error) {
                toast.error("Failed to delete member");
            }
        }
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

    const filteredMembers = members.filter(member => {
        if (activeTab === 'Active' && member.status !== 'Active') return false;
        if (activeTab === 'Inactive' && member.status !== 'Inactive') return false;
        
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
                <p className="font-bold text-slate-800 text-sm">{member.firstName} {member.lastName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{member.gender} • Joined: {new Date(member.joiningDate).toLocaleDateString()}</p>
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
                <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {member.status}
                </span>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
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
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={() => navigate('/dashboard/owner/members/add')}
                addLabel="Add Member"
            />
            <Tabs 
                tabs={['All Members', 'Active', 'Inactive']}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {filteredMembers.length > 0 ? (
                <DataTable 
                    columns={columns} 
                    data={filteredMembers} 
                    loading={loading}
                    emptyMessage="No members found."
                    renderRow={renderRow} 
                />
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
        </PageLayout>
    );
}
