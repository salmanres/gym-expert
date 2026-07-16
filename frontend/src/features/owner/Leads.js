import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiPhone, FiMail, FiCalendar, FiUser, FiMapPin, FiMessageSquare, FiSearch, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa'; // if react-icons/fa is installed, else I'll use FiMessageCircle
import { toast } from 'react-toastify';

function Leads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('Leads');
    const [searchTerm, setSearchTerm] = useState('');
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        contactNumber: '',
        altContact: '',
        email: '',
        gender: 'Male',
        address: '',
        followUpDate: '',
        followUpTime: '',
        trialDate: '',
        status: 'Pending',
        attendedBy: 'Admin',
        convertibility: 'Warm',
        source: '',
        inquiryFor: '',
        response: '',
        sendTextAndEmail: false,
        sendWhatsApp: false
    });

    const fetchLeads = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/enquiries', {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ 
            ...formData, 
            [name]: type === 'checkbox' ? checked : value 
        });
    };

    const handleAddNew = () => {
        setEditId(null);
        setFormData({
            firstName: '', lastName: '', contactNumber: '', altContact: '', email: '',
            gender: 'Male', address: '', followUpDate: '', followUpTime: '', trialDate: '',
            status: 'Pending', attendedBy: 'Admin', convertibility: 'Warm', source: '',
            inquiryFor: '', response: '', sendTextAndEmail: false, sendWhatsApp: false
        });
        setShowModal(true);
    };

    const handleEdit = (lead) => {
        const formattedDate = lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '';
        const formattedTrial = lead.trialDate ? new Date(lead.trialDate).toISOString().split('T')[0] : '';
        setFormData({
            ...lead,
            firstName: lead.firstName || lead.name || '',
            contactNumber: lead.contactNumber || lead.phone || '',
            followUpDate: formattedDate,
            trialDate: formattedTrial,
            response: lead.response || ''
        });
        setEditId(lead._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this prospect?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/enquiries/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Prospect deleted successfully");
            fetchLeads();
        } catch (error) {
            toast.error("Failed to delete prospect");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editId) {
                await axios.put(`http://localhost:5000/api/enquiries/${editId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Lead updated successfully");
            } else {
                await axios.post('http://localhost:5000/api/enquiries', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Lead added successfully");
            }
            setShowModal(false);
            fetchLeads();
        } catch (error) {
            toast.error(editId ? "Failed to update lead" : "Failed to add lead");
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/enquiries/${id}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Status updated");
            fetchLeads();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const filteredLeads = leads.filter(lead => {
        // Tab filtering
        let tabMatch = true;
        if (activeTab === 'Enquiries') tabMatch = lead.status === 'Pending';
        else if (activeTab === 'Follow Ups') tabMatch = lead.status === 'Contacted';
        else if (activeTab === 'Walk-ins') tabMatch = lead.source === 'Walk-in';
        else if (activeTab === 'Trial Members') tabMatch = !!lead.trialDate;
        else if (activeTab === 'Converted') tabMatch = lead.status === 'Converted';
        
        // Search filtering
        const searchStr = `${lead.firstName || lead.name || ''} ${lead.lastName || ''} ${lead.contactNumber || lead.phone || ''}`.toLowerCase();
        const searchMatch = searchStr.includes(searchTerm.toLowerCase());
        
        return tabMatch && searchMatch;
    });

    return (
        <div className="p-0 m-0 w-full h-full flex flex-col animate-in fade-in duration-300 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-slate-200 shrink-0 gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enquiries & Leads</h1>
                    <p className="text-slate-500 text-xs mt-0.5">Manage and track your prospective members</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search name or phone..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleAddNew}
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-xs shrink-0"
                    >
                        <FiPlus className="text-lg" /> Add New Lead
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 px-4 border-b border-slate-200 bg-slate-50/50 shrink-0 overflow-x-auto custom-scrollbar">
                {['Leads', 'Enquiries', 'Follow Ups', 'Walk-ins', 'Trial Members', 'Converted'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-3 text-xs font-bold whitespace-nowrap transition-colors relative ${
                            activeTab === tab ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-full flex-1">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <div className="bg-white flex-1 overflow-hidden">
                    <div className="overflow-x-auto h-full">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 z-10">
                                <tr className="border-b border-slate-200">
                                    <th className="py-2.5 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Prospect</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Contact</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Details</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Follow Up</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-center">Status</th>
                                    <th className="py-2.5 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center">
                                            <p className="text-slate-500 font-medium text-sm">No inquiries found in this category.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map(lead => (
                                        <tr key={lead._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-slate-800 text-sm">{lead.firstName} {lead.lastName}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{lead.gender}</p>
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
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                        <FiCalendar className="text-emerald-500 shrink-0" />
                                                        {new Date(lead.followUpDate).toLocaleDateString()} {lead.followUpTime}
                                                    </div>
                                                    <div className="text-[10px] font-medium"><span className="text-slate-400">Assigned:</span> {lead.attendedBy}</div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => updateStatus(lead._id, e.target.value)}
                                                    className={`text-xs font-bold rounded-lg px-2 py-1.5 border-0 shadow-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors outline-none
                                                        ${lead.status === 'Pending' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 
                                                          lead.status === 'Contacted' ? 'bg-sky-50 text-sky-700 hover:bg-sky-100' :
                                                          lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                                                          'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Contacted">Contacted</option>
                                                    <option value="Converted">Converted</option>
                                                    <option value="Lost">Lost</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Premium Emerald Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                                    {editId ? 'Edit Prospect' : 'Add New Prospect'}
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                                    {editId ? 'Update Enquiry Details' : 'Record Enquiry Details'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-full transition-colors border border-slate-200 shadow-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <form id="leadForm" onSubmit={handleSubmit} className="p-6">
                                
                                {/* Section 1: Contact Info */}
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FiUser /> Personal Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">First Name <span className="text-rose-500">*</span></label>
                                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" placeholder="First Name" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Last Name</label>
                                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" placeholder="Last Name" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Gender <span className="text-rose-500">*</span></label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone Number <span className="text-rose-500">*</span></label>
                                        <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" placeholder="Primary Phone" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Alt. Phone</label>
                                        <input type="tel" name="altContact" value={formData.altContact} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" placeholder="Secondary Phone" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Address</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" placeholder="email@example.com" />
                                    </div>
                                </div>

                                {/* Section 2: Inquiry Info */}
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FiMapPin /> Inquiry Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Residential Address</label>
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" placeholder="Street, Area, City" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Source <span className="text-rose-500">*</span></label>
                                        <select name="source" value={formData.source} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium">
                                            <option value="">--Select--</option>
                                            <option value="Walk-in">Walk-in</option>
                                            <option value="Website">Website</option>
                                            <option value="Reference">Reference</option>
                                            <option value="Just Dial">Just Dial</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Interest/For <span className="text-rose-500">*</span></label>
                                        <select name="inquiryFor" value={formData.inquiryFor} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium">
                                            <option value="">--Select--</option>
                                            <option value="Gym">Gym</option>
                                            <option value="Zumba">Zumba</option>
                                            <option value="Yoga">Yoga</option>
                                            <option value="Crossfit">Crossfit</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Follow-up Date <span className="text-rose-500">*</span></label>
                                        <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Follow-up Time</label>
                                        <input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Trial Date</label>
                                        <input type="date" name="trialDate" value={formData.trialDate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Lead Priority <span className="text-rose-500">*</span></label>
                                        <select name="convertibility" value={formData.convertibility} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium">
                                            <option value="Warm">Warm</option>
                                            <option value="Hot">Hot</option>
                                            <option value="Cold">Cold</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Section 3: Status & Feedback */}
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FiMessageSquare /> Feedback & Action
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-1 flex flex-col gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Status <span className="text-rose-500">*</span></label>
                                            <select name="status" value={formData.status} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium">
                                                <option value="Pending">Pending</option>
                                                <option value="Contacted">Contacted</option>
                                                <option value="Converted">Converted</option>
                                                <option value="Lost">Lost</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Attended By <span className="text-rose-500">*</span></label>
                                            <select name="attendedBy" value={formData.attendedBy} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium">
                                                <option value="Admin">Admin</option>
                                                <option value="Staff">Staff</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Response / Feedback <span className="text-rose-500">*</span></label>
                                        <textarea name="response" value={formData.response} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm text-slate-800 transition-all font-medium resize-none h-[104px]" placeholder="Enter discussion notes or client requirements..."></textarea>
                                    </div>
                                </div>
                                
                            </form>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 shrink-0 gap-4">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer group">
                                    <input type="checkbox" name="sendTextAndEmail" checked={formData.sendTextAndEmail} onChange={handleChange} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                                    <span className="group-hover:text-slate-900 transition-colors">Send Text/Email</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs text-slate-600 font-bold cursor-pointer group">
                                    <input type="checkbox" name="sendWhatsApp" checked={formData.sendWhatsApp} onChange={handleChange} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                                    <span className="group-hover:text-slate-900 transition-colors">Send WhatsApp</span>
                                </label>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all text-xs">
                                    Cancel
                                </button>
                                <button type="submit" form="leadForm" className="flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all text-xs">
                                    {editId ? 'Update Prospect' : 'Save Prospect'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Leads;
