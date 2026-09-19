import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import Loader from '../../components/page/Loader';
import Modal from '../../components/modal/Modal';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { 
    FiUsers, FiUserPlus, FiTrendingUp, FiCreditCard, 
    FiArrowRight, FiCheckCircle, FiClock, FiCamera, FiLogOut, 
    FiPhoneCall, FiCalendar, FiX, FiPhone, FiChevronRight,
    FiXCircle, FiBell, FiFileText
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import StaffCheckIn from './StaffCheckIn';
import FeePaymentLineChart from './FeePaymentLineChart';
import FollowUpCalendar from './FollowUpCalendar';
import { formatDate } from '../../utils/dateUtils';

export default function OwnerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeMembers: 0,
        totalLeads: 0,
        newEnquiries: 0,
        trials: 0,
        followUps: 0,
        converted: 0,
        lost: 0,
        monthlyRevenue: 0,
        pendingDues: 0
    });
    
    const [allMembers, setAllMembers] = useState([]);
    const [allLeads, setAllLeads] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [allActivePlans, setAllActivePlans] = useState([]);
    const [allAttendance, setAllAttendance] = useState([]);
    const [recentMembers, setRecentMembers] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState(null);

    // Calendar Date Selection Modal State
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
    const [calendarModalOpen, setCalendarModalOpen] = useState(false);

    const fetchMyAttendance = async () => {
        try {
            const res = await apiClient.get('/attendance/my');
            const logs = res.data || [];
            const todayStr = new Date().toISOString().split('T')[0];
            const logToday = logs.find(l => new Date(l.date).toISOString().split('T')[0] === todayStr);
            setTodayAttendance(logToday || null);
        } catch (err) {
            console.error("Failed to fetch my attendance:", err);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [membersRes, leadsRes, txRes, activePlansRes, attendanceRes] = await Promise.all([
                    apiClient.get('/members').catch(() => ({ data: [] })),
                    apiClient.get('/enquiries').catch(() => ({ data: [] })),
                    apiClient.get('/members/transactions/all').catch(() => ({ data: [] })),
                    apiClient.get('/member-memberships/active').catch(() => ({ data: [] })),
                    apiClient.get('/attendance').catch(() => ({ data: [] }))
                ]);

                const members = membersRes.data || [];
                const leads = leadsRes.data || [];
                const transactions = txRes.data || [];
                const activePlans = activePlansRes.data || [];
                const attendance = attendanceRes.data || [];

                setAllMembers(members);
                setAllLeads(leads);
                setAllTransactions(transactions);
                setAllActivePlans(activePlans);
                setAllAttendance(attendance);

                // Calculate Stats
                const activeMembers = members.filter(m => m.status === 'Active');
                const newEnquiries = leads.filter(l => !l.status || ['Pending', 'New', 'Open', 'Lead'].includes(l.status)).length;
                const trials = leads.filter(l => l.status === 'Trial' || Boolean(l.trialDate) || l.convertibility === 'Hot').length;
                const followUps = leads.filter(l => (Boolean(l.followUpDate) || l.status === 'Contacted' || l.status === 'Follow-up' || l.status === 'Follow Up') && !['Converted', 'Lost'].includes(l.status)).length;
                const converted = leads.filter(l => l.status === 'Converted').length;
                const lost = leads.filter(l => ['Lost', 'Closed', 'Cancelled', 'Dropped'].includes(l.status)).length;
                
                // Revenue (Current Month)
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthlyRevenue = transactions
                    .filter(t => {
                        const d = new Date(t.paymentDate || t.createdAt);
                        return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    })
                    .reduce((sum, t) => sum + (t.amountPaid || 0), 0);

                // Pending Dues (Using Active Plans)
                const pendingDues = activePlans.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);

                setStats({
                    totalMembers: members.length,
                    activeMembers: activeMembers.length,
                    totalLeads: leads.length,
                    newEnquiries,
                    trials,
                    followUps,
                    converted,
                    lost,
                    monthlyRevenue,
                    pendingDues
                });

                // Recent Activity (Top 6)
                setRecentMembers(members.slice(0, 6));
                setRecentTransactions(transactions.slice(0, 6));
                
                setLoading(false);
            } catch (error) {
                console.error("Dashboard fetch error:", error);
                toast.error("Failed to load dashboard data");
                setLoading(false);
            }
        };

        fetchDashboardData();
        fetchMyAttendance();
    }, []);

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isOwnerOrAdmin = ['GYM_OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERADMIN'].includes(user?.role);

    const handleDirectCheckOut = async () => {
        try {
            setCheckingOut(true);
            const res = await apiClient.post('/attendance/mark', { source: 'Self' });
            toast.success(res.data?.message || 'Checked out successfully!');
            await fetchMyAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Check-out failed.');
        } finally {
            setCheckingOut(false);
        }
    };

    const handleDateSelect = (date) => {
        if (date) {
            setSelectedCalendarDate(date);
            setCalendarModalOpen(true);
        } else {
            setSelectedCalendarDate(null);
            setCalendarModalOpen(false);
        }
    };

    // Filter leads by selected calendar date for modal
    const calendarSelectedLeads = selectedCalendarDate ? allLeads.filter(lead => {
        if (!lead.followUpDate) return false;
        const selStr = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`;
        const leadDateStr = typeof lead.followUpDate === 'string' && lead.followUpDate.includes('T')
            ? lead.followUpDate.split('T')[0]
            : (typeof lead.followUpDate === 'string'
                ? lead.followUpDate
                : `${new Date(lead.followUpDate).getFullYear()}-${String(new Date(lead.followUpDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(lead.followUpDate).getDate()).padStart(2, '0')}`);
        return leadDateStr === selStr;
    }) : [];

    // Dynamically calculate Main Gym KPI Cards from Real Backend Data
    const mainStatsCards = useMemo(() => {
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

        const getGrowthStats = (currentCount, lastCount) => {
            if (lastCount === 0) {
                if (currentCount > 0) {
                    return { percentage: '+100%', isPositive: true };
                }
                return { percentage: '0%', isPositive: true };
            }
            const diff = currentCount - lastCount;
            const pct = Math.round((diff / lastCount) * 100);
            return {
                percentage: `${pct >= 0 ? '+' : ''}${pct}%`,
                isPositive: pct >= 0
            };
        };

        // 1. Members Growth (New registrations this month vs last month)
        const activeMembersCount = allMembers.filter(m => m.status === 'Active').length;
        const curMonthMembers = allMembers.filter(m => isCurrentMonth(m.createdAt || m.joiningDate)).length;
        const prevMonthMembers = allMembers.filter(m => isPreviousMonth(m.createdAt || m.joiningDate)).length;
        const memberGrowth = getGrowthStats(curMonthMembers, prevMonthMembers);

        // 2. Monthly Revenue Growth
        const curMonthRevenue = allTransactions
            .filter(t => isCurrentMonth(t.paymentDate || t.createdAt))
            .reduce((sum, t) => sum + (t.amountPaid || 0), 0);
        const prevMonthRevenue = allTransactions
            .filter(t => isPreviousMonth(t.paymentDate || t.createdAt))
            .reduce((sum, t) => sum + (t.amountPaid || 0), 0);
        const totalRevenue = allTransactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
        const revenueGrowth = getGrowthStats(curMonthRevenue, prevMonthRevenue);

        // 3. Outstanding Pending Dues
        const pendingDuesTotal = allActivePlans.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);
        const dueMembersCount = allActivePlans.filter(p => (p.balanceAmount || 0) > 0).length;

        // 4. Today's Attendance Check-ins
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAttendanceLogs = (allAttendance || []).filter(a => {
            if (!a.date && !a.checkInTime) return false;
            const aDate = new Date(a.date || a.checkInTime);
            return !isNaN(aDate.getTime()) && aDate.toISOString().split('T')[0] === todayStr;
        });
        const todayUniqueCheckins = new Set(
            todayAttendanceLogs.map(a => (a.memberId?._id || a.memberId || a._id).toString())
        ).size;
        const attendanceRate = activeMembersCount > 0 ? Math.round((todayUniqueCheckins / activeMembersCount) * 100) : 0;

        // 5. Total Leads Growth
        const curMonthLeads = allLeads.filter(l => isCurrentMonth(l.createdAt || l.date || l.enquiryDate)).length;
        const prevMonthLeads = allLeads.filter(l => isPreviousMonth(l.createdAt || l.date || l.enquiryDate)).length;
        const leadsGrowth = getGrowthStats(curMonthLeads, prevMonthLeads);
        const newEnquiriesCount = allLeads.filter(l => !l.status || ['Pending', 'New', 'Open', 'Lead'].includes(l.status)).length;

        // 6. Expiring Memberships (Within next 15 days or today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in15Days = new Date(today);
        in15Days.setDate(in15Days.getDate() + 15);
        in15Days.setHours(23, 59, 59, 999);

        const expiringSoonCount = allActivePlans.filter(p => {
            const end = new Date(p.paidUntilDate || p.endDate);
            return !isNaN(end.getTime()) && end >= today && end <= in15Days;
        }).length;

        return [
            {
                title: 'Active Members',
                value: activeMembersCount,
                percentage: memberGrowth.percentage,
                isPositive: memberGrowth.isPositive,
                subtitle: `${allMembers.length} Total Members`,
                icon: <FiUsers className="text-[#CA0410] text-lg" />,
                iconBg: 'bg-[#FFECEC]',
                link: '/dashboard/owner/members'
            },
            {
                title: 'Monthly Revenue',
                value: `₹${Math.round(curMonthRevenue).toLocaleString()}`,
                percentage: revenueGrowth.percentage,
                isPositive: revenueGrowth.isPositive,
                subtitle: `₹${Math.round(totalRevenue).toLocaleString()} Lifetime`,
                icon: <FiTrendingUp className="text-[#2E7D32] text-lg" />,
                iconBg: 'bg-[#E8F5E9]',
                link: '/dashboard/owner/finance'
            },
            {
                title: 'Pending Dues',
                value: `₹${Math.round(pendingDuesTotal).toLocaleString()}`,
                percentage: `${dueMembersCount} Due`,
                isPositive: dueMembersCount === 0,
                subtitle: `${dueMembersCount} members pending`,
                icon: <FiCreditCard className="text-[#EA580C] text-lg" />,
                iconBg: 'bg-[#FFF3E0]',
                link: '/dashboard/owner/finance'
            },
            {
                title: "Today's Attendance",
                value: todayUniqueCheckins,
                percentage: `${attendanceRate}%`,
                isPositive: todayUniqueCheckins > 0,
                subtitle: `Active check-ins today`,
                icon: <FiCheckCircle className="text-[#1976D2] text-lg" />,
                iconBg: 'bg-[#E3F2FD]',
                link: '/dashboard/owner/attendance/daily'
            },
            {
                title: 'Total Leads',
                value: allLeads.length,
                percentage: leadsGrowth.percentage,
                isPositive: leadsGrowth.isPositive,
                subtitle: `${newEnquiriesCount} fresh inquiries`,
                icon: <FiUserPlus className="text-[#7E22CE] text-lg" />,
                iconBg: 'bg-[#F3E8FF]',
                link: '/dashboard/owner/leads'
            },
            {
                title: 'Expiring Soon',
                value: expiringSoonCount,
                percentage: `${expiringSoonCount} Due`,
                isPositive: expiringSoonCount === 0,
                subtitle: 'Next 15 days renewals',
                icon: <FiClock className="text-[#D97706] text-lg" />,
                iconBg: 'bg-[#FFF9C4]',
                link: '/dashboard/owner/membership'
            }
        ];
    }, [allMembers, allTransactions, allActivePlans, allAttendance, allLeads]);

    if (loading) return <Loader text="Loading your dashboard..." />;

    return (
        <PageLayout>
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 px-6 md:px-8 py-6 bg-[#FAEEEF]">
                
                {/* Header Greeting Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#CA0410] tracking-tight">
                           Welcome, {user?.name || 'Harjeet Kaur'}!
                        </h1>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                            Here's your real-time gym management summary
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {!todayAttendance ? (
                            <button 
                                onClick={() => setShowQRScanner(true)}
                                className="flex items-center gap-2 bg-[#CA0410] hover:bg-[#b0030e] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all hover:shadow-lg active:scale-95 cursor-pointer"
                            >
                                <FiCamera className="text-base" /> Scan QR to Check In <FiChevronRight className="text-sm ml-0.5" />
                            </button>
                        ) : !todayAttendance.checkOutTime ? (
                            <button 
                                onClick={handleDirectCheckOut}
                                disabled={checkingOut}
                                className="flex items-center gap-2 bg-[#CA0410] hover:bg-[#b0030e] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                <FiLogOut className="text-base" /> {checkingOut ? 'Checking Out...' : 'Tap to Check Out'} <FiChevronRight className="text-sm ml-0.5" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-xs">
                                <FiCheckCircle className="text-base text-emerald-600" /> Attendance Completed
                            </div>
                        )}
                    </div>
                </div>

                {showQRScanner && <StaffCheckIn onClose={() => setShowQRScanner(false)} onSuccess={fetchMyAttendance} />}

                {/* 6 Main Gym Overview KPI Cards Grid with Real Backend Data */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
                    {mainStatsCards.map((card, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => card.link && navigate(card.link)}
                            className="bg-white p-3.5 sm:p-4 rounded-2xl border border-rose-200/80 shadow-2xs hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 transition-all flex items-center gap-3 cursor-pointer group"
                        >
                            <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                                {card.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11.5px] font-bold text-slate-700 truncate group-hover:text-slate-900 transition-colors">{card.title}</p>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
                                        {card.value}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                                        card.isPositive 
                                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                                            : 'text-rose-700 bg-rose-50 border-rose-200'
                                    }`}>
                                        {card.percentage}
                                    </span>
                                </div>
                                <span className="text-[9.5px] font-medium text-slate-400 block mt-0.5 truncate">{card.subtitle}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FEE COLLECTION ANALYTICS & FOLLOW UP CALENDAR */}
                {isOwnerOrAdmin && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                        
                        {/* Fee Collection Analytics (7 Columns) */}
                        <div className="lg:col-span-7 h-full">
                            <FeePaymentLineChart transactions={allTransactions} />
                        </div>

                        {/* Leads Follow-Up Calendar (5 Columns) */}
                        <div className="lg:col-span-5 h-full">
                            <FollowUpCalendar 
                                leads={allLeads}
                                selectedDate={selectedCalendarDate}
                                onSelectDate={handleDateSelect}
                            />
                        </div>

                    </div>
                )}

                {/* QUICK ACTIONS & QUICK STATS ROW */}
                {isOwnerOrAdmin && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                        
                        {/* 4 Quick Actions (7 Columns) */}
                        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            
                            {/* Add Member */}
                            <div 
                                onClick={() => navigate('/dashboard/owner/members/add')}
                                className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs hover:shadow-md hover:border-[#CA0410] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-3 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#CA0410] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                    <FiUsers size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 group-hover:text-[#CA0410] transition-colors leading-tight">Add Member</h4>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Register member</p>
                                </div>
                            </div>

                            {/* Add Leads */}
                            <div 
                                onClick={() => navigate('/dashboard/owner/leads/add')}
                                className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs hover:shadow-md hover:border-slate-800 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-3 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                    <FiUserPlus size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 group-hover:text-slate-700 transition-colors leading-tight">Add Leads</h4>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Capture new leads</p>
                                </div>
                            </div>

                            {/* New Plan */}
                            <div 
                                onClick={() => navigate('/dashboard/owner/membership')}
                                className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs hover:shadow-md hover:border-[#CA0410] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-3 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#CA0410] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                    <FiCalendar size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 group-hover:text-[#CA0410] transition-colors leading-tight">New Plan</h4>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Membership plan</p>
                                </div>
                            </div>

                            {/* View Reports */}
                            <div 
                                onClick={() => navigate('/dashboard/owner/reports')}
                                className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs hover:shadow-md hover:border-slate-800 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-3 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                    <FiFileText size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 group-hover:text-slate-700 transition-colors leading-tight">View Reports</h4>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Check detailed</p>
                                </div>
                            </div>

                        </div>

                        {/* Lead Pipeline Quick Stats Box (5 Columns) */}
                        <div className="lg:col-span-5 bg-white rounded-2xl border border-rose-200/80 p-4 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-6 h-6 rounded-lg bg-rose-50 text-[#CA0410] flex items-center justify-center text-xs">
                                    <FiTrendingUp />
                                </div>
                                <h4 className="text-xs font-black text-slate-800 tracking-tight">Pipeline Highlights</h4>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="bg-[#FFECEC]/80 border border-rose-200/60 p-2 rounded-xl text-center flex flex-col justify-center">
                                    <span className="text-sm font-black text-[#CA0410]">{stats.newEnquiries}</span>
                                    <span className="text-[9.5px] font-bold text-rose-600 mt-0.5">New Enquiries</span>
                                </div>
                                <div className="bg-[#FFF3E0]/80 border border-amber-200/60 p-2 rounded-xl text-center flex flex-col justify-center">
                                    <span className="text-sm font-black text-amber-700">{stats.trials}</span>
                                    <span className="text-[9.5px] font-bold text-amber-600 mt-0.5">Active Trials</span>
                                </div>
                                <div className="bg-[#FFF9C4]/80 border border-yellow-200/60 p-2 rounded-xl text-center flex flex-col justify-center">
                                    <span className="text-sm font-black text-amber-800">{stats.followUps}</span>
                                    <span className="text-[9.5px] font-bold text-yellow-700 mt-0.5">Follow-ups Due</span>
                                </div>
                                <div className="bg-[#E8F5E9]/80 border border-emerald-200/60 p-2 rounded-xl text-center flex flex-col justify-center">
                                    <span className="text-sm font-black text-emerald-700">{stats.converted}</span>
                                    <span className="text-[9.5px] font-bold text-emerald-600 mt-0.5">Converted</span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* RECENT REGISTRATIONS & RECENT PAYMENTS TABLES */}
                <div className={`grid grid-cols-1 ${isOwnerOrAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-5 sm:gap-6`}>
                    
                    {/* Recent Member Registrations */}
                    <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-rose-100/80 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#CA0410] flex items-center justify-center border border-rose-200/60 shrink-0">
                                    <FiUsers size={16} />
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-sm">Recent Member Registrations</h3>
                            </div>
                            <button 
                                onClick={() => navigate('/dashboard/owner/members')} 
                                className="text-xs font-bold text-[#CA0410] hover:text-[#a8030d] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                View All <FiArrowRight size={13} />
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto flex-1">
                            {recentMembers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs font-medium">No recent members found.</div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-rose-100 text-[10px] uppercase font-bold text-slate-500 bg-rose-50/40">
                                            <th className="py-2.5 px-4">Member Name</th>
                                            <th className="py-2.5 px-3">Joining Date</th>
                                            <th className="py-2.5 px-3 text-center">Status</th>
                                            <th className="py-2.5 px-3 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentMembers.map(m => (
                                            <tr key={m._id} className="hover:bg-rose-50/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-rose-50 text-[#CA0410] font-black text-[10px] flex items-center justify-center shrink-0 border border-rose-200/60">
                                                            {m.firstName?.charAt(0)}{m.lastName?.charAt(0) || ''}
                                                        </div>
                                                        <span className="font-bold text-slate-800 text-xs truncate max-w-[150px]">
                                                            {m.firstName} {m.lastName || ''}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-slate-500 font-medium text-xs">
                                                    {formatDate(m.createdAt || m.joiningDate)}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        m.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {m.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right text-slate-300">
                                                    <FiChevronRight size={14} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Recent Fee Payments */}
                    {isOwnerOrAdmin && (
                        <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-rose-100/80 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#CA0410] flex items-center justify-center border border-rose-200/60 shrink-0">
                                        <FiCreditCard size={16} />
                                    </div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">Recent Fee Payments</h3>
                                </div>
                                <button 
                                    onClick={() => navigate('/dashboard/owner/finance')} 
                                    className="text-xs font-bold text-[#CA0410] hover:text-[#a8030d] flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    View All <FiArrowRight size={13} />
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto flex-1">
                                {recentTransactions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs font-medium">No recent fee payments found.</div>
                                ) : (
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-rose-100 text-[10px] uppercase font-bold text-slate-500 bg-rose-50/40">
                                                <th className="py-2.5 px-4">Member Name</th>
                                                <th className="py-2.5 px-3">Date</th>
                                                <th className="py-2.5 px-3">Amount</th>
                                                <th className="py-2.5 px-3 text-center">Status</th>
                                                <th className="py-2.5 px-3 w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {recentTransactions.map(tx => (
                                                <tr key={tx._id} className="hover:bg-rose-50/30 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-rose-50 text-[#CA0410] font-black text-[10px] flex items-center justify-center shrink-0 border border-rose-200/60">
                                                                {tx.memberId?.firstName?.charAt(0) || 'M'}{tx.memberId?.lastName?.charAt(0) || ''}
                                                            </div>
                                                            <span className="font-bold text-slate-800 text-xs truncate max-w-[150px]">
                                                                {tx.memberId?.firstName} {tx.memberId?.lastName || ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-500 font-medium text-xs">
                                                        {formatDate(tx.paymentDate || tx.createdAt)}
                                                    </td>
                                                    <td className="py-3 px-3 font-black text-slate-900 text-xs">
                                                        ₹{tx.amountPaid}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                            {tx.paymentMode || 'Cash'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right text-slate-300">
                                                        <FiChevronRight size={14} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* CALENDAR FOLLOW-UP LEADS MODAL USING APP MODAL COMPONENT */}
            <Modal
                isOpen={calendarModalOpen && Boolean(selectedCalendarDate)}
                onClose={() => { setCalendarModalOpen(false); setSelectedCalendarDate(null); }}
                title="Scheduled Follow-ups"
                subtitle={selectedCalendarDate ? `Follow-up appointments for ${formatDate(selectedCalendarDate)}` : ''}
                icon={FiCalendar}
                maxWidth="max-w-xl"
                badge={
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 text-white shadow-2xs">
                        {calendarSelectedLeads.length} {calendarSelectedLeads.length === 1 ? 'Lead' : 'Leads'}
                    </span>
                }
                footer={
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-500">
                            Total {calendarSelectedLeads.length} leads scheduled
                        </span>
                        <button 
                            onClick={() => { setCalendarModalOpen(false); setSelectedCalendarDate(null); }}
                            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                }
            >
                <div className="divide-y divide-slate-100 space-y-2">
                    {calendarSelectedLeads.length === 0 ? (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                            <FiPhoneCall size={36} className="mb-2 text-slate-300" />
                            <p className="text-sm font-extrabold text-slate-700">No calls or follow-ups</p>
                            <p className="text-xs text-slate-400 mt-1">There are no leads scheduled for follow-up on this date.</p>
                        </div>
                    ) : (
                        calendarSelectedLeads.map(lead => {
                            const contactNum = lead.contactNumber || lead.phone || lead.mobile || '';
                            const cleanPhone = contactNum.replace(/\D/g, '');

                            return (
                                <div key={lead._id} className="p-3.5 rounded-2xl border border-rose-100/80 bg-white hover:bg-rose-50/40 transition-all flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#CA0410] flex items-center justify-center font-bold text-sm shrink-0 border border-rose-200/60 shadow-2xs">
                                            {lead.firstName?.charAt(0) || 'L'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-extrabold text-slate-900 truncate">{lead.firstName} {lead.lastName || ''}</h4>
                                                <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                                    lead.convertibility === 'Hot' ? 'bg-rose-100 text-rose-700' :
                                                    lead.convertibility === 'Warm' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {lead.convertibility || lead.status || 'WARM'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{contactNum || 'No Contact'} • Source: {lead.source || 'Walk-in'}</p>
                                        </div>
                                    </div>

                                    {/* Direct Action Buttons: WhatsApp, Call, Open Lead */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {contactNum && (
                                            <a 
                                                href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(lead.firstName)},%20following%20up%20regarding%20your%20gym%20inquiry.`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                                title={`WhatsApp ${contactNum}`}
                                            >
                                                <FaWhatsapp size={15} />
                                            </a>
                                        )}

                                        {contactNum && (
                                            <a 
                                                href={`tel:${contactNum}`}
                                                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                                title={`Call ${contactNum}`}
                                            >
                                                <FiPhone size={14} />
                                            </a>
                                        )}

                                        <button 
                                            onClick={() => {
                                                setCalendarModalOpen(false);
                                                navigate('/dashboard/owner/leads');
                                            }}
                                            className="w-8 h-8 rounded-lg bg-[#CA0410] hover:bg-[#b0030e] text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                            title="Open Leads Workspace"
                                        >
                                            <FiArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </Modal>
        </PageLayout>
    );
}
