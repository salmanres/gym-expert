import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { 
    FiUsers, FiUserPlus, FiTrendingUp, FiCreditCard, FiActivity, 
    FiArrowRight, FiCheckCircle, FiClock, FiAlertCircle, FiCamera, FiLogOut, 
    FiPhoneCall, FiCalendar, FiX, FiPhone 
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import StaffCheckIn from './StaffCheckIn';
import FeePaymentLineChart from './FeePaymentLineChart';
import FollowUpCalendar from './FollowUpCalendar';

export default function OwnerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeMembers: 0,
        totalLeads: 0,
        warmLeads: 0,
        monthlyRevenue: 0,
        pendingDues: 0
    });
    
    const [allLeads, setAllLeads] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
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
                const [membersRes, leadsRes, txRes, activePlansRes] = await Promise.all([
                    apiClient.get('/members').catch(() => ({ data: [] })),
                    apiClient.get('/enquiries').catch(() => ({ data: [] })),
                    apiClient.get('/members/transactions/all').catch(() => ({ data: [] })),
                    apiClient.get('/member-memberships/active').catch(() => ({ data: [] }))
                ]);

                const members = membersRes.data || [];
                const leads = leadsRes.data || [];
                const transactions = txRes.data || [];
                const activePlans = activePlansRes.data || [];

                setAllLeads(leads);
                setAllTransactions(transactions);

                // Calculate Stats
                const activeMembers = members.filter(m => m.status === 'Active');
                const warmLeads = leads.filter(l => l.convertibility === 'Warm' || l.convertibility === 'Hot');
                
                // Revenue (Current Month)
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthlyRevenue = transactions
                    .filter(t => {
                        const d = new Date(t.paymentDate || t.createdAt);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    })
                    .reduce((sum, t) => sum + (t.amountPaid || 0), 0);

                // Pending Dues (Using Active Plans)
                const pendingDues = activePlans.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);

                setStats({
                    totalMembers: members.length,
                    activeMembers: activeMembers.length,
                    totalLeads: leads.length,
                    warmLeads: warmLeads.length,
                    monthlyRevenue,
                    pendingDues
                });

                // Recent Activity
                setRecentMembers(members.slice(0, 5));
                setRecentTransactions(transactions.slice(0, 5));
                
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

    const getDurationText = (start, end) => {
        if (!start) return '--';
        const startTime = new Date(start).getTime();
        const endTime = end ? new Date(end).getTime() : new Date().getTime();
        const diffMs = Math.max(0, endTime - startTime);
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

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

    if (loading) return <Loader text="Loading your dashboard..." />;

    // RESTORED INDIVIDUAL FLOATING STAT CARDS
    const statCards = isOwnerOrAdmin ? [
        { title: 'Total Members', value: stats.totalMembers, subtitle: `${stats.activeMembers} Active`, icon: <FiUsers />, color: 'emerald' },
        { title: 'Total Leads', value: stats.totalLeads, subtitle: `${stats.warmLeads} Warm/Hot Leads`, icon: <FiUserPlus />, color: 'indigo' },
        { title: 'Monthly Revenue', value: `₹${stats.monthlyRevenue.toLocaleString()}`, subtitle: 'This Month', icon: <FiTrendingUp />, color: 'blue' },
        { title: 'Pending Dues', value: `₹${stats.pendingDues.toLocaleString()}`, subtitle: 'From active plans', icon: <FiAlertCircle />, color: 'rose' },
    ] : [
        { 
            title: 'Today\'s Attendance', 
            value: !todayAttendance ? 'Not Marked' : !todayAttendance.checkOutTime ? 'On Duty' : 'Completed', 
            subtitle: todayAttendance?.checkInTime ? `In: ${new Date(todayAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` : 'Not checked in today', 
            icon: <FiClock />, 
            color: !todayAttendance ? 'amber' : !todayAttendance.checkOutTime ? 'emerald' : 'blue' 
        },
        { 
            title: 'Working Hours', 
            value: todayAttendance ? getDurationText(todayAttendance.checkInTime, todayAttendance.checkOutTime) : '0h 0m', 
            subtitle: todayAttendance?.checkOutTime ? 'Shift Completed' : 'Duty Duration', 
            icon: <FiCheckCircle />, 
            color: 'emerald' 
        },
        { title: 'Total Members', value: stats.totalMembers, subtitle: 'Gym Members', icon: <FiUsers />, color: 'indigo' },
        { title: 'Total Leads', value: stats.totalLeads, subtitle: 'Inquiries', icon: <FiUserPlus />, color: 'blue' },
    ];

    const getColorClasses = (color) => {
        switch (color) {
            case 'emerald':
                return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            case 'indigo':
                return { bg: 'bg-indigo-50 text-indigo-600 border-indigo-100', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
            case 'blue':
                return { bg: 'bg-blue-50 text-blue-600 border-blue-100', pill: 'bg-blue-50 text-blue-700 border-blue-200' };
            case 'amber':
                return { bg: 'bg-amber-50 text-amber-600 border-amber-100', pill: 'bg-amber-50 text-amber-700 border-amber-200' };
            case 'rose':
            default:
                return { bg: 'bg-rose-50 text-rose-600 border-rose-100', pill: 'bg-rose-50 text-rose-700 border-rose-200' };
        }
    };

    return (
        <PageLayout>
            <PageHeader 
                title={isOwnerOrAdmin ? "Dashboard Overview" : "Trainer Dashboard"} 
                subtitle={`Welcome back, ${user?.name || 'User'}! Here's your real-time gym management summary.`}
                action={
                    !todayAttendance ? (
                        <button 
                            onClick={() => setShowQRScanner(true)}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95"
                        >
                            <FiCamera className="text-lg" /> Scan QR to Check In
                        </button>
                    ) : !todayAttendance.checkOutTime ? (
                        <button 
                            onClick={handleDirectCheckOut}
                            disabled={checkingOut}
                            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                        >
                            <FiLogOut className="text-lg" /> {checkingOut ? 'Checking Out...' : 'Tap to Check Out'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-xs">
                            <FiCheckCircle className="text-base text-emerald-600" /> Attendance Completed
                        </div>
                    )
                }
            />

            {showQRScanner && <StaffCheckIn onClose={() => setShowQRScanner(false)} onSuccess={fetchMyAttendance} />}

            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-slate-50 gap-6 p-4 sm:p-6">
                
                {/* RESTORED SEPARATE INDIVIDUAL STAT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {statCards.map((stat, index) => {
                        const style = getColorClasses(stat.color);
                        return (
                            <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
                                <div>
                                    <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">{stat.title}</p>
                                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{stat.value}</h3>
                                    {stat.subtitle && (
                                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${style.pill}`}>
                                            {stat.subtitle}
                                        </span>
                                    )}
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 border shadow-2xs ${style.bg}`}>
                                    {stat.icon}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* FEE PAYMENT LINE CHART & LEADS FOLLOW-UP CALENDAR GRID */}
                {isOwnerOrAdmin && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        
                        {/* Fee Collection Analytics Line Chart (7 Columns) */}
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

                {/* RECENT REGISTRATIONS & RECENT PAYMENTS GRID */}
                <div className={`grid grid-cols-1 ${isOwnerOrAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>
                    
                    {/* Recent Registrations */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                                <FiActivity className="text-indigo-500" /> Recent Member Registrations
                            </h3>
                            <button onClick={() => navigate('/dashboard/owner/members')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                View All <FiArrowRight />
                            </button>
                        </div>
                        <div className="flex-1 p-0">
                            {recentMembers.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">No recent members found.</div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {recentMembers.map(member => (
                                        <div key={member._id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                                                    {member.firstName.charAt(0)}{member.lastName ? member.lastName.charAt(0) : ''}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{member.firstName} {member.lastName}</p>
                                                    <p className="text-[10px] text-slate-500">{member.contactNumber}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {member.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    {isOwnerOrAdmin && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                                    <FiCreditCard className="text-emerald-500" /> Recent Fee Payments
                                </h3>
                                <button onClick={() => navigate('/dashboard/owner/finance')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                    View All <FiArrowRight />
                                </button>
                            </div>
                            <div className="flex-1 p-0">
                                {recentTransactions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">No recent transactions found.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {recentTransactions.map(tx => (
                                            <div key={tx._id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <FiCheckCircle size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">
                                                            {tx.memberId?.firstName} {tx.memberId?.lastName}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            <FiClock className="text-[9px]" /> 
                                                            {new Date(tx.paymentDate || tx.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-slate-800">₹{tx.amountPaid}</p>
                                                    <p className="text-[9px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                                        {tx.paymentMode}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* CALENDAR FOLLOW-UP LEADS POPUP MODAL */}
            {calendarModalOpen && selectedCalendarDate && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                        
                        {/* Modal Dark Header */}
                        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                                    <FiCalendar size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">Scheduled Follow-ups</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        {selectedCalendarDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setCalendarModalOpen(false); setSelectedCalendarDate(null); }}
                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Modal Leads List */}
                        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 space-y-2">
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
                                        <div key={lead._id} className="p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-100">
                                                    {lead.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-extrabold text-slate-900">{lead.firstName} {lead.lastName || ''}</h4>
                                                        <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                                                            lead.convertibility === 'Hot' ? 'bg-rose-100 text-rose-700' :
                                                            lead.convertibility === 'Warm' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {lead.convertibility || lead.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{contactNum || 'No Contact'} • Source: {lead.source || 'Walk-in'}</p>
                                                </div>
                                            </div>

                                            {/* Direct Action Buttons: WhatsApp, Call, Open Lead */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {contactNum && (
                                                    <a 
                                                        href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(lead.firstName)},%20following%20up%20regarding%20your%20gym%20inquiry.`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                                                        title={`WhatsApp ${contactNum}`}
                                                    >
                                                        <FaWhatsapp size={16} />
                                                    </a>
                                                )}

                                                {contactNum && (
                                                    <a 
                                                        href={`tel:${contactNum}`}
                                                        className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-2xs"
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
                                                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-colors shadow-2xs"
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

                        {/* Modal Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 px-6">
                            <span>Total {calendarSelectedLeads.length} leads scheduled</span>
                            <button 
                                onClick={() => { setCalendarModalOpen(false); setSelectedCalendarDate(null); }}
                                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </PageLayout>
    );
}
