import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { 
    FiPhone, FiMail, FiCalendar, FiMessageSquare, FiEdit2, FiTrash2, 
    FiUsers, FiList, FiX, FiEye, FiTag, FiClock, FiMapPin, FiCheckCircle
} from 'react-icons/fi';
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
    const [activeTab, setActiveTab] = useState('All Leads');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [sourceFilter, setSourceFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [gymSettings, setGymSettings] = useState(null);

    // View Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewLead, setViewLead] = useState(null);

    // Status Modal State
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [statusFormData, setStatusFormData] = useState({
        status: '',
        response: '',
        followUpDate: '',
        followUpTime: '',
        trialDate: '',
        trialEndDate: '',
        lostReason: '',
        selectedOffer: '',
        offerAmount: '',
        offerDetails: ''
    });
    const [submittingStatus, setSubmittingStatus] = useState(false);

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
        const fetchGym = async () => {
            try {
                const gymRes = await apiClient.get('/gyms/my-gym');
                if (gymRes?.data) setGymSettings(gymRes.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchGym();
    }, []);

    useEffect(() => {
        if (searchTerm && leads.length > 0) {
            const lowerSearch = searchTerm.toLowerCase();
            const firstMatch = leads.find(lead => {
                const searchStr = `${lead.firstName || lead.name || ''} ${lead.lastName || ''} ${lead.contactNumber || lead.phone || ''} ${lead.status || ''}`.toLowerCase();
                return searchStr.includes(lowerSearch);
            });

            if (firstMatch && activeTab !== 'All Leads') {
                let targetTab = 'Active Leads';
                if (firstMatch.status === 'Pending') targetTab = 'New Enquiries';
                else if (firstMatch.status === 'Converted') targetTab = 'Converted';
                else if (firstMatch.status === 'Lost') targetTab = 'Lost';
                else if (firstMatch.status === 'Negotiation') targetTab = 'Negotiation';
                else if (firstMatch.status === 'Trial') targetTab = 'Trials';
                else if (firstMatch.status === 'Contacted') targetTab = 'Follow Ups';
                else if (firstMatch.status === 'Lead') targetTab = 'Active Leads';

                if (activeTab !== targetTab) {
                    setActiveTab(targetTab);
                }
            }
        }
    }, [searchTerm, leads, activeTab]);

    const handleAddNew = () => {
        navigate('/dashboard/owner/leads/add');
    };

    const handleViewLead = (lead) => {
        setViewLead(lead);
        setViewModalOpen(true);
    };

    const toInputDateFormat = (dateVal) => {
        if (!dateVal) return '';
        if (typeof dateVal === 'string' && dateVal.includes('T')) {
            return dateVal.split('T')[0];
        }
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleEdit = (lead) => {
        const formattedDate = lead.followUpDate ? toInputDateFormat(lead.followUpDate) : '';
        const formattedTrial = lead.trialDate ? toInputDateFormat(lead.trialDate) : '';
        const formattedTrialEnd = lead.trialEndDate ? toInputDateFormat(lead.trialEndDate) : '';
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

    const handleStatusDropdownChange = (lead, newStatus) => {
        if (newStatus === lead.status) return;

        if (['Contacted', 'Trial', 'Negotiation', 'Lost', 'Converted'].includes(newStatus)) {
            setSelectedLead(lead);
            let matchedOfferId = '';
            if (gymSettings) {
                const matchedOffer = gymSettings.couponOffers?.find(o => o.title === lead.offerDetails);
                matchedOfferId = matchedOffer ? matchedOffer._id : (lead.offerDetails ? 'Custom' : '');
            }
            setStatusFormData({
                status: newStatus,
                response: '',
                followUpDate: toInputDateFormat(lead.followUpDate),
                followUpTime: lead.followUpTime || '',
                trialDate: toInputDateFormat(lead.trialDate),
                trialEndDate: toInputDateFormat(lead.trialEndDate),
                trialFeeType: lead.trialFeeType || 'Unpaid',
                trialFee: lead.trialFee ?? '',
                trialPaymentStatus: lead.trialPaymentStatus || 'Unpaid',
                lostReason: lead.lostReason || '',
                selectedOffer: matchedOfferId,
                offerAmount: lead.offerAmount || '',
                offerDetails: lead.offerDetails || ''
            });
            setStatusModalOpen(true);
        } else {
            updateStatus(lead._id, newStatus);
        }
    };

    const handleOfferChange = (e) => {
        const value = e.target.value;
        if (value === 'Custom' || value === '') {
            setStatusFormData({
                ...statusFormData,
                selectedOffer: value,
                offerDetails: '',
                offerAmount: ''
            });
        } else {
            const selectedOffer = gymSettings?.couponOffers?.find(o => o._id === value);
            if (selectedOffer) {
                setStatusFormData({
                    ...statusFormData,
                    selectedOffer: value,
                    offerDetails: selectedOffer.title,
                    offerAmount: selectedOffer.discountType === 'Flat' ? selectedOffer.discountValue : ''
                });
            }
        }
    };

    const handleStatusModalSubmit = async (e) => {
        e.preventDefault();
        setSubmittingStatus(true);
        try {
            const todayStr = toInputDateFormat(new Date());
            const finalFollowUpDate = statusFormData.followUpDate || todayStr;
            let submitData = { 
                ...selectedLead, 
                ...statusFormData,
                followUpDate: finalFollowUpDate
            };
            
            const hasResponse = statusFormData.response && statusFormData.response.trim() !== '';
            const autoAddedItem = {
                contactDate: new Date().toISOString(),
                response: hasResponse ? statusFormData.response : `Status updated to ${statusFormData.status}`,
                nextFollowUpDate: finalFollowUpDate,
                nextFollowUpTime: statusFormData.followUpTime || '',
                status: statusFormData.status
            };
            
            submitData.followUpHistory = [...(submitData.followUpHistory || []), autoAddedItem];
            if (!hasResponse && submitData.followUpHistory.length > 0) {
                const latestHistory = submitData.followUpHistory[submitData.followUpHistory.length - 1];
                submitData.response = latestHistory.response;
            }
            
            await apiClient.put(`/enquiries/${selectedLead._id}`, submitData);
            toast.success("Status updated");
            setStatusModalOpen(false);
            fetchLeads();
            
            if (statusFormData.status === 'Converted') {
                navigate('/dashboard/owner/members/add', { state: { convertedLead: submitData } });
            }
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setSubmittingStatus(false);
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
            const todayStr = toInputDateFormat(new Date());
            await apiClient.put(`/enquiries/${id}`, { status: newStatus, followUpDate: todayStr });
            toast.success("Status updated");
            fetchLeads();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const filteredLeads = leads.filter(lead => {
        let tabMatch = true;
        if (activeTab === 'All Leads') tabMatch = true;
        else if (activeTab === 'New Enquiries') tabMatch = lead.status === 'Pending';
        else if (activeTab === 'Active Leads') tabMatch = ['Lead', 'Contacted', 'Trial', 'Negotiation'].includes(lead.status);
        else if (activeTab === 'Follow Ups') tabMatch = (!!lead.followUpDate || lead.status === 'Contacted') && !['Converted', 'Lost'].includes(lead.status);
        else if (activeTab === 'Trials') {
            if (['Converted', 'Lost'].includes(lead.status)) {
                tabMatch = false;
            } else {
                let isActiveTrial = false;
                if (lead.trialDate || lead.trialEndDate) {
                    const today = new Date();
                    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                    
                    const endDate = lead.trialEndDate ? new Date(lead.trialEndDate) : new Date(lead.trialDate);
                    const endStr = endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0');
                    
                    isActiveTrial = endStr >= todayStr;
                } else if (lead.status === 'Trial') {
                    isActiveTrial = true;
                }
                tabMatch = isActiveTrial;
            }
        }
        else if (activeTab === 'Negotiation') tabMatch = lead.status === 'Negotiation';
        else if (activeTab === 'Converted') tabMatch = lead.status === 'Converted';
        else if (activeTab === 'Lost') tabMatch = lead.status === 'Lost';
        
        const searchStr = `${lead.firstName || lead.name || ''} ${lead.lastName || ''} ${lead.contactNumber || lead.phone || ''} ${lead.status || ''}`.toLowerCase();
        const searchMatch = searchStr.includes(searchTerm.toLowerCase());
        
        let dateMatch = true;
        if (showCalendar && selectedDate) {
            if (lead.followUpDate) {
                const leadDateStr = toInputDateFormat(lead.followUpDate);
                const selDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                dateMatch = leadDateStr === selDateStr;
            } else {
                dateMatch = false;
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
                <button 
                    onClick={() => handleViewLead(lead)}
                    className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition-colors text-left"
                >
                    {lead.firstName} {lead.lastName}
                </button>
                <div className="flex flex-col items-start gap-1.5 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-medium">
                        {lead.gender} {lead.createdAt && `• Enquired: ${new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
                    {lead.trialDate && (() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const endDate = lead.trialEndDate ? new Date(lead.trialEndDate) : new Date(lead.trialDate);
                        const endStr = endDate.toISOString().split('T')[0];
                        const isExpired = endStr < todayStr;
                        const isPaid = lead.trialFeeType === 'Paid';

                        return (
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                    isExpired 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}>
                                    {isExpired ? 'Trial Ended: ' : 'Trial: '}
                                    {new Date(lead.trialDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} 
                                    {lead.trialEndDate && lead.trialEndDate !== lead.trialDate ? ` - ${new Date(lead.trialEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                                </div>
                                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                                    isPaid 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    {isPaid ? `Paid (₹${lead.trialFee || 0} • ${lead.trialPaymentStatus || 'Paid'})` : 'Free Trial'}
                                </div>
                            </div>
                        );
                    })()}
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
                    <div className="flex items-center gap-1"><span className="text-slate-400">Source:</span> <span className="font-bold text-slate-700">{lead.source || 'Walk-in'}</span></div>
                    {lead.referredBy && (
                        <div className="flex items-center gap-1"><span className="text-slate-400">Ref By:</span> <span className="font-bold text-indigo-600">{lead.referredBy}</span></div>
                    )}
                    <div className="flex items-center gap-1"><span className="text-slate-400">Plan/For:</span> <span className="font-extrabold text-indigo-600">{lead.inquiryFor || 'General'}</span></div>
                    {lead.offerDetails && (
                        <div className="flex items-center gap-1"><span className="text-slate-400">Offer:</span> <span className="font-bold text-emerald-600">{lead.offerDetails} {lead.offerAmount ? `(₹${lead.offerAmount})` : ''}</span></div>
                    )}
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
                    {lead.trialDate && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 w-max mt-0.5">
                            <FiCalendar className="shrink-0 text-teal-600" />
                            Trial: {new Date(lead.trialDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            {lead.trialEndDate ? ` - ${new Date(lead.trialEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                        </div>
                    )}
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
                    <button 
                        onClick={() => handleViewLead(lead)}
                        className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        title="View Lead Details"
                    >
                        <FiEye className="text-sm" />
                    </button>
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
                tabs={['All Leads', 'New Enquiries', 'Active Leads', 'Follow Ups', 'Trials', 'Negotiation', 'Converted', 'Lost']}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setFilterStartDate('');
                    setFilterEndDate('');
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
                            onSelectDate={(date) => {
                                setSelectedDate(date);
                                if (date && activeTab !== 'Follow Ups') {
                                    setActiveTab('Follow Ups');
                                }
                            }}
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

            {/* VIEW LEAD MODAL */}
            {viewModalOpen && viewLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-inner">
                                    {(viewLead.firstName || 'L').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-lg text-white">
                                            {viewLead.firstName} {viewLead.lastName}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                            viewLead.convertibility === 'Hot' ? 'bg-rose-500 text-white' :
                                            viewLead.convertibility === 'Warm' ? 'bg-amber-500 text-white' :
                                            'bg-sky-500 text-white'
                                        }`}>
                                            {viewLead.convertibility || 'Warm'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 font-medium">
                                        <span>Source: {viewLead.source || 'Walk-in'}</span>
                                        <span>•</span>
                                        <span>Created: {viewLead.createdAt ? new Date(viewLead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setViewModalOpen(false); setViewLead(null); }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
                            
                            {/* Header Action Bar */}
                            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">Current Status:</span>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                                        viewLead.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                        viewLead.status === 'Lead' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        viewLead.status === 'Contacted' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                        viewLead.status === 'Trial' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                        viewLead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        viewLead.status === 'Negotiation' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        {viewLead.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {viewLead.status !== 'Converted' && (
                                        <button
                                            onClick={() => {
                                                setViewModalOpen(false);
                                                navigate('/dashboard/owner/members/add', { state: { convertedLead: viewLead } });
                                            }}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                                        >
                                            <FiUsers size={14} /> Convert to Member
                                        </button>
                                    )}
                                    <a 
                                        href={`https://wa.me/${(viewLead.contactNumber || viewLead.phone || '').toString().replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all"
                                    >
                                        <FiMessageSquare size={14} /> WhatsApp
                                    </a>
                                    <button
                                        onClick={() => {
                                            setViewModalOpen(false);
                                            handleEdit(viewLead);
                                        }}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all"
                                    >
                                        <FiEdit2 size={14} /> Edit
                                    </button>
                                </div>
                            </div>

                            {/* Key Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Contact Info Card */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <FiPhone className="text-indigo-500" /> Contact Details
                                    </h4>
                                    <div className="text-xs space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Primary Phone:</span>
                                            <span className="font-black text-slate-800">{viewLead.contactNumber || viewLead.phone}</span>
                                        </div>
                                        {viewLead.altContact && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Alt Contact:</span>
                                                <span className="font-bold text-slate-700">{viewLead.altContact}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Email:</span>
                                            <span className="font-bold text-slate-800 truncate max-w-[170px]">{viewLead.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Gender:</span>
                                            <span className="font-bold text-slate-800">{viewLead.gender || 'N/A'}</span>
                                        </div>
                                        {viewLead.address && (
                                            <div className="pt-1 border-t border-slate-100">
                                                <span className="text-slate-400 font-medium block">Address:</span>
                                                <span className="font-medium text-slate-700 text-[11px] leading-relaxed block mt-0.5">{viewLead.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Prospect Preferences & Attended Info */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <FiTag className="text-purple-500" /> Requirement & Staff Info
                                    </h4>
                                    <div className="text-xs space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Inquiry For / Plan:</span>
                                            <span className="font-black text-indigo-600">{viewLead.inquiryFor || 'General Membership'}</span>
                                        </div>
                                        {viewLead.offerDetails && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Quoted Offer:</span>
                                                <span className="font-black text-emerald-600">{viewLead.offerDetails} {viewLead.offerAmount ? `(₹${viewLead.offerAmount})` : ''}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Source Channel:</span>
                                            <span className="font-bold text-slate-800">{viewLead.source || 'Walk-in'}</span>
                                        </div>
                                        {viewLead.referredBy && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Referred By:</span>
                                                <span className="font-bold text-indigo-600">{viewLead.referredBy}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Attended By:</span>
                                            <span className="font-bold text-slate-800">{viewLead.attendedBy || 'N/A'}</span>
                                        </div>
                                        {viewLead.followUpDate && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Scheduled Call:</span>
                                                <span className="font-black text-emerald-600">
                                                    {new Date(viewLead.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {viewLead.followUpTime || ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Active Offer or Trial Information */}
                            {(viewLead.offerDetails || viewLead.trialDate || viewLead.lostReason) && (
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <FiCalendar className="text-amber-500" /> Active Deals & Trial Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {viewLead.offerDetails && (
                                            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100">
                                                <span className="text-[10px] font-bold text-purple-600 uppercase">Special Offer</span>
                                                <p className="text-xs font-black text-slate-800 mt-0.5">{viewLead.offerDetails}</p>
                                                {viewLead.offerAmount && (
                                                    <p className="text-xs font-extrabold text-purple-700 mt-0.5">Price: ₹{viewLead.offerAmount}</p>
                                                )}
                                            </div>
                                        )}
                                        {viewLead.trialDate && (() => {
                                            const todayStr = toInputDateFormat(new Date());
                                            const endStr = toInputDateFormat(viewLead.trialEndDate || viewLead.trialDate);
                                            const isExpired = endStr < todayStr;
                                            const isPaid = viewLead.trialFeeType === 'Paid';

                                            return (
                                                <div className={`p-3 rounded-lg border ${
                                                    isExpired ? 'bg-rose-50/60 border-rose-200' : 'bg-teal-50/60 border-teal-100'
                                                }`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-[10px] font-bold uppercase ${isExpired ? 'text-rose-600' : 'text-teal-600'}`}>
                                                            {isExpired ? 'Trial Expired' : 'Trial Period'}
                                                        </span>
                                                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                                            isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                            {isPaid ? `Paid Trial (₹${viewLead.trialFee || 0} - ${viewLead.trialPaymentStatus || 'Paid'})` : 'Free / Unpaid Trial'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-black text-slate-800 mt-1">
                                                        {new Date(viewLead.trialDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        {viewLead.trialEndDate ? ` to ${new Date(viewLead.trialEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                        {viewLead.lostReason && (
                                            <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-100 sm:col-span-2">
                                                <span className="text-[10px] font-bold text-rose-600 uppercase">Lost Reason</span>
                                                <p className="text-xs font-bold text-rose-800 mt-0.5">{viewLead.lostReason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Discussion & Follow-up History */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <FiMessageSquare className="text-indigo-500" /> Discussion & Follow-Up History
                                    </h4>
                                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        {viewLead.followUpHistory?.length || 0} Interactions
                                    </span>
                                </div>

                                {viewLead.followUpHistory && viewLead.followUpHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {viewLead.followUpHistory.map((item, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800">
                                                        {item.contactDate ? new Date(item.contactDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                    </span>
                                                    {item.status && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                                                            Status: {item.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-slate-600 font-medium leading-relaxed bg-white p-2 rounded border border-slate-100">
                                                    {item.response || 'No notes entered.'}
                                                </p>
                                                {item.nextFollowUpDate && (
                                                    <p className="text-[11px] font-bold text-emerald-600 pt-0.5">
                                                        Next Call Scheduled: {new Date(item.nextFollowUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {item.nextFollowUpTime || ''}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium">No follow-up history logged yet.</p>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => { setViewModalOpen(false); setViewLead(null); }}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {statusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                        {/* Dark Premium Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-inner shrink-0">
                                    {(selectedLead?.firstName || 'L').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-lg text-white">
                                            Update Status: {statusFormData.status}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                                        {selectedLead?.firstName} {selectedLead?.lastName} • {selectedLead?.contactNumber || selectedLead?.phone}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setStatusModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="statusForm" onSubmit={handleStatusModalSubmit} className="flex flex-col gap-4">
                                
                                {['Contacted', 'Trial', 'Negotiation'].includes(statusFormData.status) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-700">Follow-up Date</label>
                                            <input 
                                                type="date" 
                                                value={statusFormData.followUpDate}
                                                onChange={(e) => setStatusFormData({...statusFormData, followUpDate: e.target.value})}
                                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-700">Follow-up Time</label>
                                            <input 
                                                type="time" 
                                                value={statusFormData.followUpTime}
                                                onChange={(e) => setStatusFormData({...statusFormData, followUpTime: e.target.value})}
                                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {['Trial', 'Converted'].includes(statusFormData.status) && (
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-700">Trial Start Date</label>
                                                <input 
                                                    type="date" 
                                                    value={statusFormData.trialDate}
                                                    onChange={(e) => setStatusFormData({...statusFormData, trialDate: e.target.value})}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-700">Trial End Date</label>
                                                <input 
                                                    type="date" 
                                                    min={statusFormData.trialDate}
                                                    value={statusFormData.trialEndDate}
                                                    onChange={(e) => setStatusFormData({...statusFormData, trialEndDate: e.target.value})}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-700">Trial Type</label>
                                                <select 
                                                    value={statusFormData.trialFeeType || 'Unpaid'}
                                                    onChange={(e) => setStatusFormData({...statusFormData, trialFeeType: e.target.value})}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                >
                                                    <option value="Unpaid">Unpaid / Free Trial</option>
                                                    <option value="Paid">Paid Trial</option>
                                                </select>
                                            </div>
                                            {statusFormData.trialFeeType === 'Paid' && (
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-xs font-bold text-slate-700">Trial Fee (₹)</label>
                                                    <input 
                                                        type="number"
                                                        placeholder="e.g. 500"
                                                        value={statusFormData.trialFee}
                                                        onChange={(e) => setStatusFormData({...statusFormData, trialFee: e.target.value})}
                                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {statusFormData.trialFeeType === 'Paid' && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-700">Trial Payment Status</label>
                                                <select 
                                                    value={statusFormData.trialPaymentStatus || 'Paid'}
                                                    onChange={(e) => setStatusFormData({...statusFormData, trialPaymentStatus: e.target.value})}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                >
                                                    <option value="Paid">Paid</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Unpaid">Unpaid</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {['Negotiation', 'Converted'].includes(statusFormData.status) && (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-700">Select Preset Offer</label>
                                            <select 
                                                value={statusFormData.selectedOffer}
                                                onChange={handleOfferChange}
                                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="">-- Choose an Offer --</option>
                                                {gymSettings?.couponOffers?.filter(o => o.isActive).map(offer => (
                                                    <option key={offer._id} value={offer._id}>{offer.title} ({offer.discountType === 'Percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`})</option>
                                                ))}
                                                <option value="Custom">Custom Offer</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-700">Offer Amount (₹)</label>
                                                <input 
                                                    type="number"
                                                    placeholder="e.g. 5000"
                                                    value={statusFormData.offerAmount}
                                                    onChange={(e) => setStatusFormData({...statusFormData, offerAmount: e.target.value})}
                                                    disabled={statusFormData.selectedOffer !== 'Custom'}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-700">Offer Details</label>
                                                <input 
                                                    type="text"
                                                    placeholder="e.g. 3 Months + 1 Free"
                                                    value={statusFormData.offerDetails}
                                                    onChange={(e) => setStatusFormData({...statusFormData, offerDetails: e.target.value})}
                                                    disabled={statusFormData.selectedOffer !== 'Custom'}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {statusFormData.status === 'Lost' && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-700">Lost Reason <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="e.g. Too expensive, Joined another gym..."
                                            value={statusFormData.lostReason}
                                            onChange={(e) => setStatusFormData({...statusFormData, lostReason: e.target.value})}
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-700">Response / Notes</label>
                                    <textarea 
                                        rows="3"
                                        placeholder="Enter discussion notes or client requirements..."
                                        value={statusFormData.response}
                                        onChange={(e) => setStatusFormData({...statusFormData, response: e.target.value})}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                                    ></textarea>
                                </div>

                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                            <button 
                                type="button"
                                onClick={() => setStatusModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                form="statusForm"
                                disabled={submittingStatus}
                                className="px-4 py-2 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {submittingStatus ? 'Saving...' : (statusFormData.status === 'Converted' ? 'Save & Convert' : 'Save Update')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}

export default Leads;
