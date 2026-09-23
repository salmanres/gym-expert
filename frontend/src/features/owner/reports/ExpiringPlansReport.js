import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import LineChart from '../../../components/page/LineChart';
import { FiCalendar, FiAlertCircle, FiPhone, FiCreditCard, FiTrendingUp, FiRefreshCw, FiCheckCircle, FiDollarSign, FiMessageSquare } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { formatDate, toInputDateFormat } from '../../../utils/dateUtils';

export default function ExpiringPlansReport({ 
    expiringPlans = [], 
    allActivePlans = [],
    loading = false
}) {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const expiring30 = allActivePlans.filter(p => p.endDate && new Date(p.endDate) >= today && new Date(p.endDate) <= thirtyDaysLater);
    const expiring7 = allActivePlans.filter(p => p.endDate && new Date(p.endDate) >= today && new Date(p.endDate) <= sevenDaysLater);
    
    const renewedThisMonth = allActivePlans.filter(p => {
        const d = new Date(p.startDate || p.createdAt);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });

    const totalExpiringVal = expiringPlans.reduce((sum, p) => sum + (Number(p.finalPrice || p.originalPrice || p.totalAmount) || 0), 0);

    const cards = [
        { 
            title: 'Critical (7 Days)', 
            value: `${expiring7.length} Plans`, 
            percentage: 'Critical',
            percentageColor: 'text-rose-600',
            icon: <FiAlertCircle />, 
            subtitle: 'Immediate renewal', 
            bgClass: 'bg-[#FFECEC]', 
            iconColor: 'text-[#E53935]' 
        },
        { 
            title: 'Expiring (30 Days)', 
            value: `${expiring30.length} Plans`, 
            percentage: 'Upcoming',
            percentageColor: 'text-amber-600',
            icon: <FiCalendar />, 
            subtitle: 'In next 30 days', 
            bgClass: 'bg-[#FFF3E0]', 
            iconColor: 'text-[#EA580C]' 
        },
        { 
            title: 'Renewal Pipeline', 
            value: `₹${Math.round(totalExpiringVal).toLocaleString()}`, 
            percentage: 'Revenue',
            percentageColor: 'text-emerald-600',
            icon: <FiDollarSign />, 
            subtitle: 'Estimated value', 
            bgClass: 'bg-[#E8F5E9]', 
            iconColor: 'text-[#2E7D32]' 
        },
        { 
            title: 'Renewed This Month', 
            value: `${renewedThisMonth.length} Plans`, 
            percentage: 'Renewed',
            percentageColor: 'text-purple-600',
            icon: <FiCheckCircle />, 
            subtitle: 'Current month', 
            bgClass: 'bg-[#F3E8FF]', 
            iconColor: 'text-[#7E22CE]' 
        }
    ];

    // Build Expiring Plans 7-Day Expiration Forecast Line Chart Points
    const chartPoints = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const dateStr = toInputDateFormat(d);
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const dayExpiringCount = allActivePlans.filter(p => {
            if (!p.endDate) return false;
            const pDateStr = toInputDateFormat(p.endDate);
            return pDateStr === dateStr;
        }).length;

        chartPoints.push({ label: dayLabel, value: dayExpiringCount });
    }

    // Helper to send WhatsApp reminder message
    const sendWhatsAppReminder = (memberObj, planName, expiryDate) => {
        const phone = memberObj?.contactNumber || '';
        const cleanPhone = phone.replace(/\D/g, '');
        const name = memberObj?.firstName ? `${memberObj.firstName} ${memberObj.lastName || ''}`.trim() : 'Gym Member';
        const text = encodeURIComponent(`Hi ${name}, your ${planName} gym membership at Fitness With Harjeet expires on ${expiryDate}. Please renew to continue uninterrupted workouts! 😊`);
        if (cleanPhone) {
            window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
        } else {
            alert('Phone number not available for this member.');
        }
    };

    const sendBulkReminders = (daysFilter = 7) => {
        const targetPlans = expiringPlans.filter(p => {
            const endDate = new Date(p.paidUntilDate || p.endDate);
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            return daysLeft >= 0 && daysLeft <= daysFilter;
        });

        if (targetPlans.length === 0) {
            alert(`No members expiring in the next ${daysFilter} days.`);
            return;
        }

        if (window.confirm(`Send WhatsApp renewal reminder to ${targetPlans.length} members expiring in the next ${daysFilter} days?`)) {
            targetPlans.forEach((p, idx) => {
                setTimeout(() => {
                    const planName = p.membershipPlanId?.name || p.planName || 'General Plan';
                    const expDateStr = formatDate(p.paidUntilDate || p.endDate);
                    sendWhatsAppReminder(p.memberId, planName, expDateStr);
                }, idx * 1200);
            });
        }
    };

    // Calculate Plan-Wise Grouping Breakdown
    const planBreakdownMap = {};
    expiringPlans.forEach(p => {
        const planName = p.membershipPlanId?.name || p.planName || 'General Plan';
        const price = Number(p.finalPrice || p.originalPrice || p.totalAmount) || 0;

        if (!planBreakdownMap[planName]) {
            planBreakdownMap[planName] = { name: planName, count: 0, totalValue: 0 };
        }
        planBreakdownMap[planName].count += 1;
        planBreakdownMap[planName].totalValue += price;
    });

    const planBreakdownList = Object.values(planBreakdownMap)
        .sort((a, b) => b.totalValue - a.totalValue);

    const avatarStyles = [
        { bg: 'bg-[#FFECEC]', text: 'text-[#E53935]' },
        { bg: 'bg-[#FFF9C4]', text: 'text-[#F57F17]' },
        { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]' },
        { bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        { bg: 'bg-[#F3E8FF]', text: 'text-[#7E22CE]' },
        { bg: 'bg-[#FFEDD5]', text: 'text-[#EA580C]' },
    ];

    const getAvatarStyle = (name, index) => {
        const charCode = (name || '').charCodeAt(0) || 0;
        return avatarStyles[(charCode + index) % avatarStyles.length];
    };

    const totalItems = expiringPlans.length;
    const paginatedExpiringPlans = expiringPlans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = [
        { label: 'MEMBER', className: 'w-[24%] pl-4 pr-3' },
        { label: 'CONTACT', className: 'w-[14%] px-3' },
        { label: 'MEMBERSHIP PLAN', className: 'w-[18%] px-3' },
        { label: 'EXPIRY & DAYS LEFT', className: 'w-[18%] px-3' },
        { label: 'RENEWAL AMOUNT', className: 'w-[12%] px-3' },
        { label: 'STATUS', className: 'w-[8%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[6%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (p, index) => {
        const relevantEndDateStr = p.paidUntilDate || p.endDate;
        const endDate = new Date(relevantEndDateStr);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const memberCustomId = p.memberId?.memberId || 'N/A';
        const memberName = p.memberId?.firstName ? `${p.memberId.firstName} ${p.memberId.lastName || ''}`.trim() : 'Gym Member';
        const phone = p.memberId?.contactNumber || 'N/A';
        const planName = p.membershipPlanId?.name || p.planName || 'General Plan';
        const expiryDateStr = formatDate(relevantEndDateStr, 'N/A');
        const renewalAmount = p.finalPrice || p.originalPrice || 0;
        const trainerName = p.assignedTrainer?.name || p.assignedBy?.name || null;
        const statusLabel = daysLeft <= 0 ? 'Expired' : daysLeft <= 7 ? 'Critical' : 'Active';

        return (
            <tr key={p._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                {/* MEMBER */}
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                            {(memberName || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 text-[13.5px] leading-tight truncate">
                                {memberName}
                            </span>
                            <span className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                ID: <span className="font-bold text-slate-700">{memberCustomId}</span> {trainerName ? `• Trainer: ${trainerName}` : ''}
                            </span>
                        </div>
                    </div>
                </td>

                {/* CONTACT */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[12.5px] tracking-tight">
                        <FiPhone className="text-slate-400 text-xs shrink-0" />
                        <span>{phone}</span>
                    </div>
                </td>

                {/* PLAN */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-tight">
                        <span className="font-bold text-slate-900 text-[12.5px]">{planName}</span>
                        {p.startDate && (
                            <span className="text-slate-500 font-normal text-[11px]">
                                Started: {formatDate(p.startDate)}
                            </span>
                        )}
                    </div>
                </td>

                {/* EXPIRY & DAYS LEFT */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-tight">
                        <div className="flex items-center gap-1 font-bold text-[#CA0410]">
                            <FiCalendar className="text-xs shrink-0" />
                            <span>{expiryDateStr}</span>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold w-max border ${
                            daysLeft <= 0 ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            daysLeft <= 7 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                            {daysLeft <= 0 ? 'Expired' : `${daysLeft} Days Left`}
                        </span>
                    </div>
                </td>

                {/* RENEWAL AMOUNT */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-emerald-600 text-[14px]">
                        <span>₹</span>
                        <span>{Number(renewalAmount).toLocaleString()}</span>
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        statusLabel === 'Critical' ? 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]' :
                        statusLabel === 'Expired' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                        'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                    }`}>
                        {statusLabel}
                    </span>
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                        {/* WhatsApp Reminder Button */}
                        <button
                            onClick={() => sendWhatsAppReminder(p.memberId, planName, expiryDateStr)}
                            className="w-8 h-8 rounded-lg border border-emerald-200 text-[#22C55E] bg-white hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Send WhatsApp Renewal Reminder"
                        >
                            <FaWhatsapp size={15} />
                        </button>

                        <Link 
                            to="/dashboard/owner/finance/collect" 
                            state={{ autoOpenMember: p.memberId }}
                            className="w-8 h-8 rounded-lg border border-indigo-200 text-indigo-600 bg-white hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Renew / Collect Payment"
                        >
                            <FiCheckCircle size={15} />
                        </Link>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* Quick Auto WhatsApp Trigger Bar */}
            <div className="px-6 md:px-8 pt-2 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Quick Reminders:</span>
                    <button 
                        onClick={() => sendBulkReminders(3)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                        <FiMessageSquare size={13} /> 🚨 Bulk 3-Day WhatsApp Alert
                    </button>
                    <button 
                        onClick={() => sendBulkReminders(7)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                        <FiMessageSquare size={13} /> 📲 Bulk 7-Day WhatsApp Alert
                    </button>
                </div>
            </div>

            {/* 1. Side-by-Side 7-Day Line Forecast & Plan Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch px-6 md:px-8">
                {/* Left Side: 7-Day Expiry Forecast Line Chart */}
                <div className="lg:col-span-2">
                    <LineChart 
                        title="Expiring Plans (Next 7-Days Forecast)"
                        subtitle="Expected membership expirations daily projection"
                        points={chartPoints}
                        color="#f59e0b"
                    />
                </div>

                {/* Right Side: Plan-Wise Grouping Breakdown Card */}
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase">
                                    EXPIRING PLANS BY CATEGORY
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                    Membership plan-wise distribution of upcoming renewals
                                </p>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                                {planBreakdownList.length} Categories
                            </span>
                        </div>

                        {planBreakdownList.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                                            <th className="py-2 px-2">Plan Name</th>
                                            <th className="py-2 px-2 text-center">Expiring Plans</th>
                                            <th className="py-2 px-2 text-right">Estimated Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {planBreakdownList.map((planItem, idx) => {
                                            const percent = totalExpiringVal > 0 ? Math.round((planItem.totalValue / totalExpiringVal) * 100) : 0;
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 text-xs">
                                                    <td className="py-2.5 px-2 font-bold text-slate-800">
                                                        <div>
                                                            <span>{planItem.name}</span>
                                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 max-w-[140px]">
                                                                <div 
                                                                    style={{ width: `${percent}%` }} 
                                                                    className="bg-amber-500 h-full rounded-full"
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center">
                                                        <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                                            {planItem.count} {planItem.count === 1 ? 'Plan' : 'Plans'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right font-extrabold text-emerald-600">
                                                        ₹{planItem.totalValue.toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 py-6 text-center font-medium">No expiring plan categories found.</p>
                        )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Total Renewal Revenue Risk</span>
                        <span className="font-extrabold text-amber-600 text-sm">
                            ₹{totalExpiringVal.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Full Data Table */}
            <div className="px-6 md:px-8 pb-6 pt-1">
                <DataTable 
                    columns={columns} 
                    data={paginatedExpiringPlans} 
                    loading={loading}
                    emptyMessage="No plans expiring soon."
                    renderRow={renderRow} 
                    pagination={{
                        currentPage: currentPage,
                        totalItems: totalItems,
                        pageSize: pageSize,
                        onPageChange: (p) => setCurrentPage(p),
                        onPageSizeChange: (s) => setPageSize(s),
                        itemLabel: "expiring plans"
                    }}
                />
            </div>
        </div>
    );
}
