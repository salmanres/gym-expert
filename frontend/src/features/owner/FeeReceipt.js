import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import Loader from '../../components/page/Loader';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import { FiPrinter, FiCheckCircle, FiMapPin, FiShield, FiUser, FiCreditCard } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { CgGym } from 'react-icons/cg';
import { IoWalletOutline } from 'react-icons/io5';
import { formatDate } from '../../utils/dateUtils';

export default function FeeReceipt() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReceiptData = async () => {
            try {
                let txData = null;
                try {
                    const txRes = await apiClient.get(`/members/transactions/single/${id}`);
                    if (txRes.data && txRes.data._id) {
                        txData = txRes.data;
                    }
                } catch (e) {
                    // Not a transaction ID
                }

                if (txData) {
                    const memberInfo = txData.memberId || {};
                    const memberId = memberInfo._id || memberInfo;

                    const [memRes, memberFullRes] = await Promise.all([
                        apiClient.get(`/member-memberships/member/${memberId}`).catch(() => ({ data: [] })),
                        apiClient.get(`/members/${memberId}`).catch(() => null)
                    ]);
                    const fullMemberData = memberFullRes?.data || (typeof memberInfo === 'object' ? memberInfo : {});
                    const memberships = memRes.data || [];
                    const matchedPlan = memberships.find(m => m._id === txData.membershipId || m.membershipPlanId?._id === txData.planId?._id) || memberships[0];

                    const basePrice = matchedPlan?.originalPrice || matchedPlan?.finalPrice || txData.planId?.price || 699;
                    const discount = matchedPlan?.discount || 0;
                    const finalAmount = matchedPlan?.finalPrice || (basePrice - discount);
                    const amountPaidInTx = txData.amountPaid || 0;
                    const walletUsedInTx = txData.walletAmount || 0;
                    const totalPlanPaid = matchedPlan?.paidAmount || amountPaidInTx;
                    const balance = Math.max(0, finalAmount - totalPlanPaid);

                    setMember({
                        ...fullMemberData,
                        receiptType: 'transaction',
                        transactionId: txData.transactionId || txData._id || 'N/A',
                        paymentMode: txData.paymentMode || 'Cash',
                        receiptDate: formatDate(txData.paymentDate || txData.createdAt),
                        planName: matchedPlan?.planName || txData.planId?.name || 'Membership Plan',
                        planStartDate: matchedPlan?.startDate || txData.createdAt,
                        paidUntilDate: matchedPlan?.paidUntilDate || matchedPlan?.endDate,
                        originalPrice: basePrice,
                        discount: discount,
                        finalAmount: finalAmount,
                        amountPaid: amountPaidInTx,
                        walletUsed: walletUsedInTx,
                        walletBalance: fullMemberData.walletBalance ?? 0,
                        totalPlanPaid: totalPlanPaid,
                        totalCollected: matchedPlan?.totalCollected || totalPlanPaid,
                        balance: balance,
                        paymentStatus: matchedPlan?.paymentStatus || (totalPlanPaid >= finalAmount ? 'Paid' : 'Partial')
                    });
                } else {
                    const [memberRes, memRes, allTxRes] = await Promise.all([
                        apiClient.get(`/members/${id}`).catch(() => null),
                        apiClient.get(`/member-memberships/member/${id}`).catch(() => ({ data: [] })),
                        apiClient.get('/members/transactions/all').catch(() => ({ data: [] }))
                    ]);
                    
                    if (memberRes && memberRes.data) {
                        const memberData = memberRes.data;
                        const activePlan = memRes.data[0];
                        const allTransactions = allTxRes.data || [];
                        
                        // Find latest transaction for this member
                        const memberTxList = allTransactions.filter(t => (t.memberId?._id || t.memberId) === id);
                        const latestTx = memberTxList[0];

                        if (activePlan) {
                            const basePrice = activePlan.originalPrice || activePlan.finalPrice || 699;
                            const discount = activePlan.discount || 0;
                            const finalAmount = activePlan.finalPrice || (basePrice - discount);
                            const totalPlanPaid = activePlan.paidAmount || 0;
                            const currentTxPaid = latestTx ? (latestTx.amountPaid || totalPlanPaid) : totalPlanPaid;
                            const walletUsedInTx = latestTx?.walletAmount || activePlan?.walletUsed || 0;

                            memberData.paymentStatus = activePlan.paymentStatus;
                            memberData.membershipPlan = activePlan.membershipPlanId;
                            memberData.planName = activePlan.planName;
                            memberData.planStartDate = activePlan.startDate;
                            memberData.amountPaid = currentTxPaid;
                            memberData.walletUsed = walletUsedInTx;
                            memberData.walletBalance = memberData.walletBalance ?? 0;
                            memberData.totalPlanPaid = totalPlanPaid;
                            memberData.totalCollected = activePlan.totalCollected || totalPlanPaid;
                            memberData.transactionId = latestTx ? (latestTx.transactionId || latestTx._id) : 'N/A';
                            memberData.paymentMode = latestTx ? latestTx.paymentMode : 'Cash';
                            memberData.finalAmount = finalAmount;
                            memberData.discount = discount;
                            memberData.paidUntilDate = activePlan.paidUntilDate;
                            memberData.originalPrice = basePrice;
                            memberData.balance = Math.max(0, finalAmount - totalPlanPaid);
                            memberData.receiptDate = formatDate(latestTx ? (latestTx.paymentDate || latestTx.createdAt) : new Date());
                        }
                        setMember(memberData);
                    } else {
                        // Fallback: Check if id is an Enquiry / Lead ID for Trial Receipt
                        const enqRes = await apiClient.get(`/enquiries/${id}`);
                        const enquiry = enqRes.data;
                        if (enquiry) {
                            const trialFee = Number(enquiry.securityAmount || enquiry.trialFee || 0);
                            const isPaid = enquiry.trialPaymentStatus === 'Paid' || enquiry.trialFeeType === 'Paid';
                            setMember({
                                firstName: enquiry.firstName,
                                lastName: enquiry.lastName || '',
                                contactNumber: enquiry.contactNumber,
                                email: enquiry.email,
                                gender: enquiry.gender,
                                memberId: `LEAD-${enquiry._id.substring(enquiry._id.length - 4).toUpperCase()}`,
                                isTrialReceipt: true,
                                receiptType: 'trial',
                                transactionId: `TRL-${enquiry._id.substring(enquiry._id.length - 6).toUpperCase()}`,
                                paymentMode: enquiry.trialPaymentMode || 'Cash',
                                receiptDate: formatDate(enquiry.updatedAt || enquiry.createdAt),
                                planName: `Trial Pass - Security Deposit (${enquiry.inquiryFor || 'Gym Access'})`,
                                planStartDate: enquiry.trialDate || enquiry.createdAt,
                                paidUntilDate: enquiry.trialEndDate || enquiry.trialDate,
                                originalPrice: trialFee,
                                discount: 0,
                                finalAmount: trialFee,
                                amountPaid: isPaid ? trialFee : 0,
                                walletUsed: 0,
                                walletBalance: 0,
                                totalPlanPaid: isPaid ? trialFee : 0,
                                balance: isPaid ? 0 : trialFee,
                                paymentStatus: enquiry.trialPaymentStatus || 'Paid'
                            });
                        }
                    }
                }
                setLoading(false);
            } catch (error) {
                console.error("Receipt fetch error:", error);
                toast.error("Failed to fetch receipt data");
                setLoading(false);
            }
        };
        fetchReceiptData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Loader text="Generating invoice..." />;
    if (!member) return <div className="p-8 text-center text-slate-600 font-bold">Member receipt not found.</div>;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const gymName = member.gymId?.name || member.gym?.name || user.gym?.name || "Fitness With Harjeet";
    const receiptDate = formatDate(member.receiptDate || new Date());
    
    const planName = member.planName || member.membershipPlan?.name || "Gym Membership Plan";
    const basePrice = Number(member.originalPrice || member.membershipPlan?.price || member.finalAmount || 0);
    const discount = Number(member.discount || 0);
    const finalAmount = Number(member.finalAmount || (basePrice - discount));

    // Transaction & Payment Breakdown
    const currentPaid = Number(member.amountPaid || 0);
    const walletUsed = Number(member.walletUsed || 0);
    const walletBalance = Number(member.walletBalance || 0);
    const totalPlanPaid = Number(member.totalPlanPaid !== undefined ? member.totalPlanPaid : currentPaid);
    const previousPaid = Math.max(0, totalPlanPaid - currentPaid);
    const balance = Number(member.balance !== undefined ? member.balance : Math.max(0, finalAmount - totalPlanPaid));
    
    const receiptNo = member.transactionId && member.transactionId !== 'N/A' 
        ? `INV-${member.transactionId.substring(Math.max(0, member.transactionId.length - 8)).toUpperCase()}`
        : `INV-${Math.floor(Math.random()*900000) + 100000}`;

    const handleSendWhatsAppWithDetails = () => {
        if (!member?.contactNumber) {
            toast.error("Contact number not available");
            return;
        }
        const cleanPhone = member.contactNumber.replace(/\D/g, '');
        const gymNameStr = member.gymId?.name || member.gym?.name || "Gym Studio";
        const text = encodeURIComponent(
            `🧾 *FEE RECEIPT - ${gymNameStr.toUpperCase()}*\n\n` +
            `*Member:* ${member.firstName} ${member.lastName || ''} (ID: ${member.memberId || 'N/A'})\n` +
            `*Plan:* ${member.planName || 'Gym Access'}\n` +
            `*Paid (This Receipt):* ₹${currentPaid.toLocaleString()}\n` +
            (walletUsed > 0 ? `*Wallet Used:* ₹${walletUsed.toLocaleString()}\n` : '') +
            (previousPaid > 0 ? `*Previously Paid:* ₹${previousPaid.toLocaleString()}\n` : '') +
            `*Total Paid:* ₹${totalPlanPaid.toLocaleString()}\n` +
            `*Balance Due:* ₹${balance.toLocaleString()}\n` +
            `*Wallet Balance:* ₹${walletBalance.toLocaleString()}\n` +
            `*Status:* ${member.paymentStatus || 'Paid'}\n` +
            `*Date:* ${member.receiptDate}\n\n` +
            `Thank you for training with us!`
        );
        window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
    };

    return (
        <PageLayout>
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm;
                    }
                    body {
                        background: #ffffff !important;
                        color: #0f172a !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-hidden {
                        display: none !important;
                    }
                    .a4-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: auto !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                }
            `}</style>

            <PageHeader 
                title="Invoice / Fee Receipt" 
                subtitle={`Clean printable invoice for ${member.firstName} ${member.lastName || ''}`}
                showBack={true}
                action={
                    <div className="flex items-center gap-2 print:hidden print-hidden">
                        <button 
                            onClick={handleSendWhatsAppWithDetails} 
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                            <FaWhatsapp className="text-emerald-400 text-sm" /> Send WhatsApp
                        </button>
                        <button 
                            onClick={handlePrint} 
                            className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            <FiPrinter className="text-sm" /> Print Invoice
                        </button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#FAEEEF] print:p-0 print:bg-white print:overflow-visible flex flex-col items-center">
                
                {/* Clean Professional A4 Printable Sheet Container */}
                <div className="a4-container w-full max-w-4xl min-h-[960px] mx-auto bg-white border border-slate-300 rounded-xl shadow-sm p-8 sm:p-10 print:rounded-none print:border-none print:shadow-none flex flex-col justify-between text-slate-800 relative">
                    
                    {/* Top Header Section */}
                    <div>
                        <div className="flex justify-between items-start border-b border-slate-300 pb-5 mb-6">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
                                    <CgGym />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase leading-tight">{gymName}</h1>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Fitness & Training Facility</p>
                                    <p className="text-xs text-slate-500 font-normal mt-1 flex items-center gap-1">
                                        <FiMapPin className="text-slate-400 text-xs" /> Main Branch Center
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="inline-block bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-1.5">
                                    Tax Invoice / Receipt
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Invoice No: <span className="font-mono text-slate-900 font-bold text-sm">{receiptNo}</span></p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Issue Date: <span className="font-semibold text-slate-800">{receiptDate}</span></p>
                            </div>
                        </div>

                        {/* Customer, Payment & Wallet Information (2 Columns) */}
                        <div className="grid grid-cols-2 gap-5 mb-6 text-xs">
                            
                            {/* Customer Information */}
                            <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <FiUser className="text-slate-600" /> Billed To (Member Details)
                                </p>
                                <h3 className="text-base font-bold text-slate-900 mb-1.5">{member.firstName} {member.lastName}</h3>
                                <div className="space-y-1 text-slate-600 font-normal">
                                    <p><span className="font-medium text-slate-500 w-24 inline-block">Member ID:</span> <span className="font-bold text-slate-900 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{member.memberId || 'N/A'}</span></p>
                                    <p><span className="font-medium text-slate-500 w-24 inline-block">Mobile:</span> <span className="font-semibold text-slate-800">{member.contactNumber}</span></p>
                                    {member.email && <p><span className="font-medium text-slate-500 w-24 inline-block">Email:</span> <span className="text-slate-700">{member.email}</span></p>}
                                    <p><span className="font-medium text-slate-500 w-24 inline-block">Gender:</span> <span className="text-slate-700">{member.gender || 'N/A'}</span></p>
                                </div>
                            </div>

                            {/* Payment Transaction & Wallet Details */}
                            <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <FiCreditCard className="text-slate-600" /> Payment & Wallet Summary
                                    </p>
                                    <div className="space-y-1 text-slate-600 font-normal">
                                        <p className="flex justify-between items-center">
                                            <span className="font-medium text-slate-500">Payment Status:</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-200/80 text-slate-800 border border-slate-300">
                                                <FiCheckCircle size={11} /> {member.paymentStatus || 'PAID'}
                                            </span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="font-medium text-slate-500">Payment Mode:</span>
                                            <span className="font-semibold text-slate-800 font-mono">{member.paymentMode || 'Cash'}</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="font-medium text-slate-500">Transaction ID:</span>
                                            <span className="font-mono text-slate-800 font-semibold">{member.transactionId || 'N/A'}</span>
                                        </p>
                                        <p className="flex justify-between items-center pt-0.5">
                                            <span className="font-medium text-slate-500 flex items-center gap-1">
                                                <IoWalletOutline className="text-slate-600" /> Member Wallet Balance:
                                            </span>
                                            <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                                                ₹{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                                    <span className="font-medium text-slate-500">Plan Validity Until:</span>
                                    <span className="font-bold text-slate-900 font-mono">
                                        {formatDate(member.paidUntilDate, 'N/A')}
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* Itemized Services & Plan Table */}
                        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-300">
                                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                                        <th className="py-2.5 px-4">Description / Plan Details</th>
                                        <th className="py-2.5 px-4 text-center">Validity Range</th>
                                        <th className="py-2.5 px-4 text-right">Base Price</th>
                                        <th className="py-2.5 px-4 text-right">Discount</th>
                                        <th className="py-2.5 px-4 text-right">Net Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-normal text-slate-700 divide-y divide-slate-200">
                                    <tr className="bg-white">
                                        <td className="py-3 px-4 text-center font-medium text-slate-400">01</td>
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-slate-900">{planName}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Gym Membership & Facility Access</p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-[11px]">
                                                {formatDate(member.planStartDate, 'N/A')}
                                                {' to '}
                                                {formatDate(member.paidUntilDate, 'N/A')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-800">
                                            ₹{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                                            {discount > 0 ? `- ₹${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                                            ₹{finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Calculations & Summary Section */}
                        <div className="flex justify-between items-start gap-6 mb-8">
                            
                            {/* Terms & Policies */}
                            <div className="w-1/2 bg-slate-50/70 p-4 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-600">
                                <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                                    <FiShield className="text-slate-600" /> Terms & Payment Policy
                                </p>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 leading-relaxed">
                                    <li>Fees once paid are non-refundable and non-transferable under any circumstances.</li>
                                    <li>Members must check-in / scan QR code on each workout visit.</li>
                                    <li>Wallet balance can be utilized for subsequent plan renewals or add-on services.</li>
                                </ul>
                            </div>

                            {/* Clean Total Calculation Table */}
                            <div className="w-80 bg-slate-50 border border-slate-300 rounded-lg p-4 text-xs space-y-1.5 font-normal">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal Base Amount:</span>
                                    <span className="font-semibold text-slate-800">₹{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Discount Savings:</span>
                                        <span className="font-semibold text-slate-800">- ₹{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-800 pt-1.5 border-t border-slate-200 font-medium">
                                    <span>Net Payable Total:</span>
                                    <span className="font-bold text-slate-900 text-xs">₹{finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {walletUsed > 0 && (
                                    <div className="flex justify-between text-slate-700">
                                        <span className="flex items-center gap-1">
                                            <IoWalletOutline className="text-xs" /> Wallet Amount Used:
                                        </span>
                                        <span className="font-bold text-slate-800">- ₹{walletUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {previousPaid > 0 && (
                                    <div className="flex justify-between text-slate-500">
                                        <span>Previously Paid:</span>
                                        <span className="font-medium text-slate-700">₹{previousPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-900 py-1.5 px-2.5 bg-slate-100 rounded border border-slate-300 font-bold text-xs mt-1">
                                    <span>Paid Now (This Receipt):</span>
                                    <span className="font-extrabold text-slate-900">₹{currentPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 pb-1.5 border-b border-slate-200">
                                    <span>Total Paid So Far:</span>
                                    <span className="font-semibold text-slate-800">₹{totalPlanPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1.5 text-xs">
                                    <span className="font-bold text-slate-800 uppercase">Balance Amount Due:</span>
                                    <span className="font-extrabold font-mono text-sm text-slate-900">
                                        ₹{Math.max(0, balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                                    <span>Available Wallet Balance:</span>
                                    <span className="font-bold font-mono text-slate-800">
                                        ₹{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Bottom Signature & Footer Section */}
                    <div>
                        <div className="grid grid-cols-2 gap-12 pt-6 border-t border-slate-300 text-xs mb-4">
                            <div>
                                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Member Signature</p>
                                <div className="h-10 flex items-end">
                                    <span className="w-40 border-b border-slate-400"></span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">For {gymName.toUpperCase()}</p>
                                <div className="h-10 flex items-end justify-end">
                                    <span className="font-medium text-slate-700 border-b border-slate-400 pb-0.5 px-3 italic text-[11px]">
                                        Authorized Signatory
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Clean Computer Generated Footer Line */}
                        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-center text-xs text-slate-500">
                            <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Thank You For Your Payment</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">This is an official computer-generated receipt issued by {gymName}.</p>
                        </div>
                    </div>

                </div>
            </div>
        </PageLayout>
    );
}
