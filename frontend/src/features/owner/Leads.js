import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import {
    FiPhone, FiMail, FiCalendar, FiMessageSquare, FiEdit2, FiTrash2,
    FiUsers, FiList, FiX, FiXCircle, FiEye, FiTag, FiClock, FiAlertCircle, FiCheckCircle,
    FiSearch, FiChevronDown, FiFilter, FiBell, FiUser, FiSliders,
    FiCopy, FiCheck, FiDownload, FiPlus, FiUserCheck, FiSend, FiStar
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';

import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import SummaryCards from '../../components/page/SummaryCards';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import DataTable from '../../components/page/DataTable';
import Loader from '../../components/page/Loader';
import Modal from '../../components/modal/Modal';
import FollowUpCalendar from './FollowUpCalendar';
import { formatDate, toInputDateFormat, getTodayInputDate } from '../../utils/dateUtils';
import DatePicker from '../../components/form/DatePicker';
import TimePicker from '../../components/form/TimePicker';

export default function Leads() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All Leads');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [sourceFilter, setSourceFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [selectedLeadIds, setSelectedLeadIds] = useState([]);
    const [gymSettings, setGymSettings] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // View Modal / 360° Profile State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewLead, setViewLead] = useState(null);
    const [quickNote, setQuickNote] = useState('');
    const [quickNextDate, setQuickNextDate] = useState('');
    const [quickNextTime, setQuickNextTime] = useState('');
    const [savingQuickNote, setSavingQuickNote] = useState(false);

    // Status / Next Step Modal State
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
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

    const fetchLeads = async () => {
        try {
            const res = await apiClient.get('/enquiries');
            setLeads(res.data || []);
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
                console.error("Gym settings fetch error", error);
            }
        };
        fetchGym();
    }, []);

    // Date formatting helpers
    const formatShortDate = (dateVal) => {
        return formatDate(dateVal);
    };

    const formatFullDate = (dateVal) => {
        return formatDate(dateVal);
    };

    const handleAddNew = () => {
        navigate('/dashboard/owner/leads/add');
    };

    const handleViewLead = (lead) => {
        setViewLead(lead);
        setQuickNote('');
        setQuickNextDate(lead.followUpDate ? toInputDateFormat(lead.followUpDate) : '');
        setQuickNextTime(lead.followUpTime || '');
        setViewModalOpen(true);
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

    const handleOpenStatusModal = (lead, targetStatus) => {
        const statusToUse = targetStatus || lead.status || 'Contacted';
        setSelectedLead(lead);

        const allCoupons = gymSettings?.couponOffers || [];
        let matchedOfferId = '';
        let matchedOfferDetails = lead.offerDetails || lead.offer || '';
        let matchedOfferAmount = (lead.offerAmount !== undefined && lead.offerAmount !== null) ? lead.offerAmount : '';

        if (allCoupons.length > 0) {
            const rawOfferId = (lead.selectedOffer || '').toString().trim();
            const rawDetails = (lead.offerDetails || lead.offer || '').toString().trim();

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
                if (!matchedOfferDetails) {
                    matchedOfferDetails = matchedOffer.title;
                }
                if (matchedOfferAmount === '' && matchedOffer.discountValue !== undefined) {
                    matchedOfferAmount = matchedOffer.discountValue;
                }
            } else if (rawOfferId === 'Custom' || rawDetails || (matchedOfferAmount !== '' && Number(matchedOfferAmount) > 0)) {
                matchedOfferId = 'Custom';
            }
        } else if (lead.selectedOffer === 'Custom' || lead.offerDetails || (matchedOfferAmount !== '' && Number(matchedOfferAmount) > 0)) {
            matchedOfferId = 'Custom';
        }

        setStatusFormData({
            status: statusToUse,
            response: '',
            followUpDate: lead.followUpDate ? toInputDateFormat(lead.followUpDate) : '',
            followUpTime: lead.followUpTime || '',
            trialDate: statusToUse === 'Trial' ? toInputDateFormat(lead.trialDate || new Date()) : (lead.status === 'Trial' && lead.trialDate ? toInputDateFormat(lead.trialDate) : ''),
            trialEndDate: statusToUse === 'Trial' ? toInputDateFormat(lead.trialEndDate || new Date()) : (lead.status === 'Trial' && lead.trialEndDate ? toInputDateFormat(lead.trialEndDate) : ''),
            trialFeeType: lead.trialFeeType || 'Unpaid',
            trialFee: lead.trialFee ?? '',
            trialPaymentStatus: lead.trialPaymentStatus || 'Unpaid',
            trialPaymentMode: lead.trialPaymentMode || 'Cash',
            securityAmount: lead.securityAmount ?? '',
            lostReason: lead.lostReason || '',
            selectedOffer: matchedOfferId,
            offerAmount: matchedOfferAmount,
            offerDetails: matchedOfferDetails
        });
        setStatusModalOpen(true);
    };

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

    const handleStatusModalSubmit = async (e) => {
        e.preventDefault();
        setSubmittingStatus(true);
        try {
            const finalFollowUpDate = statusFormData.followUpDate || null;
            let submitData = {
                ...selectedLead,
                ...statusFormData,
                followUpDate: finalFollowUpDate
            };

            // Retain trial dates and fees if status is Trial, Negotiation, or Converted, or if lead previously had a trial
            if (!['Trial', 'Negotiation', 'Converted'].includes(statusFormData.status) && !selectedLead?.trialDate) {
                submitData.trialDate = null;
                submitData.trialEndDate = null;
                submitData.trialFee = 0;
                submitData.securityAmount = 0;
            } else {
                if (statusFormData.status === 'Trial') {
                    submitData.trialDate = statusFormData.trialDate || selectedLead?.trialDate || null;
                    submitData.trialEndDate = statusFormData.trialEndDate || selectedLead?.trialEndDate || null;
                    submitData.trialFeeType = statusFormData.trialFeeType || selectedLead?.trialFeeType || 'Unpaid';
                    submitData.securityAmount = statusFormData.trialFeeType === 'Paid' ? (statusFormData.securityAmount || selectedLead?.securityAmount || 0) : 0;
                    submitData.trialPaymentMode = statusFormData.trialPaymentMode || selectedLead?.trialPaymentMode || 'Cash';
                } else {
                    submitData.trialDate = selectedLead?.trialDate || null;
                    submitData.trialEndDate = selectedLead?.trialEndDate || null;
                    submitData.trialFeeType = selectedLead?.trialFeeType || 'Unpaid';
                    submitData.securityAmount = selectedLead?.trialFeeType === 'Paid' ? (selectedLead?.securityAmount || 0) : 0;
                    submitData.trialPaymentMode = selectedLead?.trialPaymentMode || 'Cash';
                }
            }

            const hasResponse = statusFormData.response && statusFormData.response.trim() !== '';
            const autoAddedItem = {
                contactDate: new Date().toISOString(),
                response: hasResponse ? statusFormData.response : `Status changed to ${statusFormData.status}`,
                nextFollowUpDate: finalFollowUpDate || null,
                nextFollowUpTime: statusFormData.followUpTime || '',
                status: statusFormData.status
            };

            submitData.followUpHistory = [...(submitData.followUpHistory || []), autoAddedItem];
            if (!hasResponse && submitData.followUpHistory.length > 0) {
                const latestHistory = submitData.followUpHistory[submitData.followUpHistory.length - 1];
                submitData.response = latestHistory.response;
            }

            await apiClient.put(`/enquiries/${selectedLead._id}`, submitData);
            toast.success("Lead status updated successfully");
            setStatusModalOpen(false);
            if (viewModalOpen && viewLead?._id === selectedLead._id) {
                setViewLead(submitData);
            }
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

    const handleQuickNoteSubmit = async (e) => {
        e.preventDefault();
        if (!quickNote.trim()) {
            toast.warn("Please enter a note before saving");
            return;
        }
        setSavingQuickNote(true);
        try {
            const finalFollowUpDate = quickNextDate || viewLead.followUpDate || null;
            const newHistoryItem = {
                contactDate: new Date().toISOString(),
                response: quickNote.trim(),
                nextFollowUpDate: finalFollowUpDate || null,
                nextFollowUpTime: quickNextTime || '',
                status: viewLead.status || 'Contacted'
            };

            const updatedHistory = [...(viewLead.followUpHistory || []), newHistoryItem];
            const updatedLead = {
                ...viewLead,
                response: quickNote.trim(),
                followUpDate: finalFollowUpDate,
                followUpTime: quickNextTime || '',
                followUpHistory: updatedHistory
            };

            await apiClient.put(`/enquiries/${viewLead._id}`, updatedLead);
            toast.success("Interaction note saved");
            setViewLead(updatedLead);
            setQuickNote('');
            fetchLeads();
        } catch (err) {
            toast.error("Failed to save follow-up note");
        } finally {
            setSavingQuickNote(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this prospect? This action cannot be undone.')) return;
        try {
            await apiClient.delete(`/enquiries/${id}`);
            toast.success("Prospect deleted successfully");
            if (viewModalOpen && viewLead?._id === id) {
                setViewModalOpen(false);
                setViewLead(null);
            }
            fetchLeads();
        } catch (error) {
            toast.error("Failed to delete prospect");
        }
    };

    // Selection handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedLeadIds(paginatedLeads.map(l => l._id));
        } else {
            setSelectedLeadIds([]);
        }
    };

    const handleSelectLead = (id) => {
        setSelectedLeadIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Filter leads logic
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            let tabMatch = true;
            if (activeTab === 'All Leads') tabMatch = true;
            else if (activeTab === 'New Enquiries') tabMatch = lead.status === 'Pending' || (!lead.followUpDate && ['New', 'Lead'].includes(lead.status));
            else if (activeTab === 'Active Leads') tabMatch = ['Lead', 'Contacted', 'Trial', 'Negotiation'].includes(lead.status);
            else if (activeTab === 'Follow Ups') tabMatch = (Boolean(lead.followUpDate) || lead.status === 'Contacted') && !['Converted', 'Lost'].includes(lead.status) && (lead.status !== 'Pending' || Boolean(lead.followUpDate));
            else if (activeTab === 'Trials') {
                if (['Converted', 'Lost'].includes(lead.status)) {
                    tabMatch = false;
                } else {
                    let isActiveTrial = false;
                    if (lead.trialDate || lead.trialEndDate) {
                        const today = new Date();
                        const todayStr = toInputDateFormat(today);
                        const endDate = lead.trialEndDate ? new Date(lead.trialEndDate) : new Date(lead.trialDate);
                        const endStr = toInputDateFormat(endDate);
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

            const searchStr = `${lead.firstName || lead.name || ''} ${lead.lastName || ''} ${lead.contactNumber || lead.phone || ''} ${lead.email || ''} ${lead.source || ''} ${lead.attendedBy || ''} ${lead.status || ''}`.toLowerCase();
            const searchMatch = searchStr.includes(searchTerm.toLowerCase());

            let dateMatch = true;
            if (showCalendar && selectedDate) {
                if (lead.followUpDate) {
                    const leadDateStr = toInputDateFormat(lead.followUpDate);
                    const selDateStr = toInputDateFormat(selectedDate);
                    dateMatch = leadDateStr === selDateStr;
                } else {
                    dateMatch = false;
                }
            }

            let sourceMatch = sourceFilter ? lead.source === sourceFilter : true;
            let priorityMatch = priorityFilter ? (lead.convertibility || '').toLowerCase() === priorityFilter.toLowerCase() : true;

            let filterDateMatch = true;
            if (filterDate) {
                const itemDate = toInputDateFormat(lead.followUpDate || lead.createdAt);
                filterDateMatch = itemDate === filterDate;
            }

            return tabMatch && searchMatch && dateMatch && sourceMatch && priorityMatch && filterDateMatch;
        });
    }, [leads, activeTab, searchTerm, showCalendar, selectedDate, sourceFilter, priorityFilter, filterDate]);

    // Paginated leads
    const totalItems = filteredLeads.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Counts for summary cards
    const totalLeadsCount = leads.length;
    const newEnquiriesCount = leads.filter(l => l.status === 'Pending' || (!l.followUpDate && ['New', 'Lead'].includes(l.status))).length;
    const activeTrialsCount = leads.filter(l => l.status === 'Trial' || l.trialDate).length;
    const followUpsCount = leads.filter(l => (Boolean(l.followUpDate) || l.status === 'Contacted') && !['Converted', 'Lost'].includes(l.status) && (l.status !== 'Pending' || Boolean(l.followUpDate))).length;
    const convertedCount = leads.filter(l => l.status === 'Converted').length;
    const lostCount = leads.filter(l => l.status === 'Lost').length;

    const getInitial = (lead) => {
        const name = (lead?.firstName || lead?.name || lead?.lastName || '').trim();
        return name ? name.charAt(0).toUpperCase() : 'L';
    };

    // Status styling matching Figma
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Converted':
                return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
            case 'Trial':
            case 'Trials':
                return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
            case 'Contacted':
                return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
            case 'Negotiation':
                return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
            case 'Pending':
            case 'Lead':
                return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
            case 'Lost':
                return 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    // Dynamic MoM Growth Calculations from Real Backend Data
    const summaryCardsData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const isCurrentMonth = (dateVal) => {
            if (!dateVal) return false;
            const d = new Date(dateVal);
            return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        const isPreviousMonth = (dateVal) => {
            if (!dateVal) return false;
            const d = new Date(dateVal);
            return !isNaN(d.getTime()) && d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        };

        const getGrowthStats = (currentMonthCount, lastMonthCount) => {
            if (lastMonthCount === 0) {
                if (currentMonthCount > 0) {
                    return { percentage: '+100%', isPositive: true };
                }
                return { percentage: '0%', isPositive: true };
            }
            const diff = currentMonthCount - lastMonthCount;
            const pct = Math.round((diff / lastMonthCount) * 100);
            return {
                percentage: `${pct >= 0 ? '+' : ''}${pct}%`,
                isPositive: pct >= 0
            };
        };

        // 1. Total Leads
        const totalLeadsCount = leads.length;
        const curTotalLeads = leads.filter(l => isCurrentMonth(l.createdAt || l.date || l.enquiryDate)).length;
        const prevTotalLeads = leads.filter(l => isPreviousMonth(l.createdAt || l.date || l.enquiryDate)).length;
        const totalLeadsGrowth = getGrowthStats(curTotalLeads, prevTotalLeads);

        // 2. New Enquiries
        const isNew = (l) => l.status === 'Pending' || (!l.followUpDate && ['New', 'Open', 'Lead'].includes(l.status));
        const newEnquiriesCount = leads.filter(isNew).length;
        const curNew = leads.filter(l => isNew(l) && isCurrentMonth(l.createdAt || l.date)).length;
        const prevNew = leads.filter(l => isNew(l) && isPreviousMonth(l.createdAt || l.date)).length;
        const newGrowth = getGrowthStats(curNew, prevNew);

        // 3. Trials
        const isTrial = (l) => l.status === 'Trial' || Boolean(l.trialDate);
        const trialsCount = leads.filter(isTrial).length;
        const curTrials = leads.filter(l => isTrial(l) && isCurrentMonth(l.trialDate || l.createdAt)).length;
        const prevTrials = leads.filter(l => isTrial(l) && isPreviousMonth(l.trialDate || l.createdAt)).length;
        const trialsGrowth = getGrowthStats(curTrials, prevTrials);

        // 4. Follow Ups
        const isFollowUp = (l) => (Boolean(l.followUpDate) || l.status === 'Contacted' || l.status === 'Follow-up' || l.status === 'Follow Up') && !['Converted', 'Lost'].includes(l.status) && (l.status !== 'Pending' || Boolean(l.followUpDate));
        const followUpsCount = leads.filter(isFollowUp).length;
        const curFollowUps = leads.filter(l => isFollowUp(l) && isCurrentMonth(l.followUpDate || l.createdAt)).length;
        const prevFollowUps = leads.filter(l => isFollowUp(l) && isPreviousMonth(l.followUpDate || l.createdAt)).length;
        const followUpsGrowth = getGrowthStats(curFollowUps, prevFollowUps);

        // 5. Converted
        const isConverted = (l) => l.status === 'Converted';
        const convertedCount = leads.filter(isConverted).length;
        const curConverted = leads.filter(l => isConverted(l) && isCurrentMonth(l.updatedAt || l.createdAt)).length;
        const prevConverted = leads.filter(l => isConverted(l) && isPreviousMonth(l.updatedAt || l.createdAt)).length;
        const convertedGrowth = getGrowthStats(curConverted, prevConverted);

        // 6. Lost
        const isLost = (l) => ['Lost', 'Closed', 'Cancelled', 'Dropped'].includes(l.status);
        const lostCount = leads.filter(isLost).length;
        const curLost = leads.filter(l => isLost(l) && isCurrentMonth(l.updatedAt || l.createdAt)).length;
        const prevLost = leads.filter(l => isLost(l) && isPreviousMonth(l.updatedAt || l.createdAt)).length;
        const lostGrowth = getGrowthStats(curLost, prevLost);

        return [
            {
                title: 'Total Leads',
                value: totalLeadsCount,
                percentage: totalLeadsGrowth.percentage,
                percentageColor: totalLeadsGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600',
                subtitle: 'Total captured',
                icon: <FiUsers />,
                bgClass: 'bg-[#FFECEC]',
                iconColor: 'text-[#E53935]',
            },
            {
                title: 'New Enquiries',
                value: newEnquiriesCount,
                percentage: newGrowth.percentage,
                percentageColor: newGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600',
                subtitle: 'Fresh inquiries',
                icon: <FiBell />,
                bgClass: 'bg-[#FFECEC]',
                iconColor: 'text-[#E53935]',
            },
            {
                title: 'Trials',
                value: trialsCount,
                percentage: trialsGrowth.percentage,
                percentageColor: trialsGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600',
                subtitle: 'Trial ongoing',
                icon: <FiCalendar />,
                bgClass: 'bg-[#FFF3E0]',
                iconColor: 'text-[#FB8C00]',
            },
            {
                title: 'Follow Ups',
                value: followUpsCount,
                percentage: followUpsGrowth.percentage,
                percentageColor: followUpsGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600',
                subtitle: 'Active pipeline',
                icon: <FiPhone />,
                bgClass: 'bg-[#FFF9C4]',
                iconColor: 'text-[#FBC02D]',
            },
            {
                title: 'Converted',
                value: convertedCount,
                percentage: convertedGrowth.percentage,
                percentageColor: convertedGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600',
                subtitle: 'Joined members',
                icon: <FiCheckCircle />,
                bgClass: 'bg-[#E8F5E9]',
                iconColor: 'text-[#43A047]',
            },
            {
                title: 'Lost',
                value: lostCount,
                percentage: lostGrowth.percentage,
                percentageColor: lostGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600',
                subtitle: 'Inactive leads',
                icon: <FiXCircle />,
                bgClass: 'bg-[#FFEBEE]',
                iconColor: 'text-[#E53935]',
            }
        ];
    }, [leads]);

    const tabNames = ['All Leads', 'New Enquiries', 'Active Leads', 'Follow Ups', 'Trials', 'Negotiation', 'Converted', 'Lost'];

    const columns = [
        { label: 'PROSPECT', className: 'w-[24%] pl-4 pr-2' },
        { label: 'CONTACTS', className: 'w-[11%] px-2' },
        { label: 'DETAILS', className: 'w-[21%] pl-2 pr-4' },
        { label: 'FOLLOW UPS', className: 'w-[18%] pl-4 pr-2' },
        { label: 'STATUS', className: 'w-[12%] px-2 text-center' },
        { label: 'ACTION', className: 'w-[14%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (lead, index) => {
        const cleanPhone = (lead.contactNumber || lead.phone || '').toString().replace(/\D/g, '');

        const hasTrial = lead.status === 'Trial';
        const isPaidTrial = lead.trialFeeType === 'Paid' || Boolean(lead.securityAmount);

        return (
            <tr
                key={lead._id}
                className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0"
            >
                {/* PROSPECT */}
                <td className="py-2 pl-4 pr-2 align-middle">
                    <div className="flex items-center gap-2.5">
                        {/* Circular Letter Avatar */}
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                            {getInitial(lead)}
                        </div>

                        <div className="flex flex-col items-start min-w-0">
                            <button
                                onClick={() => handleViewLead(lead)}
                                className="font-bold text-slate-900 text-[13px] hover:text-[#CA0410] transition-colors text-left truncate max-w-full leading-snug cursor-pointer"
                                title={`${lead.firstName || lead.name || ''} ${lead.lastName || ''}`}
                            >
                                {lead.firstName || lead.name || 'Unknown'} {lead.lastName || ''}
                            </button>                            <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                                {lead.gender || 'Female'} • Enquired: {lead.createdAt ? formatFullDate(lead.createdAt) : '-'}
                            </p>

                            {/* Only show trial badges if actual trial info exists */}
                            {hasTrial && lead.trialDate && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-rose-50 text-[#CA0410] border border-rose-200/80 leading-none">
                                        Trial: {formatShortDate(lead.trialDate)}{lead.trialEndDate ? ` - ${formatShortDate(lead.trialEndDate)}` : ''}
                                    </span>
                                    {isPaidTrial ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 leading-none">
                                            Paid Trial (Sec: ₹{lead.securityAmount || 0})
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 leading-none">
                                            Free Trial
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </td>

                {/* CONTACTS */}
                <td className="py-2 px-2 align-middle">
                    <div className="flex items-center gap-1 text-slate-900 font-bold text-[12.5px] tracking-tight">
                        <FiPhone className="text-slate-400 text-xs shrink-0" />
                        <span>{lead.contactNumber || lead.phone || '—'}</span>
                    </div>
                </td>

                {/* DETAILS */}
                <td className="py-2 pl-2 pr-4 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        <div className="whitespace-nowrap">
                            <span className="text-slate-500 font-normal">Source: </span>
                            <span className="font-semibold text-slate-800">{lead.source || 'Walk-in'}</span>
                        </div>
                        {lead.referredBy && (
                            <div className="whitespace-nowrap">
                                <span className="text-slate-500 font-normal">Ref: </span>
                                <span className="font-semibold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">{lead.referredBy}</span>
                            </div>
                        )}
                        <div className="whitespace-nowrap">
                            <span className="text-slate-500 font-normal">Plan/For: </span>
                            <span className="font-semibold text-slate-800">{lead.inquiryFor || 'GYM'}</span>
                        </div>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                            <span className="text-slate-500 font-normal">Priority: </span>
                            <span className={`inline-flex items-center font-bold text-[11px] uppercase tracking-wide ${
                                lead.convertibility === 'Hot' ? 'text-rose-600' :
                                lead.convertibility === 'Warm' ? 'text-amber-600' :
                                lead.convertibility === 'Medium' ? 'text-blue-600' :
                                lead.convertibility === 'Cold' ? 'text-sky-600' :
                                'text-amber-600'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${
                                    lead.convertibility === 'Hot' ? 'bg-rose-500' :
                                    lead.convertibility === 'Warm' ? 'bg-amber-500' :
                                    lead.convertibility === 'Medium' ? 'bg-blue-500' :
                                    lead.convertibility === 'Cold' ? 'bg-sky-500' :
                                    'bg-amber-500'
                                }`}></span>
                                {lead.convertibility || 'WARM'}
                            </span>
                        </div>
                        {(() => {
                            const hasOffDetails = lead.offerDetails && lead.offerDetails.trim() !== '' && !['none', 'discount'].includes(lead.offerDetails.toLowerCase());
                            const hasOffAmt = Number(lead.offerAmount) > 0;
                            const hasGenOffer = lead.offer && lead.offer.trim() !== '' && !['none', 'discount'].includes(lead.offer.toLowerCase());
                            if (!hasOffDetails && !hasOffAmt && !hasGenOffer) return null;

                            return (
                                <div className="whitespace-nowrap">
                                    <span className="text-slate-500 font-normal">Offer: </span>
                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        {lead.offerDetails || lead.offer || 'Special Offer'}
                                        {hasOffAmt ? ` (₹${lead.offerAmount})` : ''}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </td>

                {/* FOLLOW UPS */}
                <td className="py-2 pl-4 pr-2 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-snug">
                        {/* Last contact */}
                        <div className="flex items-center gap-1.5">
                            <FiMessageSquare className="text-purple-600 text-[11px] shrink-0" />
                            <span className="text-purple-600 font-medium text-[11.5px]">Last: </span>
                            <span className="font-semibold text-slate-900">
                                {lead.followUpHistory && lead.followUpHistory.length > 0
                                    ? formatShortDate(lead.followUpHistory[lead.followUpHistory.length - 1].contactDate)
                                    : (lead.createdAt ? formatShortDate(lead.createdAt) : '-')
                                }
                            </span>
                            <span className="ml-1 px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[9.5px] font-bold rounded">
                                {lead.followUpHistory?.length || 1}
                            </span>
                        </div>

                        {/* Next contact */}
                        <div className="flex items-center gap-1.5">
                            <FiCalendar className="text-emerald-600 text-[11px] shrink-0" />
                            <span className="text-emerald-600 font-medium text-[11.5px]">Next: </span>
                            <span className="font-semibold text-slate-900">
                                {lead.followUpDate ? formatShortDate(lead.followUpDate) : 'Not Scheduled'}
                            </span>
                        </div>

                        {/* Trial date - Show whenever trialDate exists */}
                        {lead.trialDate && (
                            <div className="flex items-center gap-1.5">
                                <FiCalendar className="text-amber-600 text-[11px] shrink-0" />
                                <span className="text-amber-600 font-medium text-[11.5px]">Trial: </span>
                                <span className="font-semibold text-slate-900">
                                    {formatShortDate(lead.trialDate)}
                                    {lead.trialEndDate ? ` - ${formatShortDate(lead.trialEndDate)}` : ''}
                                </span>
                                {lead.status === 'Negotiation' && (
                                    <span className="text-[9.5px] px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold">
                                        Trial Taken
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Added by / Assigned */}
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-500 text-[11px]">
                            <span className="font-normal text-slate-400">Added by:</span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {lead.addedByName || lead.addedByRole || (lead.attendedBy || 'Admin')}
                            </span>
                            {lead.attendedBy && lead.attendedBy !== (lead.addedByName || lead.addedByRole) && (
                                <span className="text-[10px] text-slate-400">
                                    (Assigned: <strong className="text-slate-600">{lead.attendedBy}</strong>)
                                </span>
                            )}
                        </div>
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-2 px-2 text-center align-middle">
                    <button
                        type="button"
                        onClick={() => handleOpenStatusModal(lead, lead.status)}
                        className={`inline-flex items-center justify-between gap-1.5 text-[12.5px] font-bold rounded-lg px-3 py-1.5 border cursor-pointer hover:opacity-90 active:scale-95 transition-all outline-none leading-none shadow-2xs ${getStatusStyle(lead.status)}`}
                        title="Click to update status or schedule next follow-up"
                    >
                        <span>{lead.status === 'Trial' ? 'Trials' : (lead.status || 'Converted')}</span>
                        <FiChevronDown className="opacity-70 text-xs shrink-0" />
                    </button>
                </td>

                {/* ACTION */}
                <td className="py-2 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        {/* View Details */}
                        <button
                            onClick={() => handleViewLead(lead)}
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="View Details"
                        >
                            <FiEye size={15} />
                        </button>

                        {/* WhatsApp */}
                        <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-8 h-8 rounded-lg border border-emerald-200 text-emerald-600 bg-white hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="WhatsApp"
                        >
                            <FaWhatsapp size={15} />
                        </a>

                        {/* Edit */}
                        <button
                            onClick={() => handleEdit(lead)}
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Edit Lead"
                        >
                            <FiEdit2 size={14} />
                        </button>

                        {/* Delete */}
                        <button
                            onClick={() => handleDelete(lead._id)}
                            className="w-8 h-8 rounded-lg border border-rose-200 text-[#CA0410] bg-rose-50/60 hover:border-rose-300 hover:bg-rose-100 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Delete Lead"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <PageLayout>
            {/* 1. PAGE HEADER */}
            <PageHeader
                title="Enquiries & Leads"
                subtitle="Manage and track your prospective members"
                onAdd={handleAddNew}
                addLabel="Add Enquiry"
            />

            {/* 2. SUMMARY STATS CARDS (6 IN A ROW) */}
            <div className="px-6 md:px-8 pt-1 pb-3 bg-[#FAEEEF] shrink-0">
                <SummaryCards cards={summaryCardsData} loading={loading} />
            </div>

            {/* 3. TABS NAVIGATION */}
            <Tabs
                tabs={tabNames}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                }}
            />

            {/* 4. FILTER BAR */}
            <FilterBar
                searchTerm={searchTerm}
                onSearchChange={(value) => {
                    setSearchTerm(value);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Search by name or phone number..."
            >
                {/* Source Dropdown */}
                <select 
                    value={sourceFilter}
                    onChange={(e) => {
                        setSourceFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="h-9 px-3 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 text-slate-600 shadow-2xs w-full sm:w-auto cursor-pointer"
                >
                    <option value="">All Sources</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                </select>

                {/* Priorities Dropdown */}
                <select 
                    value={priorityFilter}
                    onChange={(e) => {
                        setPriorityFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="h-9 px-3 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 text-slate-600 shadow-2xs w-full sm:w-auto cursor-pointer"
                >
                    <option value="">All Priorities</option>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                </select>

                {/* Date Picker */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <DatePicker
                        compact={true}
                        value={filterDate}
                        onChange={(e) => {
                            setFilterDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Filter Date"
                    />
                    {filterDate && (
                        <button 
                            type="button"
                            onClick={() => {
                                setFilterDate('');
                                setCurrentPage(1);
                            }} 
                            className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            title="Clear Date"
                        >
                            <FiX size={13} />
                        </button>
                    )}
                </div>

                {/* Filters toggle */}
                <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`flex items-center gap-1.5 h-9 px-3.5 bg-white/90 backdrop-blur-md border border-rose-200/80 rounded-xl text-xs font-medium shadow-2xs transition-all cursor-pointer ${
                        showCalendar 
                            ? 'bg-[#CA0410] !text-white !border-[#CA0410]' 
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <FiSliders className={showCalendar ? "text-white text-xs" : "text-slate-500 text-xs"} />
                    <span>Filters</span>
                </button>


            </FilterBar>

            {/* 5. TABLE SECTION WITH SOLID RED HEADER */}
            <div className="px-6 md:px-8 pb-6 pt-1 bg-[#FAEEEF] w-full flex flex-col xl:flex-row gap-4 min-h-0 flex-1">


                {showCalendar && (
                    <div className="xl:w-[350px] shrink-0">
                        <FollowUpCalendar
                            leads={leads}
                            selectedDate={selectedDate}
                            onSelectDate={(date) => {
                                setSelectedDate(date);
                                setCurrentPage(1);
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
                        data={paginatedLeads}
                        loading={loading}
                        emptyMessage="No enquiries found. Try adjusting your filters or add a new enquiry."
                        renderRow={renderRow}
                        redHeader={true}
                        pagination={{
                            currentPage: currentPage,
                            totalItems: totalItems,
                            pageSize: pageSize,
                            onPageChange: (p) => setCurrentPage(p),
                            onPageSizeChange: (s) => setPageSize(s),
                            itemLabel: "leads"
                        }}
                    />
                </div>
            </div>

            {/* 7. 360° LEAD PROFILE MODAL */}
            <Modal
                isOpen={viewModalOpen && !!viewLead}
                onClose={() => { setViewModalOpen(false); setViewLead(null); }}
                title={`${viewLead?.firstName || ''} ${viewLead?.lastName || ''}`}
                subtitle={`Source: ${viewLead?.source || 'Walk-in'} • Enquired: ${viewLead?.createdAt ? formatFullDate(viewLead.createdAt) : 'N/A'}`}
                avatarText={(viewLead?.firstName || 'L').charAt(0).toUpperCase()}
                avatarBg="bg-[#CA0410]"
                badge={
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#CA0410] text-white">
                        {viewLead?.convertibility || 'Warm'}
                    </span>
                }
                maxWidth="max-w-2xl"
                bodyClassName="space-y-4 bg-slate-50/60 p-6 custom-scrollbar max-h-[80vh] overflow-y-auto"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            {viewLead?.contactNumber && (
                                <a
                                    href={`https://wa.me/${viewLead.contactNumber.toString().replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                    <FaWhatsapp size={14} />
                                    <span>WhatsApp</span>
                                </a>
                            )}
                            {viewLead?.contactNumber && (
                                <a
                                    href={`tel:${viewLead.contactNumber}`}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                    <FiPhone size={13} />
                                    <span>Call</span>
                                </a>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => { setViewModalOpen(false); setViewLead(null); }}
                            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold shadow-2xs transition-all"
                        >
                            Close
                        </button>
                    </div>
                }
            >
                {viewLead && (
                    <div className="space-y-5">
                        {/* Status bar */}
                        <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status:</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyle(viewLead.status)}`}>
                                    {viewLead.status}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    handleOpenStatusModal(viewLead, viewLead.status);
                                }}
                                className="px-3 py-1 bg-[#CA0410] hover:bg-[#b3030e] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                                Change Status / Schedule Next
                            </button>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-slate-200/80 text-xs shadow-2xs">
                            <div>
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Phone Number</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{viewLead.contactNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Email</p>
                                <p className="font-extrabold text-slate-800 mt-0.5 truncate">{viewLead.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Inquiry For</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{viewLead.inquiryFor || 'General GYM'}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Source & Ref</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">
                                    {viewLead.source || 'Walk-in'}
                                    {viewLead.referredBy ? ` (Ref: ${viewLead.referredBy})` : ''}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Added By</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">
                                    {viewLead.addedByName || viewLead.addedByRole || (viewLead.attendedBy || 'Admin')}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Assigned Staff</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{viewLead.attendedBy || 'Admin'}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Trial Window</p>
                                <p className="font-extrabold text-[#CA0410] mt-0.5">
                                    {viewLead.trialDate ? `${formatShortDate(viewLead.trialDate)} - ${formatShortDate(viewLead.trialEndDate || viewLead.trialDate)}` : 'None'}
                                </p>
                            </div>
                            {viewLead.trialFeeType === 'Paid' && (
                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px]">Security Fee</p>
                                    <p className="font-extrabold text-slate-800 mt-0.5">
                                        ₹{viewLead.securityAmount || 0} ({viewLead.trialPaymentMode || 'Cash'})
                                    </p>
                                </div>
                            )}
                            {(() => {
                                const hasOffDetails = viewLead.offerDetails && viewLead.offerDetails.trim() !== '' && !['none', 'discount'].includes(viewLead.offerDetails.toLowerCase());
                                const hasOffAmt = Number(viewLead.offerAmount) > 0;
                                const hasGenOffer = viewLead.offer && viewLead.offer.trim() !== '' && !['none', 'discount'].includes(viewLead.offer.toLowerCase());
                                if (!hasOffDetails && !hasOffAmt && !hasGenOffer) return null;

                                return (
                                    <div className="sm:col-span-2">
                                        <p className="text-slate-400 font-bold uppercase text-[10px]">Negotiated Offer / Discount</p>
                                        <p className="font-extrabold text-emerald-700 mt-0.5">
                                            {viewLead.offerDetails || viewLead.offer || 'Special Offer'}
                                            {hasOffAmt ? ` (₹${viewLead.offerAmount})` : ''}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Quick interaction note input */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <FiMessageSquare className="text-[#CA0410]" />
                                <span>Add Quick Interaction Note</span>
                            </h4>
                            <textarea
                                value={quickNote}
                                onChange={(e) => setQuickNote(e.target.value)}
                                placeholder="Log what prospect said during call or visit..."
                                rows={2}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-[#CA0410]/20 resize-none transition-all"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-500">Next Follow-up:</span>
                                    <DatePicker
                                        compact={true}
                                        value={quickNextDate}
                                        onChange={(e) => setQuickNextDate(e.target.value)}
                                        placeholder="Next Date"
                                    />
                                    <TimePicker
                                        compact={true}
                                        value={quickNextTime}
                                        onChange={(e) => setQuickNextTime(e.target.value)}
                                        placeholder="Next Time"
                                    />
                                </div>
                                <button
                                    onClick={handleQuickNoteSubmit}
                                    disabled={savingQuickNote || !quickNote.trim()}
                                    className="px-3.5 py-1.5 bg-[#CA0410] hover:bg-[#b3030e] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                >
                                    {savingQuickNote ? 'Saving...' : 'Save Note'}
                                </button>
                            </div>
                        </div>

                        {/* Follow up history timeline */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <FiClock className="text-[#CA0410]" />
                                <span>Follow-up History & Timeline</span>
                            </h4>
                            {viewLead.followUpHistory && viewLead.followUpHistory.length > 0 ? (
                                <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {viewLead.followUpHistory.slice().reverse().map((item, hIdx) => (
                                        <div key={hIdx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-800">{formatFullDate(item.contactDate)}</span>
                                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${getStatusStyle(item.status || 'Contacted')}`}>
                                                    {item.status || 'Contacted'}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 font-medium text-[11px]">{item.response || 'No notes'}</p>
                                            {item.nextFollowUpDate && (
                                                <p className="text-[10px] text-[#CA0410] font-bold">
                                                    Next scheduled: {formatFullDate(item.nextFollowUpDate)} {item.nextFollowUpTime || ''}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 font-medium italic">No past follow-up interactions logged yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* 8. STATUS UPDATE & SCHEDULING MODAL */}
            <Modal
                isOpen={statusModalOpen && !!selectedLead}
                onClose={() => { setStatusModalOpen(false); setSelectedLead(null); }}
                title={`Update Prospect: ${selectedLead?.firstName || ''} ${selectedLead?.lastName || ''}`}
                subtitle="Change stage, log conversation, or schedule trials & follow-ups"
                maxWidth="max-w-lg"
                bodyClassName="p-6 bg-slate-50/50 max-h-[80vh] overflow-y-auto custom-scrollbar"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => { setStatusModalOpen(false); setSelectedLead(null); }}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleStatusModalSubmit}
                            disabled={submittingStatus}
                            className="px-5 py-2 bg-[#CA0410] hover:bg-[#b3030e] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {submittingStatus ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0"></div>
                                    <span>Updating...</span>
                                </>
                            ) : 'Save & Update'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleStatusModalSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Lead Stage / Status</label>
                        <select
                            value={statusFormData.status}
                            onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value })}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CA0410]"
                        >
                            <option value="Pending">Pending (New)</option>
                            <option value="Contacted">Contacted (Follow Up)</option>
                            <option value="Trial">Trial Active</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Converted">Converted (Join Gym)</option>
                            <option value="Lost">Lost</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Call / Visit Response Note</label>
                        <textarea
                            value={statusFormData.response}
                            onChange={(e) => setStatusFormData({ ...statusFormData, response: e.target.value })}
                            placeholder="What happened in this interaction?"
                            rows={2}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#CA0410] resize-none"
                        />
                    </div>

                    {statusFormData.status !== 'Converted' && statusFormData.status !== 'Lost' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Next Follow-Up Date</label>
                                <DatePicker
                                    value={statusFormData.followUpDate}
                                    onChange={(e) => setStatusFormData({ ...statusFormData, followUpDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Follow-Up Time</label>
                                <TimePicker
                                    value={statusFormData.followUpTime}
                                    onChange={(e) => setStatusFormData({ ...statusFormData, followUpTime: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {statusFormData.status === 'Trial' && (
                        <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-100 space-y-3">
                            <div className="flex items-center justify-between border-b border-orange-200/60 pb-2">
                                <h4 className="font-bold text-xs text-orange-900">Trial Scheduling & Fee</h4>
                                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-orange-200">
                                    <button
                                        type="button"
                                        onClick={() => setStatusFormData({ 
                                            ...statusFormData, 
                                            trialFeeType: 'Unpaid',
                                            trialPaymentStatus: 'Unpaid'
                                        })}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                            statusFormData.trialFeeType === 'Paid' 
                                                ? 'bg-[#CA0410] text-white shadow-2xs' 
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Paid Trial
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Trial Start</label>
                                    <DatePicker
                                        value={statusFormData.trialDate}
                                        onChange={(e) => setStatusFormData({ ...statusFormData, trialDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Trial End</label>
                                    <DatePicker
                                        value={statusFormData.trialEndDate}
                                        onChange={(e) => setStatusFormData({ ...statusFormData, trialEndDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {statusFormData.trialFeeType === 'Paid' && (
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-orange-200/40">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Security Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={statusFormData.securityAmount || ''}
                                            onChange={(e) => setStatusFormData({ ...statusFormData, securityAmount: e.target.value })}
                                            placeholder="e.g. 500 (Refundable)"
                                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CA0410]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Payment Mode</label>
                                        <select
                                            value={statusFormData.trialPaymentMode || 'Cash'}
                                            onChange={(e) => setStatusFormData({ ...statusFormData, trialPaymentMode: e.target.value })}
                                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CA0410]"
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
                        <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                            <h4 className="font-bold text-xs text-emerald-900">Negotiation Offer & Coupon Discount</h4>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Preset Offer / Coupon</label>
                                <select
                                    name="selectedOffer"
                                    value={statusFormData.selectedOffer || ''}
                                    onChange={handleOfferChange}
                                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CA0410]"
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

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Offer Amount (₹)</label>
                                    <input
                                        type="number"
                                        name="offerAmount"
                                        value={statusFormData.offerAmount || ''}
                                        onChange={(e) => setStatusFormData({ ...statusFormData, offerAmount: e.target.value })}
                                        placeholder="e.g. 500"
                                        disabled={statusFormData.selectedOffer !== 'Custom'}
                                        className={`w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CA0410] ${
                                            statusFormData.selectedOffer !== 'Custom' ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Offer Details / Note</label>
                                    <input
                                        type="text"
                                        name="offerDetails"
                                        value={statusFormData.offerDetails || ''}
                                        onChange={(e) => setStatusFormData({ ...statusFormData, offerDetails: e.target.value })}
                                        placeholder="e.g. 10% Off on 3 Months"
                                        disabled={statusFormData.selectedOffer !== 'Custom'}
                                        className={`w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CA0410] ${
                                            statusFormData.selectedOffer !== 'Custom' ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {statusFormData.status === 'Lost' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Dropping / Lost</label>
                            <input
                                type="text"
                                value={statusFormData.lostReason}
                                onChange={(e) => setStatusFormData({ ...statusFormData, lostReason: e.target.value })}
                                placeholder="Too expensive, distance, joined other gym, etc."
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#CA0410]"
                            />
                        </div>
                    )}
                </form>
            </Modal>
        </PageLayout>
    );
}
