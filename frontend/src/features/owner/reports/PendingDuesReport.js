import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryCards from '../../../components/page/SummaryCards';
import LineChart from '../../../components/page/LineChart';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiUsers, FiDollarSign, FiTrendingUp, FiAlertCircle, FiPhone, FiCreditCard } from 'react-icons/fi';

export default function PendingDuesReport({ 
    pendingDues = [],
    filterBar = null
}) {
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const totalPendingDuesAmount = pendingDues.reduce((sum, p) => sum + (Number(p.pendingAmount || p.balanceAmount) || 0), 0);
    const avgPending = pendingDues.length ? Math.round(totalPendingDuesAmount / pendingDues.length) : 0;

    const cards = [
        { title: 'Total Defaulters', value: `${pendingDues.length} Members`, icon: <FiUsers />, textColor: 'text-rose-500', valueColor: 'text-rose-600', bgClass: 'bg-rose-50', iconColor: 'text-rose-600' },
        { title: 'Total Dues Outstanding', value: `₹${Math.round(totalPendingDuesAmount).toLocaleString()}`, icon: <FiDollarSign />, textColor: 'text-slate-500', valueColor: 'text-slate-800', bgClass: 'bg-slate-100', iconColor: 'text-slate-700' },
        { title: 'Average Due Per Member', value: `₹${Math.round(avgPending).toLocaleString()}`, icon: <FiTrendingUp />, textColor: 'text-indigo-500', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' }
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

    const totalItems = pendingDues.length;
    const paginatedPendingDues = pendingDues.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = [
        { label: 'MEMBER', className: 'w-[26%] pl-4 pr-3' },
        { label: 'CONTACT', className: 'w-[14%] px-3' },
        { label: 'MEMBERSHIP PLAN', className: 'w-[18%] px-3' },
        { label: 'TOTAL / PAID', className: 'w-[16%] px-3' },
        { label: 'PENDING DUES', className: 'w-[14%] px-3' },
        { label: 'STATUS', className: 'w-[8%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[6%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (p, index) => {
        const memberCustomId = p.memberId?.memberId || 'N/A';
        const memberName = p.memberId?.firstName ? `${p.memberId.firstName} ${p.memberId.lastName || ''}`.trim() : 'Gym Member';
        const phone = p.memberId?.contactNumber || 'N/A';
        const planName = p.membershipPlanId?.name || p.planName || 'General Plan';
        const totalAmt = p.finalPrice || p.originalPrice || p.totalAmount || 0;
        const paidAmt = p.paidAmount || 0;
        const pendingAmt = p.pendingAmount || p.balanceAmount || 0;
        const status = p.paymentStatus || 'Pending';

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
                                ID: <span className="font-bold text-slate-700">{memberCustomId}</span>
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

                {/* MEMBERSHIP PLAN */}
                <td className="py-2.5 px-3 align-middle">
                    <span className="font-bold text-slate-900 text-[12.5px]">
                        {planName}
                    </span>
                </td>

                {/* TOTAL / PAID */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[11.5px] leading-tight">
                        <span className="text-slate-500 font-normal text-[11px]">Total: ₹{Number(totalAmt).toLocaleString()}</span>
                        <span className="text-emerald-600 font-bold text-[12.5px]">Paid: ₹{Number(paidAmt).toLocaleString()}</span>
                    </div>
                </td>

                {/* PENDING DUES */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-[#CA0410] text-[14px]">
                        <span>₹</span>
                        <span>{Number(pendingAmt).toLocaleString()}</span>
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {status}
                    </span>
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center">
                        <Link 
                            to="/dashboard/owner/finance/collect" 
                            state={{ autoOpenMember: p.memberId }}
                            className="w-8 h-8 rounded-lg border border-emerald-200 text-emerald-600 bg-white hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Collect Fee"
                        >
                            <FiCreditCard size={15} />
                        </Link>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            <div className="px-6 md:px-8 pb-2 pt-0">
                <SummaryCards cards={cards} />
            </div>

            <div className="px-6 md:px-8">
                <LineChart 
                    title="Pending Dues Outstanding Trend"
                    subtitle="Daily outstanding dues accumulation trend to track fee defaults."
                    points={chartPoints}
                    color="#e11d48"
                />
            </div>

            {/* FilterBar Component AFTER Chart */}
            {filterBar}

            <div className="px-6 md:px-8 pb-6 pt-1">
                {pendingDues.length > 0 ? (
                    <DataTable 
                        columns={columns} 
                        data={paginatedPendingDues} 
                        renderRow={renderRow} 
                        pagination={{
                            currentPage: currentPage,
                            totalItems: totalItems,
                            pageSize: pageSize,
                            onPageChange: (p) => setCurrentPage(p),
                            onPageSizeChange: (s) => setPageSize(s),
                            itemLabel: "pending dues"
                        }}
                    />
                ) : (
                    <EmptyState 
                        icon={<FiAlertCircle size={48} />} 
                        title="No pending dues found" 
                        subtitle="Great job! All members are up to date on fee payments." 
                    />
                )}
            </div>
        </div>
    );
}
