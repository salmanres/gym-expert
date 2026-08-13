import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiPhone, FiMail, FiCalendar, FiMessageSquare, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';
import { toast } from 'react-toastify';

// Import components
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Tabs from '../../components/page/Tabs';
import DataTable from '../../components/page/DataTable';

function Leads() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Enquiries');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLeads = async () => {
        try {
            const res = await apiClient.get('/enquiries');
            setLeads(res.data);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to fetch leads");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleAddNew = () => {
        navigate('/dashboard/owner/leads/add');
    };

    const handleEdit = (lead) => {
        const formattedDate = lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '';
        const formattedTrial = lead.trialDate ? new Date(lead.trialDate).toISOString().split('T')[0] : '';
        const formattedTrialEnd = lead.trialEndDate ? new Date(lead.trialEndDate).toISOString().split('T')[0] : '';
        const formattedLead = {
            ...lead,
            firstName: lead.firstName || lead.name || '',
            contactNumber: lead.contactNumber || lead.phone || '',
            followUpDate: formattedDate,
            trialDate: formattedTrial,
            trialEndDate: formattedTrialEnd,
            response: lead.response || ''
        };
        navigate(`/dashboard/owner/leads/edit/${lead._id}`, { state: { lead: formattedLead } });
    };

    const handleStatusDropdownChange = async (lead, newStatus) => {
        if (newStatus === lead.status) return;

        if (['Negotiation', 'Lost', 'Converted'].includes(newStatus)) {
            const formattedDate = lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '';
            const formattedTrial = lead.trialDate ? new Date(lead.trialDate).toISOString().split('T')[0] : '';
            const formattedTrialEnd = lead.trialEndDate ? new Date(lead.trialEndDate).toISOString().split('T')[0] : '';
            const formattedLead = {
                ...lead,
                firstName: lead.firstName || lead.name || '',
                contactNumber: lead.contactNumber || lead.phone || '',
                followUpDate: formattedDate,
                trialDate: formattedTrial,
                trialEndDate: formattedTrialEnd,
                response: lead.response || '',
                status: newStatus
            };
            navigate(`/dashboard/owner/leads/edit/${lead._id}`, { state: { lead: formattedLead, autoFocusStatus: newStatus } });
        } else {
            try {
                await apiClient.put(`/enquiries/${lead._id}`, { status: newStatus });
                toast.success("Status updated");
                fetchLeads();
            } catch (error) {
                toast.error("Failed to update status");
            }
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this prospect?')) return;
        try {
            await apiClient.delete(`/enquiries/${id}`);
            toast.success("Prospect deleted successfully");
            fetchLeads();
        } catch (error) {
            toast.error("Failed to delete prospect");
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            await apiClient.put(`/enquiries/${id}`, { status: newStatus });
            toast.success("Status updated");
            fetchLeads();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const filteredLeads = leads.filter(lead => {
        let tabMatch = true;
        if (activeTab === 'Enquiries') tabMatch = lead.status === 'Pending';
        else if (activeTab === 'Leads') tabMatch = lead.status === 'Lead';
        else if (activeTab === 'Follow Ups') tabMatch = !!lead.followUpDate && lead.status !== 'Converted' && lead.status !== 'Lost';
        else if (activeTab === 'Trials') tabMatch = !!lead.trialDate || !!lead.trialEndDate;
        else if (activeTab === 'Negotiation') tabMatch = lead.status === 'Negotiation';
        else if (activeTab === 'Converted') tabMatch = lead.status === 'Converted';
        else if (activeTab === 'Lost') tabMatch = lead.status === 'Lost';
        
        const searchStr = `${lead.firstName || lead.name || ''} ${lead.lastName || ''} ${lead.contactNumber || lead.phone || ''}`.toLowerCase();
        const searchMatch = searchStr.includes(searchTerm.toLowerCase());
        
        return tabMatch && searchMatch;
    });

    const columns = [
        { label: 'Prospect' },
        { label: 'Contact' },
        { label: 'Details' },
        { label: 'Follow Up' },
        { label: 'Status', className: 'text-center' },
        { label: 'Actions', className: 'text-center' }
    ];

    const renderRow = (lead, index) => (
        <tr key={lead._id} className="hover:bg-slate-50 transition-colors group">
            <td className="py-3 px-4">
                <p className="font-bold text-slate-800 text-sm">{lead.firstName} {lead.lastName}</p>
                <div className="flex flex-col items-start gap-1.5 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-medium">{lead.gender}</p>
                    {lead.trialDate && (
                        <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-200 uppercase tracking-wider">
                            Trial: {new Date(lead.trialDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} 
                            {lead.trialEndDate && lead.trialEndDate !== lead.trialDate ? ` - ${new Date(lead.trialEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                        </div>
                    )}
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <FiPhone className="text-emerald-500 shrink-0" /> {lead.contactNumber}
                    </div>
                    {lead.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <FiMail className="text-emerald-500 shrink-0" /> {lead.email}
                        </div>
                    )}
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex flex-col gap-1 text-[10px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1"><span className="text-slate-400">Source:</span> <span className="font-bold text-slate-700">{lead.source}</span></div>
                    <div className="flex items-center gap-1"><span className="text-slate-400">For:</span> <span className="font-bold text-slate-700">{lead.inquiryFor}</span></div>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Priority:</span> 
                        <span className={`font-bold uppercase tracking-wider ${lead.convertibility === 'Hot' ? 'text-rose-500' : lead.convertibility === 'Warm' ? 'text-amber-500' : 'text-sky-500'}`}>
                            {lead.convertibility}
                        </span>
                    </div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                    {lead.followUpHistory && lead.followUpHistory.length > 0 ? (
                        <div className="flex items-center gap-1.5 font-bold text-indigo-600 bg-indigo-50 w-max px-2 py-0.5 rounded border border-indigo-100">
                            <FiMessageSquare className="shrink-0" />
                            Last: {new Date(lead.followUpHistory[lead.followUpHistory.length - 1].contactDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            <span className="text-[9px] bg-indigo-200 text-indigo-800 px-1 rounded-full ml-1">{lead.followUpHistory.length}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 font-bold text-slate-400 bg-slate-50 w-max px-2 py-0.5 rounded border border-slate-200">
                            <FiMessageSquare className="shrink-0" /> New Lead
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 mt-1">
                        <FiCalendar className="text-emerald-500 shrink-0" />
                        Next: {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'None'} {lead.followUpTime}
                    </div>
                    <div className="text-[10px] font-medium mt-0.5"><span className="text-slate-400">Assigned:</span> {lead.attendedBy}</div>
                </div>
            </td>
            <td className="py-3 px-4 text-center">
                <select
                    value={lead.status}
                    onChange={(e) => handleStatusDropdownChange(lead, e.target.value)}
                    className={`text-xs font-bold rounded-lg px-2 py-1.5 border-0 shadow-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors outline-none
                        ${lead.status === 'Pending' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 
                          lead.status === 'Lead' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' :
                          lead.status === 'Contacted' ? 'bg-sky-50 text-sky-700 hover:bg-sky-100' :
                          lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                          lead.status === 'Negotiation' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' :
                          'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                >
                    <option value="Lead">Lead</option>
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                </select>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                    {lead.status === 'Converted' && !lead.isMemberCreated && (
                        <button 
                            onClick={() => navigate('/dashboard/owner/members/add', { state: { convertedLead: lead } })}
                            className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                            title="Convert to Member"
                        >
                            <FiUsers className="text-sm" />
                        </button>
                    )}
                    <a 
                        href={`https://wa.me/${(lead.contactNumber || lead.phone || '').toString().replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        title="WhatsApp"
                    >
                        <FiMessageSquare className="text-sm" />
                    </a>
                    <button 
                        onClick={() => handleEdit(lead)}
                        className="w-8 h-8 rounded bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        title="Edit Lead"
                    >
                        <FiEdit2 className="text-sm" />
                    </button>
                    <button 
                        onClick={() => handleDelete(lead._id)}
                        className="w-8 h-8 rounded bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        title="Delete Lead"
                    >
                        <FiTrash2 className="text-sm" />
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <PageLayout>
            <PageHeader 
                title="Enquiries & Leads"
                subtitle="Manage and track your prospective members"
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={handleAddNew}
                addLabel="Add Enquiry"
            />

            <Tabs 
                tabs={['Enquiries', 'Leads', 'Follow Ups', 'Trials', 'Negotiation', 'Converted', 'Lost']}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <DataTable 
                columns={columns}
                data={filteredLeads}
                loading={loading}
                emptyMessage="No inquiries found in this category."
                renderRow={renderRow}
            />
        </PageLayout>
    );
}

export default Leads;
