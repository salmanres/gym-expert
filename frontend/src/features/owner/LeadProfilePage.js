import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    FiUser, FiPhone, FiMail, FiCalendar, FiClock, FiMessageSquare,
    FiEdit2, FiTrash2, FiUserCheck, FiArrowLeft, FiTag, FiCheckCircle,
    FiAlertCircle, FiSliders, FiCheck, FiCopy, FiSend,
    FiTrendingUp, FiZap
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';

import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import ConfirmModal from '../../components/modal/ConfirmModal';
import apiClient from '../../api/apiClient';
import { formatDate, toInputDateFormat } from '../../utils/dateUtils';
import DatePicker from '../../components/form/DatePicker';
import TimePicker from '../../components/form/TimePicker';

const PIPELINE_STAGES = [
    { id: 'Pending', label: 'Pending' },
    { id: 'Contacted', label: 'Contacted' },
    { id: 'Trial', label: 'Trial' },
    { id: 'Negotiation', label: 'Negotiation' },
    { id: 'Converted', label: 'Converted' },
];

export default function LeadProfilePage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [lead, setLead] = useState(location.state?.lead || null);
    const [loading, setLoading] = useState(!location.state?.lead && !!id);
    const [gymSettings, setGymSettings] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });

    // Live Stage & Follow-Up Form State
    const [statusFormData, setStatusFormData] = useState({
        status: '',
        response: '',
        followUpDate: '',
        followUpTime: '',
        trialDate: '',
        trialEndDate: '',
        trialFeeType: 'Unpaid',
        trialFee: '',
        trialPaymentStatus: 'Unpaid',
        trialPaymentMode: 'Cash',
        securityAmount: '',
        lostReason: '',
        selectedOffer: '',
        offerAmount: '',
        offerDetails: ''
    });
    const [submittingStatus, setSubmittingStatus] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const templatesRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (templatesRef.current && !templatesRef.current.contains(e.target)) {
                setShowTemplates(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helpers
    const formatShortDate = (dateVal) => formatDate(dateVal);
    const formatFullDate = (dateVal) => formatDate(dateVal);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Pending':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Contacted':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Trial':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Negotiation':
                return 'bg-rose-50 text-[#CA0410] border-rose-200';
            case 'Converted':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Lost':
                return 'bg-slate-100 text-slate-700 border-slate-300';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getInitial = (leadData) => {
        if (!leadData) return 'L';
        const name = leadData.firstName || leadData.name || '';
        return name ? name.charAt(0).toUpperCase() : 'L';
    };

    // Follow-up urgency badge (drives the "next best action" prompt in the hub)
    const getFollowUpUrgency = (dateVal) => {
        if (!dateVal) return null;
        const target = new Date(dateVal);
        target.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`, tone: 'bg-rose-50 text-[#CA0410] border-rose-200' };
        if (diffDays === 0) return { label: 'Follow up today', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
        if (diffDays === 1) return { label: 'Follow up tomorrow', tone: 'bg-blue-50 text-blue-700 border-blue-200' };
        return { label: `Follow up in ${diffDays} days`, tone: 'bg-slate-50 text-slate-600 border-slate-200' };
    };

    const copyToClipboard = async (value, label) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied to clipboard`);
        } catch (error) {
            toast.error(`Couldn't copy ${label.toLowerCase()}`);
        }
    };

    const initFormData = (leadData, settings) => {
        if (!leadData) return;
        const currentStatus = leadData.status || 'Contacted';
        const allCoupons = settings?.couponOffers || [];
        let matchedOfferId = '';
        let matchedOfferDetails = leadData.offerDetails || leadData.offer || '';
        let matchedOfferAmount = (leadData.offerAmount !== undefined && leadData.offerAmount !== null) ? leadData.offerAmount : '';

        if (allCoupons.length > 0) {
            const rawOfferId = (leadData.selectedOffer || '').toString().trim();
            const rawDetails = (leadData.offerDetails || leadData.offer || '').toString().trim();

            const matchedOffer = allCoupons.find(o =>
                (rawOfferId && (o._id?.toString() === rawOfferId || o.code?.toLowerCase() === rawOfferId.toLowerCase())) ||
                (rawDetails && o.title?.toLowerCase() === rawDetails.toLowerCase()) ||
                (rawDetails && o.code?.toLowerCase() === rawDetails.toLowerCase()) ||
                (rawDetails && (rawDetails.toLowerCase().includes(o.title?.toLowerCase()) || (o.code && rawDetails.toLowerCase().includes(o.code.toLowerCase())))) ||
                (rawDetails && o.title && o.title.toLowerCase().includes(rawDetails.toLowerCase())) ||
                (matchedOfferAmount !== '' && Number(matchedOfferAmount) === Number(o.discountValue) && o.isActive)
            );

            if (matchedOffer) {
                matchedOfferId = matchedOffer._id;
                if (!matchedOfferDetails) matchedOfferDetails = matchedOffer.title;
                if (matchedOfferAmount === '' && matchedOffer.discountValue !== undefined) {
                    matchedOfferAmount = matchedOffer.discountValue;
                }
            } else if (rawOfferId === 'Custom' || rawDetails || (matchedOfferAmount !== '' && Number(matchedOfferAmount) > 0)) {
                matchedOfferId = 'Custom';
            }
        } else if (leadData.selectedOffer === 'Custom' || leadData.offerDetails || (matchedOfferAmount !== '' && Number(matchedOfferAmount) > 0)) {
            matchedOfferId = 'Custom';
        }

        setStatusFormData({
            status: currentStatus,
            response: '',
            followUpDate: leadData.followUpDate ? toInputDateFormat(leadData.followUpDate) : '',
            followUpTime: leadData.followUpTime || '',
            trialDate: currentStatus === 'Trial' ? toInputDateFormat(leadData.trialDate || new Date()) : (leadData.trialDate ? toInputDateFormat(leadData.trialDate) : ''),
            trialEndDate: currentStatus === 'Trial' ? toInputDateFormat(leadData.trialEndDate || new Date()) : (leadData.trialEndDate ? toInputDateFormat(leadData.trialEndDate) : ''),
            trialFeeType: leadData.trialFeeType || 'Unpaid',
            trialFee: leadData.trialFee ?? '',
            trialPaymentStatus: leadData.trialPaymentStatus || 'Unpaid',
            trialPaymentMode: leadData.trialPaymentMode || 'Cash',
            securityAmount: leadData.securityAmount ?? '',
            lostReason: leadData.lostReason || '',
            selectedOffer: matchedOfferId,
            offerAmount: matchedOfferAmount,
            offerDetails: matchedOfferDetails
        });
    };

    const fetchLeadData = async () => {
        if (!id) return;
        try {
            const res = await apiClient.get(`/enquiries/${id}`);
            if (res.data) {
                setLead(res.data);
                initFormData(res.data, gymSettings);
            }
        } catch (error) {
            console.error("Failed to fetch lead profile", error);
            toast.error("Could not load lead profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchGym = async () => {
            try {
                const gymRes = await apiClient.get('/gyms/my-gym');
                if (gymRes?.data) {
                    setGymSettings(gymRes.data);
                    if (lead) {
                        initFormData(lead, gymRes.data);
                    }
                }
            } catch (error) {
                console.error("Gym settings fetch error", error);
            }
        };
        fetchGym();

        if (!location.state?.lead && id) {
            setLoading(true);
            fetchLeadData();
        } else if (location.state?.lead) {
            initFormData(location.state.lead, null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleOfferChange = (e) => {
        const value = e.target.value;
        if (value === 'Custom') {
            setStatusFormData({
                ...statusFormData,
                selectedOffer: 'Custom'
            });
        } else if (value === '') {
            setStatusFormData({
                ...statusFormData,
                selectedOffer: '',
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
                    offerAmount: selectedOffer.discountValue !== undefined ? selectedOffer.discountValue : ''
                });
            }
        }
    };

    const handleStatusSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!lead) return;

        if (lead.status === 'Converted' && statusFormData.status === 'Pending') {
            toast.error("A converted lead cannot be reverted to Pending. They are already enrolled as a gym member.");
            return;
        }

        setSubmittingStatus(true);
        try {
            const finalFollowUpDate = statusFormData.followUpDate || null;
            let submitData = {
                ...lead,
                ...statusFormData,
                followUpDate: finalFollowUpDate
            };

            if (!['Trial', 'Negotiation', 'Converted'].includes(statusFormData.status) && !lead?.trialDate) {
                submitData.trialDate = null;
                submitData.trialEndDate = null;
                submitData.trialFee = 0;
                submitData.securityAmount = 0;
            } else {
                if (statusFormData.status === 'Trial') {
                    submitData.trialDate = statusFormData.trialDate || lead?.trialDate || null;
                    submitData.trialEndDate = statusFormData.trialEndDate || lead?.trialEndDate || null;
                    submitData.trialFeeType = statusFormData.trialFeeType || lead?.trialFeeType || 'Unpaid';
                    submitData.securityAmount = statusFormData.trialFeeType === 'Paid' ? (statusFormData.securityAmount || lead?.securityAmount || 0) : 0;
                    submitData.trialPaymentMode = statusFormData.trialPaymentMode || lead?.trialPaymentMode || 'Cash';
                } else {
                    submitData.trialDate = lead?.trialDate || null;
                    submitData.trialEndDate = lead?.trialEndDate || null;
                    submitData.trialFeeType = lead?.trialFeeType || 'Unpaid';
                    submitData.securityAmount = lead?.trialFeeType === 'Paid' ? (lead?.securityAmount || 0) : 0;
                    submitData.trialPaymentMode = lead?.trialPaymentMode || 'Cash';
                }
            }

            const hasResponse = statusFormData.response && statusFormData.response.trim() !== '';
            const autoAddedItem = {
                contactDate: new Date().toISOString(),
                response: hasResponse ? statusFormData.response : `Stage updated to ${statusFormData.status}`,
                nextFollowUpDate: finalFollowUpDate || null,
                nextFollowUpTime: statusFormData.followUpTime || '',
                status: statusFormData.status
            };

            submitData.followUpHistory = [...(submitData.followUpHistory || []), autoAddedItem];
            if (!hasResponse && submitData.followUpHistory.length > 0) {
                const latestHistory = submitData.followUpHistory[submitData.followUpHistory.length - 1];
                submitData.response = latestHistory.response;
            }

            const res = await apiClient.put(`/enquiries/${lead._id}`, submitData);
            const updatedLead = res.data || submitData;
            toast.success("Lead updated successfully!");

            setLead(updatedLead);
            setStatusFormData(prev => ({
                ...prev,
                response: ''
            }));

            if (statusFormData.status === 'Converted') {
                navigate('/dashboard/owner/members/add', { state: { convertedLead: updatedLead } });
            }
        } catch (error) {
            toast.error("Failed to update lead");
        } finally {
            setSubmittingStatus(false);
        }
    };

    const handleEdit = () => {
        if (!lead) return;
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

    const handleDelete = () => {
        if (!lead) return;
        setConfirmModal({
            isOpen: true,
            title: 'Delete Prospect',
            message: `Are you sure you want to delete ${lead.firstName || 'this prospect'}? All follow-up timeline and history records will be permanently removed.`,
            isDestructive: true,
            confirmText: 'Delete Prospect',
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/enquiries/${lead._id}`);
                    toast.success("Prospect deleted successfully");
                    navigate('/dashboard/owner/leads');
                } catch (error) {
                    toast.error("Failed to delete prospect");
                }
            }
        });
    };

    if (loading) {
        return (
            <PageLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader text="Loading Prospect Profile..." />
                </div>
            </PageLayout>
        );
    }

    if (!lead) {
        return (
            <PageLayout>
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 max-w-xl mx-auto my-12 shadow-sm">
                    <FiAlertCircle className="mx-auto text-rose-500 mb-3" size={42} />
                    <h2 className="text-xl font-bold text-slate-800">Prospect Not Found</h2>
                    <p className="text-sm text-slate-500 mt-1 mb-6">The requested enquiry could not be loaded or was removed.</p>
                    <button
                        onClick={() => navigate('/dashboard/owner/leads')}
                        className="px-5 py-2.5 bg-[#CA0410] hover:bg-[#b3030e] text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
                    >
                        Back to All Leads
                    </button>
                </div>
            </PageLayout>
        );
    }

    const cleanPhone = (lead.contactNumber || lead.phone || '').toString().replace(/\D/g, '');
    const displayPhone = lead.contactNumber || lead.phone || '';
    const urgency = statusFormData.status !== 'Converted' && statusFormData.status !== 'Lost'
        ? getFollowUpUrgency(lead.followUpDate)
        : null;

    const messageTemplates = [
        {
            title: 'Trial Invitation',
            icon: FiCalendar,
            msg: `Hi ${lead.firstName || ''}, welcome to our gym! Your trial session is scheduled. Feel free to visit us and experience our fitness equipment!`
        },
        {
            title: 'Membership Offer',
            icon: FiTag,
            msg: `Hi ${lead.firstName || ''}, we have an exclusive membership discount available for you today! Let us know when you'd like to get started.`
        },
        {
            title: 'Friendly Follow-Up',
            icon: FiMessageSquare,
            msg: `Hi ${lead.firstName || ''}, hope you are doing well! Just following up regarding your gym membership enquiry. Let us know if you have any questions!`
        }
    ];

    const currentStageIndex = PIPELINE_STAGES.findIndex(s => s.id === statusFormData.status);
    const isLostSelected = statusFormData.status === 'Lost';
    const isConvertedAlready = lead?.status === 'Converted';

    return (
        <PageLayout>
            <PageHeader 
                title="Lead Management" 
                subtitle={`Track and manage prospect details`}
                showBack={true}
                onBack={() => navigate('/dashboard/owner/leads')}
            />

            <div className="flex-1 overflow-y-auto p-5 bg-[#FAEEEF]">
                <div className="max-w-7xl mx-auto space-y-5 font-['Roboto',sans-serif]">
                
                {/* FIGMA RED HERO HEADER BANNER */}
                <div 
                    className="rounded-2xl p-4 sm:p-5 shadow-sm text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#CA0410]/40 overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, #2D090E 0%, #6E0A12 22%, #A2040E 52%, #CA0410 80%, #DB0E1B 100%)' }}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/25 border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                            <span className="text-white font-black text-2xl sm:text-3xl leading-none select-none">
                                {getInitial(lead)}
                            </span>
                        </div>
                        
                        {/* Prospect Name & Status */}
                        <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                                    {lead.firstName || lead.name || 'Prospect'} {lead.lastName || ''}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide leading-tight shadow-2xs ${
                                    lead.status === 'Converted' ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]' : 
                                    lead.status === 'Trial' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                                    lead.status === 'Negotiation' ? 'bg-rose-100 text-[#CA0410] border border-rose-200' :
                                    'bg-white text-slate-800 border border-slate-200'
                                }`}>
                                    {lead.status === 'Trial' ? 'Trial Active' : (lead.status || 'Contacted')}
                                </span>
                            </div>
                            
                            <p className="text-xs text-rose-100/90 font-medium flex items-center gap-1.5 leading-normal">
                                <span>Source: {lead.source || 'Walk-in'}</span>
                                <span>•</span>
                                <span>Enquired on {lead.createdAt ? formatShortDate(lead.createdAt) : 'Recently'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap self-start sm:self-center">
                        <button 
                            type="button"
                            onClick={() => navigate('/dashboard/owner/members/add', { state: { convertedLead: lead } })}
                            className="px-6 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        >
                            <FiUserCheck size={16} /> Enroll Member
                        </button>
                        <button 
                            type="button"
                            onClick={handleEdit}
                            className="px-6 py-2.5 bg-white hover:bg-rose-50 text-slate-900 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                            <FiEdit2 size={15} className="text-[#CA0410]" /> Edit
                        </button>
                    </div>
                </div>

                {/* KEY STATS HIGHLIGHT BAR */}
                <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-rose-100/80">
                        {/* 1. PRIORITY */}
                        <div className="p-3.5 sm:p-4 px-5">
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">PRIORITY</p>
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <FiZap className={`${lead.convertibility === 'Hot' ? 'text-rose-600' : 'text-amber-500'} text-sm shrink-0`} />
                                <p className={`text-[13.5px] sm:text-[14px] font-black truncate ${
                                    lead.convertibility === 'Hot' ? 'text-rose-600' :
                                    lead.convertibility === 'Warm' ? 'text-amber-600' : 'text-slate-700'
                                }`}>
                                    {lead.convertibility || 'Warm'}
                                </p>
                            </div>
                        </div>

                        {/* 2. PLAN / FOR */}
                        <div className="p-3.5 sm:p-4 px-5">
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">PLAN / FOR</p>
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <FiTag className="text-emerald-600 text-sm shrink-0" />
                                <p className="text-[13.5px] sm:text-[14px] font-black text-slate-900 truncate">
                                    {lead.inquiryFor || 'General'}
                                </p>
                            </div>
                        </div>

                        {/* 3. LOGS */}
                        <div className="p-3.5 sm:p-4 px-5">
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">INTERACTIONS</p>
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <FiMessageSquare className="text-indigo-600 text-sm shrink-0" />
                                <p className="text-[13.5px] sm:text-[14px] font-black text-indigo-600">
                                    {lead.followUpHistory?.length || 1} Logs
                                </p>
                            </div>
                        </div>

                        {/* 4. NEXT ACTION */}
                        <div className="p-3.5 sm:p-4 px-5">
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">NEXT ACTION</p>
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <FiClock className="text-amber-600 text-sm shrink-0" />
                                <p className="text-[13.5px] sm:text-[14px] font-black text-slate-900 truncate">
                                    {urgency ? urgency.label : 'None Scheduled'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                                {/* GRID DASHBOARD */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    
                    {/* LEFT COLUMN (2 cols): Prospect Info + Update Stage & Schedule */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Next-best-action strip */}
                        {urgency && (
                            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold border-none ${urgency.tone}`}>
                                <FiClock size={16} className="shrink-0" />
                                <span>{urgency.label}</span>
                                {lead.followUpTime && <span className="opacity-70 font-semibold">· {lead.followUpTime}</span>}
                            </div>
                        )}
                        
                        {/* Live Stage & Actions Control Box */}
                        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <FiSliders className="text-slate-500" />
                                        <span>Update Stage & Schedule</span>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                        Move this prospect through the pipeline, book a trial, apply an offer, or plan the next follow-up
                                    </p>
                                </div>
                            </div>

                            {isConvertedAlready && (
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                                    <FiCheckCircle className="text-emerald-600 text-base shrink-0" />
                                    <span>This prospect is already enrolled as a member. "Pending" is locked to protect member history.</span>
                                </div>
                            )}

                            {/* Pipeline Stepper — reflects the real, ordered funnel a lead moves through */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                                    Pipeline Stage
                                </label>
                                <div className="flex items-center">
                                    {PIPELINE_STAGES.map((stage, i) => {
                                        const isPendingDisabled = isConvertedAlready && stage.id === 'Pending';
                                        const isDone = !isLostSelected && currentStageIndex > i;
                                        const isActive = !isLostSelected && currentStageIndex === i;
                                        const isLast = i === PIPELINE_STAGES.length - 1;

                                        return (
                                            <React.Fragment key={stage.id}>
                                                <button
                                                    type="button"
                                                    disabled={isPendingDisabled}
                                                    title={isPendingDisabled ? "Converted leads cannot be reverted to Pending" : stage.label}
                                                    onClick={() => {
                                                        if (isPendingDisabled) return;
                                                        setStatusFormData({
                                                            ...statusFormData,
                                                            status: stage.id,
                                                            trialDate: stage.id === 'Trial' ? (statusFormData.trialDate || toInputDateFormat(new Date())) : statusFormData.trialDate,
                                                            trialEndDate: stage.id === 'Trial' ? (statusFormData.trialEndDate || toInputDateFormat(new Date())) : statusFormData.trialEndDate
                                                        });
                                                    }}
                                                    className="flex flex-col items-center gap-1.5 group shrink-0 cursor-pointer disabled:cursor-not-allowed"
                                                >
                                                    <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-extrabold border-2 transition-all ${
                                                        isPendingDisabled
                                                            ? 'bg-slate-100 text-slate-300 border-slate-200'
                                                            : isActive
                                                                ? 'bg-[#CA0410] text-white border-[#CA0410] shadow-md scale-110'
                                                                : isDone
                                                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                                                    : 'bg-white text-slate-400 border-slate-300 group-hover:border-slate-400'
                                                    }`}>
                                                        {isDone ? <FiCheck size={16} /> : i + 1}
                                                    </span>
                                                    <span className={`text-[10.5px] sm:text-xs font-bold text-center leading-tight w-14 sm:w-20 ${
                                                        isActive ? 'text-[#CA0410]' : isDone ? 'text-emerald-700' : 'text-slate-400'
                                                    }`}>
                                                        {stage.label}
                                                    </span>
                                                </button>
                                                {!isLast && (
                                                    <div className={`flex-1 h-0.5 mb-5 rounded-full transition-all ${
                                                        !isLostSelected && currentStageIndex > i ? 'bg-emerald-500' : 'bg-slate-200'
                                                    }`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                {/* Lost — a deliberate exit branch, kept visually separate from forward progress */}
                                <div className="mt-4 pt-3.5 border-t border-dashed border-slate-200 flex items-center justify-between gap-3">
                                    <p className="text-xs text-slate-400 font-medium">Didn't work out?</p>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFormData({ ...statusFormData, status: isLostSelected ? 'Contacted' : 'Lost' })}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                            isLostSelected
                                                ? 'bg-slate-700 text-white border-slate-700'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                                        }`}
                                    >
                                        {isLostSelected ? 'Marked as Lost — click to reactivate' : 'Mark as Lost'}
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic Contextual Inputs */}
                            {statusFormData.status === 'Trial' && (
                                <div className="p-4 sm:p-5 bg-orange-50/70 rounded-2xl border border-orange-200 space-y-4">
                                    <div className="flex items-center justify-between border-b border-orange-200/70 pb-2.5">
                                        <h4 className="font-extrabold text-sm text-orange-950 flex items-center gap-2">
                                            <FiCalendar className="text-[#CA0410]" />
                                            <span>Trial Scheduling & Security Fee</span>
                                        </h4>
                                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-orange-200 shadow-2xs">
                                            <button
                                                type="button"
                                                onClick={() => setStatusFormData({
                                                    ...statusFormData,
                                                    trialFeeType: 'Unpaid',
                                                    trialPaymentStatus: 'Unpaid'
                                                })}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    statusFormData.trialFeeType !== 'Paid'
                                                        ? 'bg-[#CA0410] text-white shadow-2xs'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Unpaid (Free)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFormData({
                                                    ...statusFormData,
                                                    trialFeeType: 'Paid',
                                                    trialPaymentStatus: 'Paid'
                                                })}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    statusFormData.trialFeeType === 'Paid'
                                                        ? 'bg-[#CA0410] text-white shadow-2xs'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Paid Trial
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Trial Start Date</label>
                                            <DatePicker
                                                value={statusFormData.trialDate}
                                                onChange={(e) => setStatusFormData({ ...statusFormData, trialDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Trial End Date</label>
                                            <DatePicker
                                                value={statusFormData.trialEndDate}
                                                onChange={(e) => setStatusFormData({ ...statusFormData, trialEndDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {statusFormData.trialFeeType === 'Paid' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-orange-200/60">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Security Amount (₹)</label>
                                                <input
                                                    type="number"
                                                    value={statusFormData.securityAmount || ''}
                                                    onChange={(e) => setStatusFormData({ ...statusFormData, securityAmount: e.target.value })}
                                                    placeholder="e.g. 500 (Refundable)"
                                                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                                                <select
                                                    value={statusFormData.trialPaymentMode || 'Cash'}
                                                    onChange={(e) => setStatusFormData({ ...statusFormData, trialPaymentMode: e.target.value })}
                                                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20"
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="UPI">UPI</option>
                                                    <option value="Card">Card</option>
                                                    <option value="Net Banking">Net Banking</option>
                                                    <option value="Online">Online</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(statusFormData.status === 'Negotiation' || statusFormData.status === 'Converted') && (
                                <div className="p-4 sm:p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-4">
                                    <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                                        <FiTag className="text-emerald-600" />
                                        <span>Negotiation Offer & Coupon Discount</span>
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Preset Offer / Coupon</label>
                                        <select
                                            name="selectedOffer"
                                            value={statusFormData.selectedOffer || ''}
                                            onChange={handleOfferChange}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20"
                                        >
                                            <option value="">-- Choose an Offer / Coupon --</option>
                                            {gymSettings?.couponOffers?.filter(o => o.isActive || o._id === statusFormData.selectedOffer).map(offer => (
                                                <option key={offer._id} value={offer._id}>
                                                    {offer.title} ({offer.discountType === 'Percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}){!offer.isActive ? ' (Inactive)' : ''}
                                                </option>
                                            ))}
                                            <option value="Custom">Custom Offer / Manual Discount</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Offer Amount (₹)</label>
                                            <input
                                                type="number"
                                                name="offerAmount"
                                                value={statusFormData.offerAmount || ''}
                                                onChange={(e) => setStatusFormData({ ...statusFormData, offerAmount: e.target.value })}
                                                placeholder="e.g. 500"
                                                disabled={statusFormData.selectedOffer !== 'Custom'}
                                                className={`w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 ${
                                                    statusFormData.selectedOffer !== 'Custom' ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Offer Details / Note</label>
                                            <input
                                                type="text"
                                                name="offerDetails"
                                                value={statusFormData.offerDetails || ''}
                                                onChange={(e) => setStatusFormData({ ...statusFormData, offerDetails: e.target.value })}
                                                placeholder="e.g. 10% Off on 3 Months Plan"
                                                disabled={statusFormData.selectedOffer !== 'Custom'}
                                                className={`w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 ${
                                                    statusFormData.selectedOffer !== 'Custom' ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isLostSelected && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Dropping / Lost</label>
                                    <input
                                        type="text"
                                        value={statusFormData.lostReason}
                                        onChange={(e) => setStatusFormData({ ...statusFormData, lostReason: e.target.value })}
                                        placeholder="e.g. Too expensive, distance issue, joined other gym, etc."
                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20"
                                    />
                                </div>
                            )}

                            {statusFormData.status === 'Converted' && (
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <FiCheckCircle className="text-emerald-600 text-2xl shrink-0" />
                                        <div>
                                            <p className="text-sm font-extrabold">Ready to Join as Member!</p>
                                            <p className="text-xs text-emerald-700 mt-0.5">Saving this stage will automatically redirect you to Member Registration with prospect prefilled data.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Next Follow-up Scheduling for active leads */}
                            {!isLostSelected && statusFormData.status !== 'Converted' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                            <FiCalendar className="text-[#CA0410]" />
                                            <span>Next Follow-Up Date</span>
                                        </label>
                                        <DatePicker
                                            value={statusFormData.followUpDate}
                                            onChange={(e) => setStatusFormData({ ...statusFormData, followUpDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                            <FiClock className="text-[#CA0410]" />
                                            <span>Follow-Up Time</span>
                                        </label>
                                        <TimePicker
                                            value={statusFormData.followUpTime}
                                            onChange={(e) => setStatusFormData({ ...statusFormData, followUpTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Interaction Note */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <FiMessageSquare className="text-[#CA0410]" />
                                    <span>Call / Visit Response Note</span>
                                </label>
                                <textarea
                                    value={statusFormData.response}
                                    onChange={(e) => setStatusFormData({ ...statusFormData, response: e.target.value })}
                                    placeholder="Log call conversation, prospect queries, visit feedback, or next steps..."
                                    rows={3}
                                    className="w-full p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 resize-none transition-all"
                                />
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleStatusSubmit}
                                    disabled={submittingStatus}
                                    className="w-full sm:w-auto px-10 py-4 bg-[#CA0410] hover:bg-[#b3030e] disabled:opacity-60 text-white rounded-xl text-base font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                >
                                    {submittingStatus ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0"></div>
                                            <span>Saving Updates...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiCheck size={20} />
                                            <span>Save & Update Stage</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (1 col): Prospect Info + Contact + Activity Timeline */}
                    <div className="space-y-5">
                        {/* Prospect Details — compact single row */}
                        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-2.5">
                                <FiUser className="text-slate-500" size={14} />
                                <h3 className="text-xs font-bold text-slate-900">Prospect Information</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Inquiry For</span>
                                    <span className="text-[12px] font-extrabold text-slate-900 truncate">{lead.inquiryFor || 'General GYM'}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Gender</span>
                                    <span className="text-[12px] font-extrabold text-slate-900 truncate">{lead.gender || 'Not specified'}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Source</span>
                                    <span className="text-[12px] font-extrabold text-slate-900 truncate">{lead.source || 'Walk-in'}</span>
                                    {lead.referredBy && (
                                        <span className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">via {lead.referredBy}</span>
                                    )}
                                </div>
                            </div>
                            {/* Trial & Offer banners */}
                            {lead.trialDate && (
                                <div className="mt-2 p-2.5 bg-orange-50/80 rounded-lg border border-orange-200 flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[9px] font-bold text-orange-700 uppercase tracking-wide">Trial</p>
                                        <p className="font-extrabold text-orange-950 text-xs">
                                            {formatShortDate(lead.trialDate)}{lead.trialEndDate ? ` → ${formatShortDate(lead.trialEndDate)}` : ''}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead.trialFeeType === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {lead.trialFeeType === 'Paid' ? `Paid · ₹${lead.securityAmount || 0}` : 'Free'}
                                    </span>
                                </div>
                            )}
                            {(() => {
                                const hasOffDetails = lead.offerDetails && lead.offerDetails.trim() !== '' && !['none', 'discount'].includes(lead.offerDetails.toLowerCase());
                                const hasOffAmt = Number(lead.offerAmount) > 0;
                                const hasGenOffer = lead.offer && lead.offer.trim() !== '' && !['none', 'discount'].includes(lead.offer.toLowerCase());
                                if (!hasOffDetails && !hasOffAmt && !hasGenOffer) return null;
                                return (
                                    <div className="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">Offer</p>
                                            <p className="font-extrabold text-emerald-900 text-xs">{lead.offerDetails || lead.offer || 'Special Discount'}</p>
                                        </div>
                                        {hasOffAmt && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">₹{lead.offerAmount} OFF</span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FiPhone className="text-slate-400 shrink-0" size={15} />
                                    <span className="font-extrabold text-slate-900 text-sm truncate">
                                        {displayPhone || 'Not Provided'}
                                    </span>
                                    {displayPhone && (
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(displayPhone, 'Phone number')}
                                            className="p-1.5 text-slate-400 hover:text-[#CA0410] hover:bg-slate-50 rounded-lg transition-all cursor-pointer shrink-0"
                                            title="Copy phone number"
                                        >
                                            <FiCopy size={13} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <a
                                        href={cleanPhone ? `https://wa.me/${cleanPhone}` : undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-disabled={!cleanPhone}
                                        title="WhatsApp"
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
                                            cleanPhone
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                                : 'bg-slate-100 text-slate-300 cursor-not-allowed pointer-events-none'
                                        }`}
                                    >
                                        <FaWhatsapp size={16} />
                                    </a>
                                    <a
                                        href={displayPhone ? `tel:${displayPhone}` : undefined}
                                        aria-disabled={!displayPhone}
                                        title="Call"
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
                                            displayPhone
                                                ? 'bg-[#CA0410] hover:bg-[#b3030e] text-white cursor-pointer'
                                                : 'bg-slate-100 text-slate-300 cursor-not-allowed pointer-events-none'
                                        }`}
                                    >
                                        <FiPhone size={15} />
                                    </a>
                                    {lead.email && (
                                        <a
                                            href={`mailto:${lead.email}`}
                                            title={lead.email}
                                            className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                                        >
                                            <FiMail size={15} />
                                        </a>
                                    )}

                                    {/* Quick message templates dropdown */}
                                    <div className="relative" ref={templatesRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowTemplates(s => !s)}
                                            title="Quick message templates"
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                                showTemplates
                                                    ? 'bg-slate-800 border-slate-800 text-white'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <FiMessageSquare size={15} />
                                        </button>

                                        {showTemplates && (
                                            <div className="absolute right-0 top-11 z-20 w-72 bg-white rounded-xl border border-slate-200 shadow-lg p-2 space-y-1">
                                                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-1.5">Quick WhatsApp Messages</p>
                                                {messageTemplates.map((tpl, tIdx) => {
                                                    const Icon = tpl.icon;
                                                    return (
                                                        <div
                                                            key={tIdx}
                                                            className="p-2 hover:bg-slate-50 rounded-lg flex items-center gap-2.5 group transition-all"
                                                        >
                                                            <span className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 shrink-0">
                                                                <Icon size={12} />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-bold text-slate-900 text-xs">{tpl.title}</p>
                                                                <p className="text-[10.5px] text-slate-500 truncate font-normal">{tpl.msg}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(tpl.msg, 'Message')}
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-all cursor-pointer shrink-0"
                                                                title="Copy message"
                                                            >
                                                                <FiCopy size={12} />
                                                            </button>
                                                            <a
                                                                href={cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(tpl.msg)}` : undefined}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                aria-disabled={!cleanPhone}
                                                                onClick={() => setShowTemplates(false)}
                                                                className={`p-1.5 rounded-md transition-all shrink-0 ${
                                                                    cleanPhone ? 'text-emerald-600 hover:bg-emerald-50 cursor-pointer' : 'text-slate-300 pointer-events-none'
                                                                }`}
                                                                title="Send on WhatsApp"
                                                            >
                                                                <FiSend size={13} />
                                                            </a>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Realtime Live Activity & Follow-up Timeline Feed */}
                        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FiClock className="text-slate-500" />
                                    <span>Activity Timeline</span>
                                </h4>
                                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-full">
                                    {lead.followUpHistory?.length || 0} Logs
                                </span>
                            </div>

                            {lead.followUpHistory && lead.followUpHistory.length > 0 ? (
                                <div className="relative max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
                                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
                                    <div className="space-y-4">
                                        {lead.followUpHistory.slice().reverse().map((item, hIdx) => (
                                            <div key={hIdx} className="relative pl-9">
                                                <span className={`absolute left-0 top-1 w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center bg-white ${getStatusStyle(item.status || 'Contacted')}`}>
                                                    <span className="w-2 h-2 rounded-full bg-current" />
                                                </span>
                                                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-100 flex flex-col gap-2 text-xs sm:text-sm shadow-2xs">
                                                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                                                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                                            <FiCalendar className="text-slate-400 text-sm" />
                                                            {formatFullDate(item.contactDate)}
                                                        </span>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(item.status || 'Contacted')}`}>
                                                            {item.status || 'Contacted'}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-800 font-medium text-sm bg-white p-3 rounded-xl border border-slate-100/90 leading-relaxed shadow-2xs">
                                                        {item.response || 'Stage updated'}
                                                    </p>
                                                    {item.nextFollowUpDate && (
                                                        <p className="text-xs text-[#CA0410] font-bold flex items-center gap-1.5 pt-0.5">
                                                            <FiClock size={13} />
                                                            <span>Next follow-up: {formatFullDate(item.nextFollowUpDate)} {item.nextFollowUpTime ? `at ${item.nextFollowUpTime}` : ''}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 bg-slate-50 rounded-2xl text-center text-sm text-slate-400 font-medium italic border border-dashed border-slate-200">
                                    No past follow-up history logged yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            </div>

            {/* Mobile sticky connect bar — keeps the two highest-frequency actions one tap away */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-3 flex items-center gap-2.5">
                <a
                    href={cleanPhone ? `https://wa.me/${cleanPhone}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!cleanPhone}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        cleanPhone ? 'bg-emerald-600 text-white cursor-pointer' : 'bg-slate-100 text-slate-400 pointer-events-none'
                    }`}
                >
                    <FaWhatsapp size={17} />
                    <span>WhatsApp</span>
                </a>
                <a
                    href={displayPhone ? `tel:${displayPhone}` : undefined}
                    aria-disabled={!displayPhone}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        displayPhone ? 'bg-[#CA0410] text-white cursor-pointer' : 'bg-slate-100 text-slate-400 pointer-events-none'
                    }`}
                >
                    <FiPhone size={16} />
                    <span>Call</span>
                </a>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDestructive={confirmModal.isDestructive}
            />
        </PageLayout>
    );
}