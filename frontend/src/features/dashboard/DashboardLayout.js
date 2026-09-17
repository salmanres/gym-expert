import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FiClipboard, FiCheckSquare, FiCreditCard, FiActivity } from 'react-icons/fi';
import { toast } from '../../utils/toast';
import apiClient from '../../api/apiClient';
import { io } from 'socket.io-client';
import { formatDate } from '../../utils/dateUtils';

// Modular Layout Components (Platform vs Gym separation)
import PlatformSidebar from '../../components/layout/PlatformSidebar';
import PlatformNavbar from '../../components/layout/PlatformNavbar';
import GymSidebar from '../../components/layout/GymSidebar';
import GymNavbar from '../../components/layout/GymNavbar';
import ActivityLogModal from '../../components/layout/ActivityLogModal';

function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const notifRef = useRef(null);

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
    const isPlatformAdmin = user?.role === 'SUPERADMIN';

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
            const res = await apiClient.get('/activity-logs');
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

            toast.info(`${newNotif.title}: ${newNotif.description}`, {
                position: "top-right",
                autoClose: 4000
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [user?.gym?._id, user?.gymId]);

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
                await apiClient.put(`/activity-logs/read/${log._id}`);
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
            await apiClient.put('/activity-logs/read/all');
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
                return <FiClipboard size={15} className="text-amber-500 shrink-0 mt-0.5" />;
            case 'ATTENDANCE':
                return <FiCheckSquare size={15} className="text-emerald-500 shrink-0 mt-0.5" />;
            case 'MEMBERSHIP':
            case 'PAYMENT':
                return <FiCreditCard size={15} className="text-indigo-500 shrink-0 mt-0.5" />;
            default:
                return <FiActivity size={15} className="text-blue-500 shrink-0 mt-0.5" />;
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
        return formatDate(d);
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

            {/* Render Platform Sidebar or Gym Sidebar */}
            {isPlatformAdmin ? (
                <PlatformSidebar 
                    user={user}
                    location={location}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    handleLogout={handleLogout}
                />
            ) : (
                <GymSidebar 
                    user={user}
                    location={location}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    handleLogout={handleLogout}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden print:overflow-visible relative bg-gradient-to-b from-[#FFF5F6] via-[#FAEEEF] to-[#FFF0F2]">
                {/* Render Platform Navbar or Gym Navbar */}
                {isPlatformAdmin ? (
                    <PlatformNavbar 
                        user={user}
                        setSidebarOpen={setSidebarOpen}
                    />
                ) : (
                    <GymNavbar 
                        user={user}
                        setSidebarOpen={setSidebarOpen}
                        notifRef={notifRef}
                        notifOpen={notifOpen}
                        setNotifOpen={setNotifOpen}
                        unreadCount={unreadCount}
                        unreadCategoryCounts={unreadCategoryCounts}
                        activeFilter={activeFilter}
                        setActiveFilter={setActiveFilter}
                        filteredLogsList={filteredLogsList}
                        handleNotificationClick={handleNotificationClick}
                        handleMarkAllRead={handleMarkAllRead}
                        setViewAllModalOpen={setViewAllModalOpen}
                        getLogIcon={getLogIcon}
                        formatTimeAgo={formatTimeAgo}
                    />
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto print:overflow-visible w-full z-10 bg-[#FAEEEF] print:bg-white">
                    <div className="w-full min-h-full">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* FULL 30-DAY ACTIVITY LOG MODAL */}
            {!isPlatformAdmin && (
                <ActivityLogModal 
                    viewAllModalOpen={viewAllModalOpen}
                    setViewAllModalOpen={setViewAllModalOpen}
                    modalSearch={modalSearch}
                    setModalSearch={setModalSearch}
                    modalCategory={modalCategory}
                    setModalCategory={setModalCategory}
                    modalFilteredLogs={modalFilteredLogs}
                    handleNotificationClick={handleNotificationClick}
                    getLogIcon={getLogIcon}
                    formatTimeAgo={formatTimeAgo}
                />
            )}
        </div>
    );
}

export default DashboardLayout;
