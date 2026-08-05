import React from 'react';
import { Link } from 'react-router-dom';
import SummaryCards from '../../../components/page/SummaryCards';
import LineChart from '../../../components/page/LineChart';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiDollarSign, FiCalendar, FiTrendingUp, FiAlertCircle, FiEye, FiPieChart } from 'react-icons/fi';

export default function DailyCollectionsReport({ 
    transactions = [], 
    summaryMetrics = {}, 
    feeReceivedLinePoints = [],
    filterBar = null
}) {
    const { 
        todayCollection = 0, 
        monthlyCollection = 0, 
        yearlyCollection = 0, 
        totalOutstandingDue = 0 
    } = summaryMetrics;

    // Clean App Theme Summary Cards
    const cards = [
        { title: "Today's Collection", value: `₹${todayCollection.toLocaleString()}`, icon: <FiDollarSign />, textColor: 'text-emerald-600', valueColor: 'text-emerald-600', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { title: 'Monthly Collection', value: `₹${monthlyCollection.toLocaleString()}`, icon: <FiCalendar />, textColor: 'text-indigo-600', valueColor: 'text-indigo-600', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-600' },
        { title: 'Yearly Collection', value: `₹${yearlyCollection.toLocaleString()}`, icon: <FiTrendingUp />, textColor: 'text-blue-600', valueColor: 'text-blue-600', bgClass: 'bg-blue-50', iconColor: 'text-blue-600' },
        { title: 'Outstanding Due', value: `₹${totalOutstandingDue.toLocaleString()}`, icon: <FiAlertCircle />, textColor: 'text-rose-600', valueColor: 'text-rose-600', bgClass: 'bg-rose-50', iconColor: 'text-rose-600' }
    ];

    // Payment Mode Breakdown Calculations
    const cashTxs = transactions.filter(t => (t.paymentMode || '').toLowerCase() === 'cash');
    const upiTxs = transactions.filter(t => (t.paymentMode || '').toLowerCase() === 'upi');
    const cardOrOtherTxs = transactions.filter(t => (t.paymentMode || '').toLowerCase() !== 'cash' && (t.paymentMode || '').toLowerCase() !== 'upi');

    const cashTotal = cashTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const upiTotal = upiTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    const cardOrOtherTotal = cardOrOtherTxs.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    const totalCollectedInView = cashTotal + upiTotal + cardOrOtherTotal;

    const getPercent = (amt) => totalCollectedInView > 0 ? Math.round((amt / totalCollectedInView) * 100) : 0;

    const columns = [
        { label: 'Receipt No' },
        { label: 'Member ID' },
        { label: 'Member Name' },
        { label: 'Membership Plan' },
        { label: 'Amount' },
        { label: 'Payment Mode' },
        { label: 'Collected By' },
        { label: 'Status' },
        { label: 'Date' },
        { label: 'View Receipt' }
    ];

    const renderRow = (tx) => {
        const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
        const activeUserName = loggedInUser.name || 'Harjeet';
        const memberObjId = tx.memberId?._id || (typeof tx.memberId === 'string' ? tx.memberId : null);
        const receiptNo = tx.transactionId || `REC-${(tx._id || '').substring(0, 6).toUpperCase()}`;
        const memberCustomId = tx.memberId?.memberId || 'N/A';
        const memberName = tx.memberName || (tx.memberId?.firstName ? `${tx.memberId.firstName} ${tx.memberId.lastName || ''}`.trim() : tx.memberId?.name) || 'Gym Member';
        const planName = tx.planId?.name || tx.planName || 'Standard Plan';
        const status = tx.paymentStatus || 'Paid';
        const collectedBy = tx.collectedBy?.name || (typeof tx.collectedBy === 'string' ? tx.collectedBy : null) || tx.collectedByName || activeUserName;

        return (
            <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-xs font-mono font-bold text-slate-700">
                    {receiptNo}
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                    {memberCustomId}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                    {memberName}
                </td>
                <td className="py-3 px-4 font-medium text-slate-600 text-xs">
                    {planName}
                </td>
                <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                    ₹{Number(tx.amountPaid || 0).toLocaleString()}
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded uppercase ${
                        (tx.paymentMode || '').toLowerCase() === 'cash' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        (tx.paymentMode || '').toLowerCase() === 'upi' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                        {tx.paymentMode || 'Cash'}
                    </span>
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-600">
                    {collectedBy}
                </td>
                <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded uppercase ${
                        status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                        {status}
                    </span>
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-500">
                    {new Date(tx.paymentDate || tx.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                    {memberObjId ? (
                        <Link 
                            to={`/dashboard/owner/finance/receipt/${memberObjId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                            <FiEye className="text-xs" /> View Receipt
                        </Link>
                    ) : (
                        <span className="text-xs text-slate-400 font-medium">N/A</span>
                    )}
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

            {/* 2. Side-by-Side Chart and Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch px-4">
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
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
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

                            {/* Card & Transfers */}
                            <div>
                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                    <span className="flex items-center gap-1.5 text-slate-700">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                                        Card & Transfers
                                    </span>
                                    <span className="text-slate-900 font-extrabold">₹{cardOrOtherTotal.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        style={{ width: `${getPercent(cardOrOtherTotal)}%` }} 
                                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold">Total Mode Revenue</span>
                        <span className="text-base font-black text-emerald-600">₹{totalCollectedInView.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* 3. FilterBar Component AFTER Charts */}
            {filterBar}

            {/* 4. App Theme Data Table */}
            <div className="px-4 pb-4">
                {transactions.length > 0 ? (
                    <DataTable columns={columns} data={transactions} renderRow={renderRow} darkHeader={false} />
                ) : (
                    <EmptyState 
                        icon={<FiDollarSign size={48} />} 
                        title="No collection records found" 
                        subtitle="Try adjusting your date filters or search parameters." 
                    />
                )}
            </div>
        </div>
    );
}
