import React from 'react';
import { FiMenu, FiBell, FiCheck, FiExternalLink, FiUser, FiArrowDown } from 'react-icons/fi';
import { FaAngleDown } from "react-icons/fa6";
function GymNavbar({ 
    user, 
    setSidebarOpen, 
    notifRef, 
    notifOpen, 
    setNotifOpen, 
    unreadCount, 
    unreadCategoryCounts, 
    activeFilter, 
    setActiveFilter, 
    filteredLogsList, 
    handleNotificationClick, 
    handleMarkAllRead, 
    setViewAllModalOpen, 
    getLogIcon, 
    formatTimeAgo 
}) {
    return (
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-rose-200/80 flex items-center justify-between px-6 shrink-0 z-20 sticky top-0 print:hidden shadow-2xs">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setSidebarOpen(true)} 
                    className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <FiMenu className="text-xl" />
                </button>
                <h1 className="text-xl text-roboto font-bold fontfamily-roboto text-slate-800">
                    {user?.gym?.name || 'Gym Management'}
                </h1>
            </div>

            <div className="flex items-center gap-3" ref={notifRef}>
                {/* REAL-TIME SOCKET BELL NOTIFICATION BUTTON */}
                <div className="relative">
                    <button 
                        onClick={() => setNotifOpen(!notifOpen)}
                        className={` flex items-center justify-center transition-all relative shadow-xs ${
                            notifOpen 
                                ? 'text-[#CA0410] font-thin'
                                : 'bg-white text-black hover:text-[#CA0410]'
                        }`}
                        title="Live Realtime Notifications"
                    >
                       <FiBell className="text-[26px] stroke-[1.5]" />

{unreadCount > 0 && (
    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
)}
                    </button>

                    {/* REAL-TIME NOTIFICATION DROPDOWN */}
                    {notifOpen && (
                        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-rose-200/90 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
                            
                            {/* Header */}
                            <div className="px-4 py-3 bg-gradient-to-r from-[#CA0410] to-[#a8030d] text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-sm text-white">Live Notifications</h3>
                                    <span className="text-[10px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-md uppercase tracking-wider border border-white/30 flex items-center gap-1.5 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> LIVE
                                    </span>
                                </div>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={handleMarkAllRead}
                                        className="px-2.5 py-1 text-xs text-white bg-black/20 hover:bg-black/30 rounded-lg transition-colors flex items-center gap-1 font-bold cursor-pointer"
                                        title="Mark all as read"
                                    >
                                        <FiCheck size={14} />
                                        <span className="text-[10px] font-bold">Read All</span>
                                    </button>
                                )}
                            </div>

                            {/* Grid Filter Tabs */}
                            <div className="grid grid-cols-5 gap-1 px-2 py-1.5 bg-[#FFF8F8] border-b border-rose-100">
                                {[
                                    { id: 'ALL', label: 'All', count: unreadCategoryCounts.ALL },
                                    { id: 'MEMBER', label: 'Members', count: unreadCategoryCounts.MEMBER },
                                    { id: 'LEAD', label: 'Leads', count: unreadCategoryCounts.LEAD },
                                    { id: 'ATTENDANCE', label: 'Attendance', count: unreadCategoryCounts.ATTENDANCE },
                                    { id: 'MEMBERSHIP', label: 'Plans', count: unreadCategoryCounts.MEMBERSHIP }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveFilter(tab.id)}
                                        className={`py-1 px-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                            activeFilter === tab.id 
                                                ? 'bg-[#CA0410] text-white shadow-2xs' 
                                                : 'text-slate-600 hover:bg-rose-100/60'
                                        }`}
                                    >
                                        <span className="truncate">{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span className={`px-1 py-0.2 text-[8px] font-black rounded-full leading-none ${
                                                activeFilter === tab.id 
                                                    ? 'bg-white text-[#CA0410]' 
                                                    : 'bg-rose-100 text-[#CA0410]'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Notification List */}
                            <div className="flex-1 overflow-y-auto divide-y divide-rose-50 p-1.5 space-y-1 max-h-[340px] custom-scrollbar">
                                {filteredLogsList.length === 0 ? (
                                    <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                                        <FiBell size={28} className="mb-2 text-rose-300" />
                                        <p className="text-xs font-bold text-slate-700">No new notifications</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Live events via Socket.io will pop up here instantly.</p>
                                    </div>
                                ) : (
                                    filteredLogsList.slice(0, 20).map(log => {
                                        const timeAgo = formatTimeAgo(log.createdAt);
                                        return (
                                            <div 
                                                key={log._id}
                                                onClick={() => handleNotificationClick(log)}
                                                className={`p-2.5 transition-colors flex items-start gap-2.5 cursor-pointer rounded-xl ${
                                                    !log.isRead 
                                                        ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-3 border-[#CA0410]' 
                                                        : 'bg-white hover:bg-slate-50'
                                                }`}
                                            >
                                                {getLogIcon(log.type)}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {!log.isRead && (
                                                            <span className="w-2 h-2 rounded-full bg-[#CA0410] inline-block shrink-0 animate-pulse" title="Unread"></span>
                                                        )}
                                                        <h4 className={`text-xs ${
                                                            !log.isRead ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'
                                                        }`}>
                                                            {log.title}
                                                        </h4>
                                                        <span className="text-[10px] font-medium text-slate-400">· {timeAgo}</span>
                                                    </div>

                                                    <p className={`text-xs mt-0.5 leading-snug truncate ${
                                                        !log.isRead ? 'font-semibold text-slate-800' : 'font-normal text-slate-500'
                                                    }`}>
                                                        {log.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 bg-[#FFF8F8] border-t border-rose-100 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                                        <span className="w-2 h-2 rounded-full bg-[#CA0410] animate-pulse"></span>
                                        Live updates
                                    </span>
                                    <span className="text-slate-400">Auto-expires after 30 days</span>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        setViewAllModalOpen(true);
                                        setNotifOpen(false);
                                    }}
                                    className="w-full py-2 bg-[#CA0410] hover:bg-[#a8030d] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-sm cursor-pointer"
                                >
                                    <span>View All Activity (30 Days)</span>
                                    <FiExternalLink size={13} />
                                </button>
                            </div>

                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 cursor-pointer" title={user?.name || user?.email}>
                    <div className="w-11 h-11 rounded-full bg-[#CA0410] text-white font-bold text-xl flex items-center justify-center shadow-sm shrink-0">
                        {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
                    </div>
                    <div className="flex items-center gap-1.5 mr-4">
                        <p className="text-black text-base font-semibold">Welcome, {user?.name || 'User'}</p>
                        <FaAngleDown className="text-black text-base" />
                    </div>
                </div>
            </div>
        </header>
    );
}

export default GymNavbar;
