import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { FiUsers, FiUserPlus, FiTrendingUp, FiCreditCard, FiActivity, FiArrowRight, FiCheckCircle, FiClock, FiAlertCircle, FiCamera, FiLogOut } from 'react-icons/fi';
import StaffCheckIn from './StaffCheckIn';

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
    
    const [recentMembers, setRecentMembers] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState(null);

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

                // Calculate Statsatte
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

    if (loading) return <Loader text="Loading your dashboard..." />;

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

    return (
        <PageLayout>
            <PageHeader 
                title={isOwnerOrAdmin ? "Dashboard Overview" : "Trainer Dashboard"} 
                subtitle={`Welcome back, ${user?.name || 'Trainer'}! Here's what's happening today.`}
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

            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-slate-50">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 bg-white border-b border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    {statCards.map((stat, index) => (
                        <div key={index} className="px-4 py-5 flex flex-col items-center justify-center text-center relative group hover:bg-slate-50/80 transition-colors cursor-default">
                            {/* Subtle hover gradient at the bottom */}
                            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-${stat.color}-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300`} />
                            
                            <div className={`text-${stat.color}-500 text-2xl mb-3 group-hover:-translate-y-1 transition-transform duration-300`}>
                                {stat.icon}
                            </div>
                            
                            <h3 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-none mb-2">
                                {stat.value}
                            </h3>
                            
                            <p className="text-slate-500 text-[11px] sm:text-xs font-bold uppercase tracking-widest">
                                {stat.title}
                            </p>
                            
                            {/* Optional small subtitle pill if needed */}
                            {stat.subtitle && (
                                <span className={`mt-3 px-2 py-0.5 rounded text-[10px] font-semibold bg-${stat.color}-50 text-${stat.color}-600`}>
                                    {stat.subtitle}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div className={`grid grid-cols-1 ${isOwnerOrAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white flex-1`}>
                    
                    {/* Recent Registrations */}
                    <div className="flex flex-col">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FiActivity className="text-indigo-500" /> Recent Registrations
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
                                        <div key={member._id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                                                    {member.firstName.charAt(0)}{member.lastName ? member.lastName.charAt(0) : ''}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{member.firstName} {member.lastName}</p>
                                                    <p className="text-xs text-slate-500">{member.contactNumber}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {member.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Transactions (Only for Gym Owner / Admin) */}
                    {isOwnerOrAdmin && (
                        <div className="flex flex-col">
                            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <FiCreditCard className="text-emerald-500" /> Recent Payments
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
                                            <div key={tx._id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <FiCheckCircle />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">
                                                            {tx.memberId?.firstName} {tx.memberId?.lastName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <FiClock className="text-[10px]" /> 
                                                            {new Date(tx.paymentDate || tx.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-800">₹{tx.amountPaid}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
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
        </PageLayout>
    );
}
