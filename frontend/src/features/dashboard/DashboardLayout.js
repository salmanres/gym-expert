import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    FiLogOut, FiList, FiPlusCircle, FiUser, FiHome, FiChevronDown, FiActivity,
    FiClipboard, FiUsers, FiCreditCard, FiUserCheck, FiHeart, FiBell, FiCheck,
    FiBox, FiDollarSign, FiBarChart2, FiSettings, FiCheckSquare, FiMenu, FiX, FiExternalLink, FiSearch
} from 'react-icons/fi';
import { CgGym } from 'react-icons/cg';
import { toast } from 'react-toastify';
import axios from 'axios';
import { io } from 'socket.io-client';

function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const notifRef = useRef(null);

    const [gyms, setGyms] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Bell Activity Log States
    const [notifOpen, setNotifOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState('ALL');

    // View All 30-Day Activity Modal State
    const [viewAllModalOpen, setViewAllModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [modalCategory, setModalCategory] = useState('ALL');

    // Quick user check
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch 30-Day Activity Logs
    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('http://localhost:5000/api/activity-logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setLogs(res.data.logs || []);
                setUnreadCount(res.data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch activity logs", err);
        }
    };

    useEffect(() => {
        if (['GYM_OWNER', 'TRAINER', 'STAFF', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role)) {
            fetchLogs();
        }
    }, [user?.role]);

    // Socket.io Real-time Event Listener
    useEffect(() => {
        const gymId = user?.gym?._id || user?.gymId;
        if (!gymId) return;

        const socket = io('http://localhost:5000', {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('⚡ Socket connected to notification hub');
            socket.emit('join_gym', gymId);
        });

        socket.on('new_notification', (newNotif) => {
            console.log('🔔 Live Notification received:', newNotif);
            setLogs(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);

            toast.info(`🔔 ${newNotif.title}: ${newNotif.description}`, {
                position: "top-right",
                autoClose: 4000
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [user?.gym?._id, user?.gymId]);

    useEffect(() => {
        if (user?.role === 'SUPERADMIN') {
            const fetchGyms = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get('http://localhost:5000/api/auth/superadmin/gyms', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setGyms(res.data);
                } catch (err) {
                    console.error("Failed to fetch gyms for sidebar", err);
                }
            };
            fetchGyms();
        }
    }, [user?.role]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.success("Logged out successfully");
        navigate('/login');
    };

    // How Read Works: Single Item Click Handler
    const handleNotificationClick = async (log) => {
        if (!log.isRead) {
            // Update UI state immediately
            setLogs(prev => prev.map(l => l._id === log._id ? { ...l, isRead: true } : l));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Sync with backend DB if saved log
            try {
                const token = localStorage.getItem('token');
                await axios.put(`http://localhost:5000/api/activity-logs/read/${log._id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Error marking log read", err);
            }
        }

        if (log.link) {
            navigate(log.link);
            setNotifOpen(false);
            setViewAllModalOpen(false);
        }
    };

    // Mark All Read
    const handleMarkAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/activity-logs/read/all', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(0);
            setLogs(prev => prev.map(l => ({ ...l, isRead: true })));
            toast.success("All notifications marked as read");
        } catch (err) {
            console.error("Error marking logs read", err);
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'LEAD':
                return <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200"><FiClipboard size={14} /></div>;
            case 'ATTENDANCE':
                return <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200"><FiCheckSquare size={14} /></div>;
            case 'MEMBERSHIP':
            case 'PAYMENT':
                return <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200"><FiCreditCard size={14} /></div>;
            default:
                return <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200"><FiActivity size={14} /></div>;
        }
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    // Category Unread Counts
    const unreadCategoryCounts = {
        ALL: logs.filter(l => !l.isRead).length,
        LEAD: logs.filter(l => l.type === 'LEAD' && !l.isRead).length,
        ATTENDANCE: logs.filter(l => l.type === 'ATTENDANCE' && !l.isRead).length,
        MEMBERSHIP: logs.filter(l => (l.type === 'MEMBERSHIP' || l.type === 'PAYMENT') && !l.isRead).length
    };

    const filteredLogsList = logs.filter(l => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'MEMBERSHIP') return l.type === 'MEMBERSHIP' || l.type === 'PAYMENT';
        return l.type === activeFilter;
    });

    // Modal Filtered Activity Logs
    const modalFilteredLogs = logs.filter(l => {
        const matchesCategory = modalCategory === 'ALL' 
            ? true 
            : modalCategory === 'MEMBERSHIP' ? (l.type === 'MEMBERSHIP' || l.type === 'PAYMENT') : l.type === modalCategory;
        const matchesSearch = !modalSearch.trim() || 
            l.title.toLowerCase().includes(modalSearch.toLowerCase()) || 
            l.description.toLowerCase().includes(modalSearch.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="h-screen flex bg-slate-50 text-slate-800 font-sans print:bg-white overflow-hidden">
            
            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" 
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:relative md:translate-x-0 md:w-56 border-r border-slate-200 flex flex-col shrink-0 print:hidden`}>
                <div className="h-14 bg-slate-950 p-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-white shadow-md">
                        <CgGym className="text-lg text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-white text-base tracking-tight leading-none">Gym Admin</h2>
                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {user?.role ? user.role.replace('_', ' ') : 'USER'}
                        </p>
                    </div>
                    <button 
                        onClick={() => setSidebarOpen(false)} 
                        className="md:hidden text-slate-400 hover:text-white"
                    >
                        <FiX className="text-xl" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 custom-scrollbar">
                    {user?.role === 'SUPERADMIN' && (
                        <div className="flex flex-col gap-0.5">
                            <Link 
                                to="/dashboard/gyms" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname === '/dashboard/gyms' ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <FiHome className="text-base" />
                                <span>Dashboard Overview</span>
                            </Link>
                            <Link 
                                to="/dashboard/register-gym" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname === '/dashboard/register-gym' ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <FiPlusCircle className="text-base" />
                                <span>Register New Gym</span>
                            </Link>
                        </div>
                    )}

                    {['GYM_OWNER', 'TRAINER', 'STAFF', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role) && (
                        <div className="flex flex-col gap-0.5">
                            <Link 
                                to="/dashboard/owner" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname === '/dashboard/owner' ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <FiHome className="text-base" />
                                <span>Dashboard</span>
                            </Link>
                            <Link 
                                to="/dashboard/owner/leads" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname.includes('/leads') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <FiClipboard className="text-base" />
                                <span>Leads</span>
                            </Link>
                            <Link 
                                to="/dashboard/owner/members" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${
                                    location.pathname === '/dashboard/owner/members' || location.pathname.startsWith('/dashboard/owner/members/') 
                                    ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' 
                                    : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                                }`}
                            >
                                <FiUsers className="text-base" />
                                <span>Members</span>
                            </Link>
                            <Link 
                                to="/dashboard/owner/membership" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${
                                    location.pathname === '/dashboard/owner/membership' || location.pathname.startsWith('/dashboard/owner/membership/') 
                                    ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' 
                                    : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                                }`}
                            >
                                <FiCreditCard className="text-base" />
                                <span>Membership</span>
                            </Link>
                            <Link 
                                to="/dashboard/owner/finance" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname.includes('/finance') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <FiDollarSign className="text-base" />
                                <span>Finance</span>
                            </Link>
                            {['GYM_OWNER', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role) && (
                                <Link 
                                    to="/dashboard/owner/staff" 
                                    className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname.includes('/staff') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiUserCheck className="text-base" />
                                    <span>Trainers & Staff</span>
                                </Link>
                            )}
                            
                            <Link 
                                to="/dashboard/owner/attendance" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname.includes('/attendance') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <FiCheckSquare className="text-base" />
                                <span>Attendance</span>
                            </Link>

                            <Link 
                                to="/dashboard/owner/reports" 
                                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname.includes('/reports') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <FiBarChart2 className="text-base" />
                                <span>Reports</span>
                            </Link>

                            {['GYM_OWNER', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role) && (
                                <Link 
                                    to="/dashboard/owner/settings" 
                                    className={`flex items-center gap-2 px-4 py-2 font-bold text-xs transition-colors ${location.pathname.includes('/settings') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiSettings className="text-base" />
                                    <span>Settings</span>
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                <div className="py-2 border-t border-slate-200">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 w-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors font-bold text-xs"
                    >
                        <FiLogOut className="text-base" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden print:overflow-visible relative bg-white">
                {/* Top Navbar */}
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 sticky top-0 print:hidden">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSidebarOpen(true)} 
                            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <FiMenu className="text-xl" />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800">
                            {user?.gym?.name || 'Emerald Gym Management'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3" ref={notifRef}>
                        {/* REAL-TIME SOCKET BELL NOTIFICATION BUTTON */}
                        <div className="relative">
                            <button 
                                onClick={() => setNotifOpen(!notifOpen)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative border shadow-xs ${
                                    notifOpen 
                                        ? 'bg-slate-900 text-white border-slate-900' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-emerald-600'
                                }`}
                                title="Live Realtime Notifications"
                            >
                                <FiBell className="text-lg" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white animate-pulse shadow-xs">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* REAL-TIME NOTIFICATION DROPDOWN */}
                            {notifOpen && (
                                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
                                    
                                    {/* Header (Clean No-Delete Bar) */}
                                    <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-extrabold text-sm text-white">Live Notifications</h3>
                                            <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> LIVE
                                            </span>
                                        </div>
                                        {unreadCount > 0 && (
                                            <button 
                                                onClick={handleMarkAllRead}
                                                className="px-2 py-1 text-xs text-emerald-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 font-bold"
                                                title="Mark all as read"
                                            >
                                                <FiCheck size={14} />
                                                <span className="text-[10px] font-bold">Read All</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* 4-Column Grid Filter Tabs (Zero Horizontal Scrollbar) */}
                                    <div className="grid grid-cols-4 gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-100">
                                        {[
                                            { id: 'ALL', label: 'All', count: unreadCategoryCounts.ALL },
                                            { id: 'LEAD', label: 'Leads', count: unreadCategoryCounts.LEAD },
                                            { id: 'ATTENDANCE', label: 'Attendance', count: unreadCategoryCounts.ATTENDANCE },
                                            { id: 'MEMBERSHIP', label: 'Plans', count: unreadCategoryCounts.MEMBERSHIP }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveFilter(tab.id)}
                                                className={`py-1 px-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 ${
                                                    activeFilter === tab.id 
                                                        ? 'bg-slate-900 text-white shadow-xs' 
                                                        : 'text-slate-600 hover:bg-slate-200/70'
                                                }`}
                                            >
                                                <span className="truncate">{tab.label}</span>
                                                {tab.count > 0 && (
                                                    <span className={`px-1 py-0.2 text-[8px] font-black rounded-full leading-none ${
                                                        activeFilter === tab.id 
                                                            ? 'bg-emerald-400 text-slate-950' 
                                                            : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                        {tab.count}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Notification List (Click to Mark Read & Navigate) */}
                                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1.5 space-y-1 max-h-[340px]">
                                        {filteredLogsList.length === 0 ? (
                                            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                                                <FiBell size={28} className="mb-2 text-slate-300" />
                                                <p className="text-xs font-bold text-slate-600">No new notifications</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Live events via Socket.io will pop up here instantly.</p>
                                            </div>
                                        ) : (
                                            filteredLogsList.slice(0, 15).map(log => (
                                                <div 
                                                    key={log._id}
                                                    onClick={() => handleNotificationClick(log)}
                                                    className={`p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer group border-l-4 ${
                                                        !log.isRead 
                                                            ? 'bg-emerald-50/60 border-emerald-500 shadow-2xs' 
                                                            : 'bg-white border-transparent hover:bg-slate-50 opacity-75 hover:opacity-100'
                                                    }`}
                                                >
                                                    {getLogIcon(log.type)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <h4 className={`text-[11px] truncate transition-colors ${
                                                                !log.isRead 
                                                                    ? 'font-extrabold text-slate-900 group-hover:text-emerald-600' 
                                                                    : 'font-semibold text-slate-600'
                                                            }`}>
                                                                {log.title}
                                                            </h4>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {!log.isRead && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Unread"></span>
                                                                )}
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {formatTimeAgo(log.createdAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className={`text-[10px] leading-snug mt-0.5 line-clamp-2 ${
                                                            !log.isRead ? 'font-semibold text-slate-700' : 'font-medium text-slate-400'
                                                        }`}>
                                                            {log.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Footer with "View All Activity (30 Days)" Button */}
                                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                                            <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Live updates
                                            </span>
                                            <span className="text-slate-400">Auto-expires after 30 days</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => {
                                                setViewAllModalOpen(true);
                                                setNotifOpen(false);
                                            }}
                                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <span>View All Activity (30 Days)</span>
                                            <FiExternalLink size={13} />
                                        </button>
                                    </div>

                                </div>
                            )}
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm border border-emerald-500 cursor-pointer">
                            <FiUser className="text-white text-xs" />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto print:overflow-visible w-full z-10 bg-white print:bg-white">
                    <div className="w-full h-full">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* FULL 30-DAY ACTIVITY LOG MODAL */}
            {viewAllModalOpen && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                        
                        {/* Dark Premium Modal Header */}
                        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                    <FiActivity size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">Full Activity Log</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Historical logs from the last 30 days (Auto-cleared after 30 days)</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setViewAllModalOpen(false)}
                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Search & Category Filter Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            {/* Search */}
                            <div className="relative w-full sm:w-64">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                                <input 
                                    type="text"
                                    placeholder="Search activity log..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'ALL', label: 'All Activity' },
                                    { id: 'LEAD', label: 'Leads' },
                                    { id: 'ATTENDANCE', label: 'Attendance' },
                                    { id: 'MEMBERSHIP', label: 'Memberships' }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setModalCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                                            modalCategory === cat.id 
                                                ? 'bg-slate-900 text-white shadow-xs' 
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modal Activity List */}
                        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 space-y-2">
                            {modalFilteredLogs.length === 0 ? (
                                <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                                    <FiActivity size={36} className="mb-2 text-slate-300" />
                                    <p className="text-sm font-extrabold text-slate-700">No activity logs found</p>
                                    <p className="text-xs text-slate-400 mt-1">Logs automatically clear 30 days after creation.</p>
                                </div>
                            ) : (
                                modalFilteredLogs.map(log => (
                                    <div 
                                        key={log._id}
                                        onClick={() => handleNotificationClick(log)}
                                        className={`p-3.5 rounded-xl transition-all flex items-start gap-3.5 cursor-pointer group border-l-4 ${
                                            !log.isRead 
                                                ? 'bg-emerald-50/60 border-emerald-500 shadow-2xs' 
                                                : 'bg-white border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        {getLogIcon(log.type)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                                    {log.title}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    {!log.isRead && (
                                                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider">Unread</span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-slate-600 mt-1">
                                                {log.description}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 px-6">
                            <span>Showing {modalFilteredLogs.length} activity records</span>
                            <button 
                                onClick={() => setViewAllModalOpen(false)}
                                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardLayout;
