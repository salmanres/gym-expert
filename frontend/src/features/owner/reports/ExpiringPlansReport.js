import React from 'react';
import { Link } from 'react-router-dom';
import SummaryCards from '../../../components/page/SummaryCards';
import LineChart from '../../../components/page/LineChart';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiAlertCircle, FiCalendar, FiDollarSign, FiCheckCircle, FiMessageSquare, FiLayers } from 'react-icons/fi';

export default function ExpiringPlansReport({ 
    expiringPlans = [], 
    allActivePlans = [],
    filterBar = null
}) {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiring30 = allActivePlans.filter(p => p.endDate && new Date(p.endDate) >= today && new Date(p.endDate) <= thirtyDaysLater);
    const expiring7 = allActivePlans.filter(p => p.endDate && new Date(p.endDate) >= today && new Date(p.endDate) <= sevenDaysLater);
    
    const renewedThisMonth = allActivePlans.filter(p => {
        const d = new Date(p.startDate || p.createdAt);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });

    const totalExpiringVal = expiringPlans.reduce((sum, p) => sum + (Number(p.finalPrice || p.originalPrice || p.totalAmount) || 0), 0);

    const cards = [
        { title: 'Critical Expiring (Next 7 Days)', value: `${expiring7.length} Plans`, icon: <FiAlertCircle />, textColor: 'text-rose-600', valueColor: 'text-rose-600', bgClass: 'bg-rose-50', iconColor: 'text-rose-600' },
        { title: 'Expiring Soon (Next 30 Days)', value: `${expiring30.length} Plans`, icon: <FiCalendar />, textColor: 'text-amber-600', valueColor: 'text-amber-600', bgClass: 'bg-amber-50', iconColor: 'text-amber-600' },
        { title: 'Estimated Renewal Value', value: `₹${totalExpiringVal.toLocaleString()}`, icon: <FiDollarSign />, textColor: 'text-indigo-600', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' },
        { title: 'Renewed This Month', value: `${renewedThisMonth.length} Plans`, icon: <FiCheckCircle />, textColor: 'text-emerald-600', valueColor: 'text-emerald-600', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-600' }
    ];

    // Build Expiring Plans 7-Day Expiration Forecast Line Chart Points
    const chartPoints = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const dayExpiringCount = allActivePlans.filter(p => {
            if (!p.endDate) return false;
            const pDateStr = new Date(p.endDate).toISOString().split('T')[0];
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

    // Calculate Plan-Wise Grouping Breakdown
    const planBreakdownMap = {};
    expiringPlans.forEach(p => {
        const planName = p.membershipPlanId?.name || p.planName || 'Standard Plan';
        const price = Number(p.finalPrice || p.originalPrice || p.totalAmount) || 0;

        if (!planBreakdownMap[planName]) {
            planBreakdownMap[planName] = { name: planName, count: 0, totalValue: 0 };
        }
        planBreakdownMap[planName].count += 1;
        planBreakdownMap[planName].totalValue += price;
    });

    const planBreakdownList = Object.values(planBreakdownMap)
        .sort((a, b) => b.totalValue - a.totalValue);

    const columns = [
        { label: 'Member ID' },
        { label: 'Member Name' },
        { label: 'Contact Number' },
        { label: 'Membership Plan' },
        { label: 'Start Date' },
        { label: 'Expiry Date' },
        { label: 'Days Left' },
        { label: 'Renewal Amount' },
        { label: 'Assigned Trainer' },
        { label: 'Status' },
        { label: 'Actions' }
    ];

    const renderRow = (p) => {
        const endDate = new Date(p.endDate);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const memberCustomId = p.memberId?.memberId || 'N/A';
        const memberName = p.memberId?.firstName ? `${p.memberId.firstName} ${p.memberId.lastName || ''}`.trim() : 'Gym Member';
        const phone = p.memberId?.contactNumber || 'N/A';
        const planName = p.membershipPlanId?.name || p.planName || 'Standard Plan';
        const startDateStr = p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A';
        const expiryDateStr = p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A';
        const renewalAmount = p.finalPrice || p.originalPrice || 0;
        const trainerName = p.assignedTrainer?.name || p.assignedBy?.name || 'General Trainer';
        const statusLabel = daysLeft <= 0 ? 'Expired' : daysLeft <= 7 ? 'Critical' : 'Active';

        return (
            <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-xs font-mono font-bold text-slate-700">
                    {memberCustomId}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                    {memberName}
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                    {phone}
                </td>
                <td className="py-3 px-4 font-medium text-slate-600 text-xs">
                    {planName}
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-500">
                    {startDateStr}
                </td>
                <td className="py-3 px-4 text-xs font-bold text-rose-600">
                    {expiryDateStr}
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                        daysLeft <= 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        daysLeft <= 7 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft} Days`}
                    </span>
                </td>
                <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                    ₹{Number(renewalAmount).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-600">
                    {trainerName}
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded uppercase ${
                        statusLabel === 'Critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        statusLabel === 'Expired' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                        {statusLabel}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                        {/* WhatsApp Reminder Button */}
                        <button
                            onClick={() => sendWhatsAppReminder(p.memberId, planName, expiryDateStr)}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            title="Send WhatsApp Renewal Reminder"
                        >
                            <FiMessageSquare className="text-sm" />
                        </button>

                        <Link 
                            to="/dashboard/owner/finance/collect" 
                            state={{ autoOpenMember: p.memberId }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap"
                        >
                            Renew / Collect
                        </Link>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* 1. App Theme Summary Cards */}
            <div className="px-4 pt-3">
                <SummaryCards cards={cards} />
            </div>

            {/* 2. Half Half Grid (50% Expiration Forecast Chart / 50% Membership Plans Breakdown Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch px-4">
                {/* Left 50%: 7-Day Forecast Line Chart */}
                <div className="w-full">
                    <LineChart 
                        title="Plan Expirations Forecast (Next 7 Days)"
                        subtitle="Daily plan expiration schedule to manage proactive member renewals."
                        points={chartPoints}
                        color="#f59e0b"
                    />
                </div>

                {/* Right 50%: Membership Plan-Wise Breakdown Table */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
                    <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                            <div>
                                <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-1.5">
                                    <FiLayers className="text-amber-500 text-sm" />
                                    EXPIRING PLANS BY CATEGORY
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                    Membership plan-wise distribution of upcoming renewals
                                </p>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded border border-amber-200">
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

            {/* 3. FilterBar Component AFTER Chart & Plans Breakdown Table */}
            {filterBar}

            {/* 4. Full Data Table */}
            <div className="px-4 pb-4">
                {expiringPlans.length > 0 ? (
                    <DataTable columns={columns} data={expiringPlans} renderRow={renderRow} />
                ) : (
                    <EmptyState 
                        icon={<FiCalendar size={48} />} 
                        title="No plans expiring soon" 
                        subtitle="All active memberships are up to date." 
                    />
                )}
            </div>
        </div>
    );
}
