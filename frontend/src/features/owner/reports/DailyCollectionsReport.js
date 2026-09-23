import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import LineChart from '../../../components/page/LineChart';
import { FiDollarSign, FiCalendar, FiPieChart, FiTrendingUp, FiCreditCard, FiCheckCircle, FiClock, FiEye, FiAlertCircle } from 'react-icons/fi';
import { formatDate } from '../../../utils/dateUtils';

export default function DailyCollectionsReport({ 
    transactions = [], 
    summaryMetrics = {}, 
    feeReceivedLinePoints = [],
    loading = false
}) {
    const { 
        todayCollection = 0, 
        monthlyCollection = 0, 
        yearlyCollection = 0, 
        totalOutstandingDue = 0 
    } = summaryMetrics;

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

    // Payment Mode Breakdown Calculations
    const cashTxs = transactions.filter(t => (t.paymentMode || '').toLowerCase() === 'cash');
    const upiTxs = transactions.filter(t => (t.paymentMode || '').toLowerCase() === 'upi');
    const cardOrOtherTxs = transactions.filter(t => (t.paymentMode || '').toLowerCase() !== 'cash' && (t.paymentMode || '').toLowerCase() !== 'upi');

    const cashTotal = cashTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const upiTotal = upiTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const cardOrOtherTotal = cardOrOtherTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const totalCollectedInView = cashTotal + upiTotal + cardOrOtherTotal;
    const getPercent = (amt) => totalCollectedInView > 0 ? Math.round((amt / totalCollectedInView) * 100) : 0;

    // Plan-Wise Sales Breakdown Calculation
    const planSalesMap = {};
    transactions.forEach(t => {
        const planName = t.planId?.name || t.planName || 'General Membership';
        const amt = Number(t.amountPaid) || 0;
        if (!planSalesMap[planName]) {
            planSalesMap[planName] = { count: 0, amount: 0 };
        }
        planSalesMap[planName].count += 1;
        planSalesMap[planName].amount += amt;
    });

    // Clean App Theme Summary Cards (6 items)
    const cards = [
        { 
            title: "Today's Collection", 
            value: `₹${Math.round(todayCollection).toLocaleString()}`, 
            icon: <FiDollarSign />, 
            subtitle: 'Collected today', 
            bgClass: 'bg-[#E8F5E9]', 
            iconColor: 'text-[#2E7D32]' 
        },
        { 
            title: 'Monthly Collection', 
            value: `₹${Math.round(monthlyCollection).toLocaleString()}`, 
            icon: <FiCalendar />, 
            subtitle: 'Current month', 
            bgClass: 'bg-[#FFECEC]', 
            iconColor: 'text-[#E53935]' 
        },
        { 
            title: 'Outstanding Due', 
            value: `₹${Math.round(totalOutstandingDue).toLocaleString()}`, 
            icon: <FiAlertCircle />, 
            subtitle: 'Uncollected balance', 
            bgClass: 'bg-[#FFF3E0]', 
            iconColor: 'text-[#EA580C]' 
        },
        { 
            title: 'Total Tracked', 
            value: `₹${Math.round(cashTotal + upiTotal + cardOrOtherTotal).toLocaleString()}`, 
            icon: <FiPieChart />, 
            subtitle: `${transactions.length} receipts in view`, 
            bgClass: 'bg-[#F3E8FF]', 
            iconColor: 'text-[#7E22CE]' 
        }
    ];

    const totalItems = transactions.length;
    const paginatedTransactions = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = [
        { label: 'RECEIPT NO', className: 'w-[16%] pl-4 pr-3' },
        { label: 'MEMBER', className: 'w-[24%] px-3' },
        { label: 'MEMBERSHIP PLAN', className: 'w-[16%] px-3' },
        { label: 'AMOUNT', className: 'w-[12%] px-3' },
        { label: 'PAYMENT MODE', className: 'w-[12%] px-3' },
        { label: 'STATUS', className: 'w-[10%] px-2 text-center' },
        { label: 'ACTIONS', className: 'w-[10%] pr-4 pl-1 text-center' }
    ];

    const renderRow = (tx, index) => {
        const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
        const activeUserName = loggedInUser.name || 'Harjeet';
        const memberObjId = tx.memberId?._id || (typeof tx.memberId === 'string' ? tx.memberId : null);
        const receiptNo = tx.transactionId || `REC-${(tx._id || '').substring(0, 6).toUpperCase()}`;
        const memberCustomId = tx.memberId?.memberId || 'N/A';
        const memberName = tx.memberName || (tx.memberId?.firstName ? `${tx.memberId.firstName} ${tx.memberId.lastName || ''}`.trim() : tx.memberId?.name) || 'Gym Member';
        const planName = tx.planId?.name || tx.planName || 'Membership Payment';
        const status = tx.paymentStatus || 'Paid';
        const collectedBy = tx.collectedBy?.name || (typeof tx.collectedBy === 'string' ? tx.collectedBy : null) || tx.collectedByName || activeUserName;

        return (
            <tr key={tx._id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100 last:border-b-0">
                {/* RECEIPT NO */}
                <td className="py-2.5 pl-4 pr-3 align-middle">
                    <div className="flex flex-col text-[11.5px] leading-tight">
                        <span className="font-mono font-bold text-slate-800 text-[12.5px]">
                            {receiptNo}
                        </span>
                        <span className="text-slate-500 font-normal text-[11px] mt-0.5">
                            {formatDate(tx.paymentDate || tx.createdAt)}
                        </span>
                    </div>
                </td>

                {/* MEMBER */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-2xs">
                            {(memberName || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 text-[13.5px] leading-tight truncate">
                                {memberName}
                            </span>
                            <span className="text-[11.5px] text-slate-500 font-normal mt-0.5 leading-tight">
                                ID: <span className="font-bold text-slate-700">{memberCustomId}</span> • By: {collectedBy}
                            </span>
                        </div>
                    </div>
                </td>

                {/* MEMBERSHIP PLAN */}
                <td className="py-2.5 px-3 align-middle">
                    <span className="font-bold text-slate-900 text-[12.5px]">
                        {planName}
                    </span>
                </td>

                {/* AMOUNT */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1 font-bold text-emerald-600 text-[14px]">
                        <span>₹</span>
                        <span>{Number(tx.amountPaid || 0).toLocaleString()}</span>
                    </div>
                </td>

                {/* PAYMENT MODE */}
                <td className="py-2.5 px-3 align-middle">
                    <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-md uppercase border ${
                        (tx.paymentMode || '').toLowerCase() === 'cash' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        (tx.paymentMode || '').toLowerCase() === 'upi' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                        {tx.paymentMode || 'Cash'}
                    </span>
                </td>

                {/* STATUS */}
                <td className="py-2.5 px-2 text-center align-middle">
                    <span className={`inline-flex items-center justify-center text-[12.5px] font-bold rounded-lg px-3.5 py-1.5 border leading-none shadow-2xs ${
                        status === 'Paid' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                        status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {status}
                    </span>
                </td>

                {/* ACTIONS */}
                <td className="py-2.5 pr-4 pl-1 text-center align-middle">
                    <div className="flex items-center justify-center">
                        {memberObjId ? (
                            <Link 
                                to={`/dashboard/owner/finance/receipt/${memberObjId}`}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="View Receipt"
                            >
                                <FiEye size={15} />
                            </Link>
                        ) : (
                            <span className="text-xs text-slate-400 font-medium">-</span>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-4 w-full m-0 p-0">
            {/* 1. Side-by-Side Chart and Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch px-6 md:px-8">
                {/* Left Side: Fee Received 1-Week Trend Line Chart */}
                <div className="lg:col-span-2">
                    <LineChart 
                        title="Fee Received (1-Week Trend)"
                        subtitle="Daily collections overview for the last 7 days"
                        points={feeReceivedLinePoints}
                        color="#10b981"
                    />
                </div>

                {/* Right Side: App Theme PAYMENT BREAKDOWN Card */}
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase">
                                    PAYMENT BREAKDOWN
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                    Cash, UPI & Card collections
                                </p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                <FiPieChart className="text-base" />
                            </div>
                        </div>

                        <div className="space-y-5 my-3">
                            {/* Cash Received */}
                            <div>
                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                    <span className="flex items-center gap-1.5 text-slate-700">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                                        Cash Received
                                    </span>
                                    <span className="text-slate-900 font-extrabold">₹{cashTotal.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        style={{ width: `${getPercent(cashTotal)}%` }} 
                                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                    ></div>
                                </div>
                            </div>

                            {/* UPI Payments */}
                            <div>
                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                    <span className="flex items-center gap-1.5 text-slate-700">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                                        UPI Payments
                                    </span>
                                    <span className="text-slate-900 font-extrabold">₹{upiTotal.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        style={{ width: `${getPercent(upiTotal)}%` }} 
                                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                    ></div>
                                </div>
                            </div>

                            {/* Card / Other Payments */}
                            <div>
                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                    <span className="flex items-center gap-1.5 text-slate-700">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
                                        Card & Other
                                    </span>
                                    <span className="text-slate-900 font-extrabold">₹{cardOrOtherTotal.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        style={{ width: `${getPercent(cardOrOtherTotal)}%` }} 
                                        className="bg-purple-600 h-full rounded-full transition-all duration-300"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Total Tracked Collections</span>
                        <span className="text-slate-900 font-extrabold text-sm">₹{totalCollectedInView.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* 3. Plan-Wise Sales Summary Grid */}
            <div className="px-6 md:px-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase">
                                PLAN-WISE SALES BREAKDOWN
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                Real-time volume and revenue generated across membership plans
                            </p>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                            {Object.keys(planSalesMap).length} Active Plans Sold
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(planSalesMap).map(([name, data], idx) => (
                            <div key={idx} className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-xs font-bold text-slate-700 mb-1">{name}</span>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{data.count} Sales</span>
                                    <span className="text-sm font-black text-emerald-600">₹{data.amount.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. App Theme Data Table */}
            <div className="px-6 md:px-8 pb-6 pt-1">
                <DataTable 
                    columns={columns} 
                    data={paginatedTransactions} 
                    loading={loading}
                    emptyMessage="No collection records found."
                    renderRow={renderRow} 
                    darkHeader={false}
                    pagination={{
                        currentPage: currentPage,
                        totalItems: totalItems,
                        pageSize: pageSize,
                        onPageChange: (p) => setCurrentPage(p),
                        onPageSizeChange: (s) => setPageSize(s),
                        itemLabel: "transactions"
                    }}
                />
            </div>
        </div>
    );
}
