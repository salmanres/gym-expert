import React from 'react';
import { FiActivity, FiSearch } from 'react-icons/fi';
import AppModal from '../form/AppModal';
import { formatDate } from '../../utils/dateUtils';

function ActivityLogModal({ 
    viewAllModalOpen, 
    setViewAllModalOpen, 
    modalSearch, 
    setModalSearch, 
    modalCategory, 
    setModalCategory, 
    modalFilteredLogs, 
    handleNotificationClick, 
    getLogIcon, 
    formatTimeAgo 
}) {
    return (
        <AppModal
            isOpen={viewAllModalOpen}
            onClose={() => setViewAllModalOpen(false)}
            title="Full Activity Log"
            subtitle="Historical logs from the last 30 days (Auto-cleared after 30 days)"
            icon={FiActivity}
            maxWidth="sm:max-w-3xl"
            headerBg="bg-slate-900"
            headerTextColor="text-white"
            footer={
                <div className="flex items-center justify-between w-full text-xs font-bold text-slate-500">
                    <span>Showing {modalFilteredLogs.length} activity records</span>
                    <button 
                        onClick={() => setViewAllModalOpen(false)}
                        className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                    >
                        Close
                    </button>
                </div>
            }
        >
            {/* Search & Category Filter Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4">
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
                        { id: 'MEMBER', label: 'Members' },
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
            <div className="divide-y divide-slate-100 space-y-2">
                {modalFilteredLogs.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                        <FiActivity size={36} className="mb-2 text-slate-300" />
                        <p className="text-sm font-extrabold text-slate-700">No activity logs found</p>
                        <p className="text-xs text-slate-400 mt-1">Logs automatically clear 30 days after creation.</p>
                    </div>
                ) : (
                    modalFilteredLogs.map(log => {
                        const timeAgo = formatTimeAgo(log.createdAt);
                        return (
                            <div 
                                key={log._id}
                                onClick={() => handleNotificationClick(log)}
                                className={`p-3 transition-colors flex items-start gap-3 cursor-pointer rounded-xl ${
                                    !log.isRead 
                                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70' 
                                        : 'bg-white hover:bg-slate-50'
                                }`}
                            >
                                {getLogIcon(log.type)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {!log.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" title="Unread"></span>
                                            )}
                                            <h4 className={`text-xs ${
                                                !log.isRead ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'
                                            }`}>
                                                {log.title}
                                            </h4>
                                            <span className="text-[10px] font-medium text-slate-400">· {timeAgo}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                            {formatDate(log.createdAt)}
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-0.5 leading-snug ${
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
        </AppModal>
    );
}

export default ActivityLogModal;
