import React from 'react';
import { Link } from 'react-router-dom';
import SummaryCards from '../../../components/page/SummaryCards';
import LineChart from '../../../components/page/LineChart';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiUsers, FiDollarSign, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';

export default function PendingDuesReport({ 
    pendingDues = [],
    filterBar = null
}) {
    const totalPendingDuesAmount = pendingDues.reduce((sum, p) => sum + (Number(p.pendingAmount || p.balanceAmount) || 0), 0);
    const avgPending = pendingDues.length ? Math.round(totalPendingDuesAmount / pendingDues.length) : 0;

    const cards = [
        { title: 'Total Defaulters', value: `${pendingDues.length} Members`, icon: <FiUsers />, textColor: 'text-rose-500', valueColor: 'text-rose-600', bgClass: 'bg-rose-50', iconColor: 'text-rose-600' },
        { title: 'Total Dues Outstanding', value: `₹${totalPendingDuesAmount.toLocaleString()}`, icon: <FiDollarSign />, textColor: 'text-slate-500', valueColor: 'text-slate-800', bgClass: 'bg-slate-100', iconColor: 'text-slate-700' },
        { title: 'Average Due Per Member', value: `₹${avgPending.toLocaleString()}`, icon: <FiTrendingUp />, textColor: 'text-indigo-500', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' }
    ];

    // Build Pending Dues Chart Points
    const today = new Date();
    const chartPoints = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const dayDues = pendingDues.filter(p => {
            const pDateStr = new Date(p.createdAt || p.startDate).toISOString().split('T')[0];
            return pDateStr === dateStr;
        }).reduce((sum, p) => sum + (Number(p.pendingAmount || p.balanceAmount) || 0), 0);

        chartPoints.push({ label: dayLabel, value: dayDues });
    }

    const columns = [
        { label: 'Member ID' },
        { label: 'Member Name' },
        { label: 'Contact Number' },
        { label: 'Membership Plan' },
        { label: 'Total Amount' },
        { label: 'Amount Paid' },
        { label: 'Pending Dues' },
        { label: 'Payment Status' },
        { label: 'Actions' }
    ];

    const renderRow = (p) => {
        const memberCustomId = p.memberId?.memberId || 'N/A';
        const memberName = p.memberId?.firstName ? `${p.memberId.firstName} ${p.memberId.lastName || ''}`.trim() : 'Gym Member';
        const phone = p.memberId?.contactNumber || 'N/A';
        const planName = p.membershipPlanId?.name || p.planName || 'Standard Plan';
        const totalAmt = p.finalPrice || p.originalPrice || p.totalAmount || 0;
        const paidAmt = p.paidAmount || 0;
        const pendingAmt = p.pendingAmount || p.balanceAmount || 0;
        const status = p.paymentStatus || 'Pending';

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
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                    ₹{Number(totalAmt).toLocaleString()}
                </td>
                <td className="py-3 px-4 font-bold text-emerald-600 text-sm">
                    ₹{Number(paidAmt).toLocaleString()}
                </td>
                <td className="py-3 px-4 font-black text-rose-600 text-sm">
                    ₹{Number(pendingAmt).toLocaleString()}
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded uppercase ${
                        status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                        {status}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <Link 
                        to="/dashboard/owner/finance/collect" 
                        state={{ autoOpenMember: p.memberId }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                        Collect Fee
                    </Link>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            <div className="px-4 pt-3">
                <SummaryCards cards={cards} />
            </div>

            <div className="px-4">
                <LineChart 
                    title="Pending Dues Outstanding Trend"
                    subtitle="Daily outstanding dues accumulation trend to track fee defaults."
                    points={chartPoints}
                    color="#e11d48"
                />
            </div>

            {/* FilterBar Component AFTER Chart */}
            {filterBar}

            {pendingDues.length > 0 ? (
                <DataTable columns={columns} data={pendingDues} renderRow={renderRow} />
            ) : (
                <EmptyState 
                    icon={<FiAlertCircle size={48} />} 
                    title="No pending dues found" 
                    subtitle="Great job! All members are up to date on fee payments." 
                />
            )}
        </div>
    );
}
