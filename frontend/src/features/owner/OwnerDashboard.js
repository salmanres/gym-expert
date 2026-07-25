import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { FiUsers, FiUserPlus, FiTrendingUp, FiCreditCard, FiActivity, FiArrowRight, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

export default function OwnerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    
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

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [membersRes, leadsRes, txRes, activePlansRes] = await Promise.all([
                    apiClient.get('/members'),
                    apiClient.get('/enquiries'),
                    apiClient.get('/members/transactions/all').catch(() => ({ data: [] })),
                    apiClient.get('/member-memberships/active').catch(() => ({ data: [] }))
                ]);

                const members = membersRes.data || [];
                const leads = leadsRes.data || [];
                const transactions = txRes.data || [];
                const activePlans = activePlansRes.data || [];

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
    }, []);

    if (loading) return <Loader text="Loading your dashboard..." />;

    const statCards = [
        { title: 'Total Members', value: stats.totalMembers, subtitle: `${stats.activeMembers} Active`, icon: <FiUsers />, color: 'emerald' },
        { title: 'Total Leads', value: stats.totalLeads, subtitle: `${stats.warmLeads} Warm/Hot Leads`, icon: <FiUserPlus />, color: 'indigo' },
        { title: 'Monthly Revenue', value: `₹${stats.monthlyRevenue.toLocaleString()}`, subtitle: 'This Month', icon: <FiTrendingUp />, color: 'blue' },
        { title: 'Pending Dues', value: `₹${stats.pendingDues.toLocaleString()}`, subtitle: 'From active plans', icon: <FiAlertCircle />, color: 'rose' },
    ];

    return (
        <PageLayout>
            <PageHeader 
                title="Dashboard Overview" 
                subtitle={`Welcome back! Here's what's happening today.`}
            />

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

                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white flex-1">
                    
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

                    {/* Recent Transactions */}
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

                </div>
            </div>
        </PageLayout>
    );
}
