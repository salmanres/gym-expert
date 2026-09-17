import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import Loader from '../../components/page/Loader';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import { FiPrinter, FiSend, FiCheckCircle, FiPhone, FiMail, FiMapPin, FiShield, FiUser } from 'react-icons/fi';
import { CgGym } from 'react-icons/cg';
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

                    const memRes = await apiClient.get(`/member-memberships/member/${memberId}`).catch(() => ({ data: [] }));
                    const memberships = memRes.data || [];
                    const matchedPlan = memberships.find(m => m._id === txData.membershipId || m.membershipPlanId?._id === txData.planId?._id) || memberships[0];

                    const basePrice = matchedPlan?.originalPrice || matchedPlan?.finalPrice || txData.planId?.price || 699;
                    const discount = matchedPlan?.discount || 0;
                    const finalAmount = matchedPlan?.finalPrice || (basePrice - discount);
                    const amountPaidInTx = txData.amountPaid || 0;
                    const totalPlanPaid = matchedPlan?.paidAmount || amountPaidInTx;
                    const balance = Math.max(0, finalAmount - totalPlanPaid);

                    setMember({
                        ...memberInfo,
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

                            memberData.paymentStatus = activePlan.paymentStatus;
                            memberData.membershipPlan = activePlan.membershipPlanId;
                            memberData.planName = activePlan.planName;
                            memberData.planStartDate = activePlan.startDate;
                            memberData.amountPaid = currentTxPaid;
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
                            const trialFee = Number(enquiry.trialFee || 0);
                            const isPaid = enquiry.trialPaymentStatus === 'Paid';
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
                                planName: `Paid Trial Pass (${enquiry.inquiryFor || 'Gym Access'})`,
                                planStartDate: enquiry.trialDate || enquiry.createdAt,
                                paidUntilDate: enquiry.trialEndDate || enquiry.trialDate,
                                originalPrice: trialFee,
                                discount: 0,
                                finalAmount: trialFee,
                                amountPaid: isPaid ? trialFee : 0,
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

    const handleSendWhatsApp = () => {
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
            `*Amount Paid:* ₹${(member.amountPaid || 0).toLocaleString()}\n` +
            `*Balance Due:* ₹${(member.balance || 0).toLocaleString()}\n` +
            `*Status:* ${member.paymentStatus || 'Paid'}\n` +
            `*Date:* ${member.receiptDate}\n\n` +
            `Thank you for training with us! 💪`
        );
        window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
    };

    if (loading) return <Loader text="Generating full A4 invoice..." />;
    if (!member) return <div className="p-8 text-center text-rose-500 font-bold">Member receipt not found.</div>;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const gymName = member.gymId?.name || member.gym?.name || user.gym?.name || "Fitness With Harjeet";
    const receiptDate = formatDate(member.receiptDate || new Date());
    
    const planName = member.planName || member.membershipPlan?.name || "Gym Membership Plan";
    const basePrice = Number(member.originalPrice || member.membershipPlan?.price || member.finalAmount || 0);
    const discount = Number(member.discount || 0);
    const finalAmount = Number(member.finalAmount || (basePrice - discount));

    // Transaction specific breakdown
    const currentPaid = Number(member.amountPaid || 0);
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
            `*Paid Now (This Receipt):* ₹${currentPaid.toLocaleString()}\n` +
            (previousPaid > 0 ? `*Previously Paid:* ₹${previousPaid.toLocaleString()}\n` : '') +
            `*Total Paid So Far:* ₹${totalPlanPaid.toLocaleString()}\n` +
            `*Balance Due:* ₹${balance.toLocaleString()}\n` +
            `*Status:* ${member.paymentStatus || 'Paid'}\n` +
            `*Date:* ${member.receiptDate}\n\n` +
            `Thank you for training with us! 💪`
        );
        window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
    };

    return (
        <PageLayout>
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                    }
                    .a4-container {
                        width: 100% !important;
                        max-width: none !important;
                        min-height: 277mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
            `}</style>

            <PageHeader 
                title="A4 Tax Invoice / Fee Receipt" 
                subtitle={`Printable full A4 sheet receipt for ${member.firstName} ${member.lastName || ''}`}
                showBack={true}
                action={
                    <div className="flex items-center gap-2 print:hidden">
                        <button 
                            onClick={handleSendWhatsAppWithDetails} 
                            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all"
                        >
                            <FiSend className="text-sm" /> WhatsApp Receipt
                        </button>
                        <button 
                            onClick={handlePrint} 
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-extrabold text-xs shadow-md transition-all"
                        >
                            <FiPrinter className="text-sm" /> Print A4 Invoice
                        </button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-200/70 print:p-0 print:bg-white print:overflow-visible">
                
                {/* Full A4 Printable Sheet Container */}
                <div className="a4-container w-full max-w-4xl min-h-[1020px] mx-auto bg-white border border-slate-300 rounded-2xl shadow-xl p-8 sm:p-12 print:rounded-none print:border-none print:shadow-none flex flex-col justify-between text-slate-800 relative">
                    
                    {/* Top Header Section */}
                    <div>
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-3xl shadow-md shrink-0">
                                    <CgGym />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{gymName}</h1>
                                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-0.5">FITNESS & PERSONAL TRAINING STUDIO</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                                        <FiMapPin className="text-slate-400 text-xs" /> Main Branch Facility, Gym Center
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest mb-2">
                                    FEE RECEIPT / TAX INVOICE
                                </div>
                                <p className="text-xs font-bold text-slate-500">Invoice No: <span className="font-mono text-slate-900 font-black text-sm">{receiptNo}</span></p>
                                <p className="text-xs font-semibold text-slate-600 mt-0.5">Issue Date: <span className="font-bold text-slate-900">{receiptDate}</span></p>
                            </div>
                        </div>

                        {/* Customer & Facility Information Cards (2 Columns) */}
                        <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
                            
                            {/* Customer Information */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <FiUser className="text-emerald-600" /> BILLED TO (MEMBER INFORMATION)
                                </p>
                                <h3 className="text-lg font-black text-slate-900 mb-1">{member.firstName} {member.lastName}</h3>
                                <div className="space-y-1 text-slate-600 font-medium mt-2">
                                    <p><span className="font-bold text-slate-500 w-24 inline-block">Member ID:</span> <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{member.memberId || 'N/A'}</span></p>
                                    <p><span className="font-bold text-slate-500 w-24 inline-block">Contact Phone:</span> <span className="font-bold text-slate-900">{member.contactNumber}</span></p>
                                    {member.email && <p><span className="font-bold text-slate-500 w-24 inline-block">Email Address:</span> <span className="font-semibold text-slate-800">{member.email}</span></p>}
                                    <p><span className="font-bold text-slate-500 w-24 inline-block">Gender:</span> <span className="font-bold text-slate-800">{member.gender || 'N/A'}</span></p>
                                </div>
                            </div>

                            {/* Payment & Validity Summary */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PAYMENT TRANSACTION SUMMARY</p>
                                    <div className="space-y-1.5 text-slate-600 font-medium">
                                        <p className="flex justify-between">
                                            <span className="font-bold text-slate-500">Payment Status:</span>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                                                member.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                                            }`}>
                                                <FiCheckCircle size={12} /> {member.paymentStatus || 'PAID'}
                                            </span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="font-bold text-slate-500">Paid Now (This Receipt):</span>
                                            <span className="font-extrabold text-emerald-700 font-mono">₹{currentPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="font-bold text-slate-500">Payment Mode:</span>
                                            <span className="font-bold text-slate-900 font-mono">{member.paymentMode || 'Cash'}</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="font-bold text-slate-500">Transaction Ref:</span>
                                            <span className="font-mono text-slate-800 font-bold">{member.transactionId || 'TX-DEFAULT'}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Access Valid Until:</span>
                                    <span className="font-black text-emerald-700 font-mono text-sm">
                                        {formatDate(member.paidUntilDate, 'N/A')}
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* Itemized Services & Plan Table */}
                        <div className="border-2 border-slate-900 rounded-xl overflow-hidden mb-8">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
                                        <th className="py-3.5 px-6">#</th>
                                        <th className="py-3.5 px-6">Description / Plan Details</th>
                                        <th className="py-3.5 px-4 text-center">Validity Range</th>
                                        <th className="py-3.5 px-6 text-right">Base Price</th>
                                        <th className="py-3.5 px-6 text-right">Discount</th>
                                        <th className="py-3.5 px-6 text-right">Net Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-200">
                                    <tr className="bg-white">
                                        <td className="py-4 px-6 font-bold text-slate-400">01</td>
                                        <td className="py-4 px-6">
                                            <p className="font-black text-slate-900 text-sm">{planName}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Full Gym Access & Fitness Training Package</p>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="font-bold bg-slate-100 px-3 py-1 rounded text-slate-800 text-[11px]">
                                                {formatDate(member.planStartDate, 'N/A')}
                                                {' to '}
                                                {formatDate(member.paidUntilDate, 'N/A')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-800 text-sm">
                                            ₹{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-emerald-600 text-sm">
                                            {discount > 0 ? `- ₹${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00'}
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">
                                            ₹{finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Calculations & Summary Section */}
                        <div className="flex justify-between items-start gap-8 mb-12">
                            
                            {/* Gym Rules & Policy */}
                            <div className="w-1/2 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
                                <p className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
                                    <FiShield className="text-emerald-600" /> GYM RULES & PAYMENT POLICY
                                </p>
                                <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-600 leading-relaxed font-medium">
                                    <li>Fees once paid are non-refundable and non-transferable under any circumstances.</li>
                                    <li>Members must check-in / scan QR code upon every workout session.</li>
                                    <li>Membership plans & Personal Training (PT) sessions must be utilized within the valid duration.</li>
                                </ul>
                            </div>

                            {/* Total Calculation Table */}
                            <div className="w-80 bg-slate-900 text-white rounded-xl p-5 text-xs shadow-lg space-y-2 font-medium">
                                <div className="flex justify-between text-slate-300">
                                    <span>Subtotal Base Amount:</span>
                                    <span className="font-bold text-white">₹{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-emerald-400 font-bold">
                                        <span>Total Discount Savings:</span>
                                        <span>- ₹{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-800">
                                    <span>Net Payable Total:</span>
                                    <span className="font-black text-white text-sm">₹{finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {previousPaid > 0 && (
                                    <div className="flex justify-between text-slate-400">
                                        <span>Previously Paid:</span>
                                        <span className="font-bold text-slate-300">₹{previousPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-emerald-400 py-1.5 px-2 bg-emerald-950/60 rounded border border-emerald-500/30 font-extrabold text-sm">
                                    <span>Paid Now (This Receipt):</span>
                                    <span>₹{currentPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-300 pb-2 border-b border-slate-800 font-bold">
                                    <span>Total Paid So Far:</span>
                                    <span className="text-white font-black">₹{totalPlanPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 text-sm">
                                    <span className="font-black text-amber-400 uppercase">Balance Amount Due:</span>
                                    <span className={`font-black font-mono text-xl ${balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        ₹{Math.max(0, balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Bottom Signature & Footer Section */}
                    <div>
                        <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-xs mb-6">
                            <div>
                                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">MEMBER SIGNATURE</p>
                                <div className="h-12 flex items-end">
                                    <span className="w-48 border-b border-slate-400"></span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">FOR {gymName.toUpperCase()}</p>
                                <div className="h-12 flex items-end justify-end">
                                    <span className="font-bold text-slate-800 border-b border-slate-400 pb-1 px-4 italic">
                                        Authorized Stamp & Sign
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Computer Generated Footer Line */}
                        <div className="bg-slate-100 p-3 rounded-lg text-center text-xs text-slate-500 font-medium">
                            <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">THANK YOU FOR YOUR BUSINESS! STAY FIT & STRONG 💪</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">This is an official computer-generated receipt issued by {gymName}.</p>
                        </div>
                    </div>

                </div>
            </div>
        </PageLayout>
    );
}


