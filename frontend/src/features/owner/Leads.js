import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import {
    FiPhone, FiCalendar, FiMessageSquare, FiEdit2, FiTrash2,
    FiX, FiEye, FiSliders, FiChevronDown, FiUsers, FiBell, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';

import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import SummaryCards from '../../components/page/SummaryCards';
import Tabs from '../../components/page/Tabs';
import FilterBar from '../../components/page/FilterBar';
import DataTable from '../../components/page/DataTable';
import ConfirmModal from '../../components/modal/ConfirmModal';
import FollowUpCalendar from './FollowUpCalendar';
import { formatDate, toInputDateFormat } from '../../utils/dateUtils';
import DatePicker from '../../components/form/DatePicker';

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
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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
        navigate(`/dashboard/owner/leads/view/${lead._id}`, { state: { lead } });
    };

    const handleOpenStatusModal = (lead) => {
        navigate(`/dashboard/owner/leads/view/${lead._id}`, { state: { lead } });
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
                toast.info('Opening edit page for lead...', { toastId: 'editToast' });
        navigate(`/dashboard/owner/leads/edit/${lead._id}`, { state: { lead: formattedLead } });
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Prospect',
            message: 'Are you sure you want to delete this prospect? This action cannot be undone and will remove all follow-up history.',
            isDestructive: true,
            confirmText: 'Delete Prospect',
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/enquiries/${id}`);
                    toast.success("Prospect deleted successfully", { toastId: "deleteSuccess" });
                    fetchLeads();
                } catch (error) {
                    toast.error("Failed to delete prospect");
                }
            }
        });
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
    const activeTrialsCount = leads.filter(l => (l.status === 'Trial' || Boolean(l.trialDate)) && !['Converted', 'Lost', 'Closed', 'Cancelled', 'Dropped'].includes(l.status)).length;
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
        const isTrial = (l) => (l.status === 'Trial' || Boolean(l.trialDate)) && !['Converted', 'Lost', 'Closed', 'Cancelled', 'Dropped'].includes(l.status);
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
        { label: 'CONTACTS', className: 'w-[12%] px-2' },
        { label: 'DETAILS', className: 'w-[21%] pl-2 pr-4' },
        { label: 'FOLLOW UPS', className: 'w-[19%] pl-3 pr-2' },
        { label: 'STATUS', className: 'w-[11%] px-2 text-center' },
        { label: 'ACTION', className: 'w-[13%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (lead, index) => {
        const cleanPhone = (lead.contactNumber || lead.phone || '').toString().replace(/\D/g, '');
        const hasTrial = lead.status === 'Trial';
        const isPaidTrial = lead.trialFeeType === 'Paid' || Boolean(lead.securityAmount);

        return (
            <tr
                key={lead._id}
                className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0 font-['Roboto',sans-serif]"
            >
                {/* PROSPECT */}
                <td className="py-3.5 pl-4 pr-2 align-middle">
                    <div className="flex items-center gap-3">
                        {/* Circular Letter Avatar */}
                        <div className="w-9 h-9 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-black text-sm flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                            {getInitial(lead)}
                        </div>

                        <div className="flex flex-col items-start min-w-0">
                            <button
                                onClick={() => handleViewLead(lead)}
                                className="font-bold text-slate-900 text-[14.5px] hover:text-[#CA0410] transition-colors text-left truncate max-w-full leading-snug cursor-pointer"
                                title={`${lead.firstName || lead.name || ''} ${lead.lastName || ''}`}
                            >
                                {lead.firstName || lead.name || 'Unknown'} {lead.lastName || ''}
                            </button>
                            <p className="text-[12.5px] text-slate-500 font-normal leading-tight mt-1">
                                {lead.gender || 'Female'} • Enquired: {lead.createdAt ? formatFullDate(lead.createdAt) : '-'}
                            </p>

                            {/* Only show trial badges if actual trial info exists */}
                            {hasTrial && lead.trialDate && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-[#CA0410] border border-rose-200/80 leading-none">
                                        Trial: {formatShortDate(lead.trialDate)}{lead.trialEndDate ? ` - ${formatShortDate(lead.trialEndDate)}` : ''}
                                    </span>
                                    {isPaidTrial ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 leading-none">
                                            Paid Trial (Sec: ₹{lead.securityAmount || 0})
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 leading-none">
                                            Free Trial
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </td>

                {/* CONTACTS */}
                <td className="py-3.5 px-2 align-middle">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[14px] tracking-tight">
                        <FiPhone className="text-slate-400 text-sm shrink-0" />
                        <span>{lead.contactNumber || lead.phone || '—'}</span>
                    </div>
                </td>

                {/* DETAILS */}
                <td className="py-3.5 pl-2 pr-4 align-middle">
                    <div className="flex flex-col gap-1 text-[13px] leading-snug">
                        <div className="whitespace-nowrap">
                            <span className="text-slate-500 font-normal">Source: </span>
                            <span className="font-semibold text-slate-800">{lead.source || 'Walk-in'}</span>
                        </div>
                        {lead.referredBy && (
                            <div className="whitespace-nowrap">
                                <span className="text-slate-500 font-normal">Ref: </span>
                                <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">{lead.referredBy}</span>
                            </div>
                        )}
                        <div className="whitespace-nowrap">
                            <span className="text-slate-500 font-normal">Plan/For: </span>
                            <span className="font-semibold text-slate-800">{lead.inquiryFor || 'GYM'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-slate-500 font-normal">Priority: </span>
                            <span className={`inline-flex items-center font-bold text-[12px] uppercase tracking-wide ${
                                lead.convertibility === 'Hot' ? 'text-rose-600' :
                                lead.convertibility === 'Warm' ? 'text-amber-600' :
                                lead.convertibility === 'Medium' ? 'text-blue-600' :
                                lead.convertibility === 'Cold' ? 'text-sky-600' :
                                'text-amber-600'
                            }`}>
                                <span className={`w-2 h-2 rounded-full mr-1 shrink-0 ${
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
                                <div className="whitespace-nowrap mt-0.5">
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
                <td className="py-3.5 pl-3 pr-2 align-middle">
                    <div className="flex flex-col gap-1 text-[13px] leading-snug">
                        {/* Last contact */}
                        <div className="flex items-center gap-1.5">
                            <FiMessageSquare className="text-purple-600 text-xs shrink-0" />
                            <span className="text-purple-600 font-medium">Last: </span>
                            <span className="font-bold text-slate-900">
                                {lead.followUpHistory && lead.followUpHistory.length > 0
                                    ? formatShortDate(lead.followUpHistory[lead.followUpHistory.length - 1].contactDate)
                                    : (lead.createdAt ? formatShortDate(lead.createdAt) : '-')
                                }
                            </span>
                            <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10.5px] font-bold rounded">
                                {lead.followUpHistory?.length || 1}
                            </span>
                        </div>

                        {/* Next contact */}
                        <div className="flex items-center gap-1.5">
                            <FiCalendar className="text-emerald-600 text-xs shrink-0" />
                            <span className="text-emerald-600 font-medium">Next: </span>
                            <span className="font-bold text-slate-900">
                                {lead.followUpDate ? formatShortDate(lead.followUpDate) : 'Not Scheduled'}
                            </span>
                        </div>

                        {/* Trial date - Show whenever trialDate exists */}
                        {lead.trialDate && (
                            <div className="flex items-center gap-1.5">
                                <FiCalendar className="text-amber-600 text-xs shrink-0" />
                                <span className="text-amber-600 font-medium">Trial: </span>
                                <span className="font-bold text-slate-900">
                                    {formatShortDate(lead.trialDate)}
                                    {lead.trialEndDate ? ` - ${formatShortDate(lead.trialEndDate)}` : ''}
                                </span>
                                {lead.status === 'Negotiation' && (
                                    <span className="text-[10.5px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold">
                                        Trial Taken
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Added by / Assigned */}
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-500 text-[12px] mt-0.5">
                            <span className="font-normal text-slate-400">Added by:</span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {lead.addedByName || lead.addedByRole || (lead.attendedBy || 'Admin')}
                            </span>
                            {lead.attendedBy && lead.attendedBy !== (lead.addedByName || lead.addedByRole) && (
                                <span className="text-[11px] text-slate-400">
                                    (Assigned: <strong className="text-slate-600">{lead.attendedBy}</strong>)
                                </span>
                            )}
                        </div>
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-3.5 px-2 text-center align-middle">
                    <button
                        type="button"
                        onClick={() => handleOpenStatusModal(lead, lead.status)}
                        className={`inline-flex items-center justify-between gap-2 text-[13.5px] font-bold rounded-lg px-3.5 py-1.5 border cursor-pointer hover:opacity-90 active:scale-95 transition-all outline-none leading-none shadow-2xs ${getStatusStyle(lead.status)}`}
                        title="Click to update status or schedule next follow-up"
                    >
                        <span>{lead.status === 'Trial' ? 'Trials' : (lead.status || 'Converted')}</span>
                        <FiChevronDown className="opacity-70 text-xs shrink-0" />
                    </button>
                </td>

                {/* ACTION */}
                <td className="py-3.5 pr-4 pl-1 text-center align-middle">
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
