import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiPhone, FiMail, FiCalendar, FiMessageSquare, FiEdit2, FiTrash2, FiUsers, FiList } from 'react-icons/fi';
import { toast } from 'react-toastify';

// Import components
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import DataTable from '../../components/page/DataTable';
import FollowUpCalendar from './FollowUpCalendar';

function Leads() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Enquiries');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [sourceFilter, setSourceFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

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

    useEffect(() => {
        if (searchTerm && leads.length > 0) {
            const lowerSearch = searchTerm.toLowerCase();
            const firstMatch = leads.find(lead => {
                const searchStr = `${lead.firstName || lead.name || ''} ${lead.lastName || ''} ${lead.contactNumber || lead.phone || ''}`.toLowerCase();
                return searchStr.includes(lowerSearch);
            });

            if (firstMatch) {
                let targetTab = 'Leads';
                if (firstMatch.status === 'Pending') targetTab = 'Enquiries';
                else if (firstMatch.status === 'Converted') targetTab = 'Converted';
                else if (firstMatch.status === 'Lost') targetTab = 'Lost';
                else if (firstMatch.status === 'Negotiation') targetTab = 'Negotiation';
                else if (firstMatch.status === 'Trial') targetTab = 'Trials';
                else if (firstMatch.status === 'Contacted') targetTab = 'Follow Ups';
                else if (firstMatch.status === 'Lead') targetTab = 'Leads';

                if (activeTab !== targetTab) {
                    setActiveTab(targetTab);
                }
            }
        }
    }, [searchTerm, leads, activeTab]);

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

        if (['Contacted', 'Trial', 'Negotiation', 'Lost', 'Converted'].includes(newStatus)) {
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
        else if (activeTab === 'Leads') tabMatch = ['Lead', 'Contacted', 'Trial', 'Negotiation'].includes(lead.status);
        else if (activeTab === 'Follow Ups') tabMatch = (!!lead.followUpDate || lead.status === 'Contacted') && lead.status !== 'Converted' && lead.status !== 'Lost';
        else if (activeTab === 'Trials') tabMatch = !!lead.trialDate || !!lead.trialEndDate || lead.status === 'Trial';
        else if (activeTab === 'Negotiation') tabMatch = lead.status === 'Negotiation';
        else if (activeTab === 'Converted') tabMatch = lead.status === 'Converted';
        else if (activeTab === 'Lost') tabMatch = lead.status === 'Lost';
        
        const searchStr = `${lead.firstName || lead.name || ''} ${lead.lastName || ''} ${lead.contactNumber || lead.phone || ''}`.toLowerCase();
        const searchMatch = searchStr.includes(searchTerm.toLowerCase());
        
        let dateMatch = true;
        if (showCalendar && selectedDate) {
            if (lead.followUpDate) {
                const leadDateStr = typeof lead.followUpDate === 'string' 
                    ? lead.followUpDate.split('T')[0] 
                    : new Date(lead.followUpDate).toISOString().split('T')[0];
                    
                const selDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                dateMatch = leadDateStr === selDateStr;
            } else {
                dateMatch = false; // Filter out if no followUpDate and date is selected
            }
        }

        let sourceMatch = sourceFilter ? lead.source === sourceFilter : true;
        let priorityMatch = priorityFilter ? lead.convertibility === priorityFilter : true;

        let dateRangeMatch = true;
        if (filterStartDate || filterEndDate) {
            let targetDateValue;
            
            if (activeTab === 'Follow Ups') {
                targetDateValue = lead.followUpDate;
            } else if (activeTab === 'Trials') {
                targetDateValue = lead.trialDate || lead.trialEndDate;
            } else if (activeTab === 'Converted' || activeTab === 'Lost') {
                targetDateValue = lead.updatedAt;
            } else {
                targetDateValue = lead.createdAt || new Date();
            }

            if (!targetDateValue) {
                dateRangeMatch = false;
            } else {
                const itemDate = new Date(targetDateValue);
                itemDate.setHours(0,0,0,0);
                
                if (filterStartDate) {
                    const start = new Date(filterStartDate);
                    start.setHours(0,0,0,0);
                    if (itemDate < start) dateRangeMatch = false;
                }
                if (filterEndDate) {
                    const end = new Date(filterEndDate);
                    end.setHours(23,59,59,999);
                    if (itemDate > end) dateRangeMatch = false;
                }
            }
        }

        return tabMatch && searchMatch && dateMatch && sourceMatch && priorityMatch && dateRangeMatch;
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
                    <p className="text-[10px] text-slate-400 font-medium">
                        {lead.gender} {lead.createdAt && `• Enquired: ${new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
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
                          lead.status === 'Trial' ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' :
                          lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                          lead.status === 'Negotiation' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' :
                          'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                >
                    <option value="Lead">Lead</option>
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Trial">Trial</option>
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
                onAdd={handleAddNew}
                addLabel="Add Enquiry"
            />

            <Tabs 
                tabs={['Enquiries', 'Leads', 'Follow Ups', 'Trials', 'Negotiation', 'Converted', 'Lost']}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                }}
            />
            
            <FilterBar 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                searchPlaceholder="Search by name or phone..."
            >
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm h-9 px-2 transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 w-full sm:w-auto">
                    <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="text-xs font-medium focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="Inquiry Date From"
                    />
                    <span className="text-slate-300 mx-2 font-medium text-[10px]">TO</span>
                    <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="text-xs font-medium focus:outline-none text-slate-600 bg-transparent w-full sm:w-auto"
                        title="Inquiry Date To"
                    />
                </div>

                <select 
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600 shadow-sm w-full sm:w-auto"
                >
                    <option value="">All Sources</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Website">Website</option>
                    <option value="Reference">Reference</option>
                    <option value="Just Dial">Just Dial</option>
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Other">Other</option>
                </select>
                
                <select 
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600 shadow-sm w-full sm:w-auto"
                >
                    <option value="">All Priorities</option>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                </select>

                <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg font-bold text-xs transition-colors border shadow-sm shrink-0
                        ${showCalendar ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}
                    `}
                >
                    {showCalendar ? <FiList /> : <FiCalendar />}
                    <span className="hidden sm:inline">{showCalendar ? 'Hide Calendar' : 'Show Calendar'}</span>
                </button>
            </FilterBar>

            <div className="px-4 py-4 flex-1 overflow-y-auto w-full flex flex-col xl:flex-row gap-4">
                {showCalendar && (
                    <div className="xl:w-[350px] shrink-0">
                        <FollowUpCalendar 
                            leads={leads}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <DataTable 
                        columns={columns}
                        data={filteredLeads}
                        loading={loading}
                        emptyMessage="No inquiries found in this category."
                        renderRow={renderRow}
                    />
                </div>
            </div>
        </PageLayout>
    );
}

export default Leads;
