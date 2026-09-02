import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import Loader from '../../components/page/Loader';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import { FiPrinter, FiCheckCircle } from 'react-icons/fi';
import { CgGym } from 'react-icons/cg';

export default function FeeReceipt() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMember = async () => {
            try {
                const [memberRes, memRes] = await Promise.all([
                    apiClient.get(`/members/${id}`),
                    apiClient.get(`/member-memberships/member/${id}`).catch(() => ({ data: [] }))
                ]);
                const memberData = memberRes.data;
                const activePlan = memRes.data[0]; // get most recent plan
                if (activePlan) {
                    memberData.paymentStatus = activePlan.paymentStatus;
                    memberData.membershipPlan = activePlan.membershipPlanId;
                    memberData.planName = activePlan.planName;
                    memberData.planStartDate = activePlan.startDate;
                    memberData.amountPaid = activePlan.paidAmount;
                    memberData.finalAmount = activePlan.finalPrice;
                    memberData.discount = activePlan.discount;
                    memberData.paidUntilDate = activePlan.paidUntilDate;
                    memberData.originalPrice = activePlan.originalPrice;
                }
                setMember(memberData);
                setLoading(false);
            } catch (error) {
                toast.error("Failed to fetch receipt data");
                setLoading(false);
            }
        };
        fetchMember();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Loader text="Generating receipt..." />;
    if (!member) return <div className="p-8 text-center text-rose-500">Member not found.</div>;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const gymName = member.gymId?.name || member.gym?.name || user.gym?.name || "Official Gym";
    const receiptDate = new Date().toLocaleDateString();
    
    // For calculation display
    const planName = member.planName || member.membershipPlan?.name || "Membership Plan";
    const basePrice = member.originalPrice || member.membershipPlan?.price || 0;
    const discount = member.discount || 0;
    const amountPaid = member.amountPaid || 0;
    const finalAmount = member.finalAmount || (basePrice - discount);
    const balance = finalAmount - amountPaid;

    return (
        <PageLayout>
            <PageHeader 
                title="Fee Receipt" 
                subtitle={`Payment details for ${member.firstName} ${member.lastName || ''}`}
                showBack={true}
                action={
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all transform hover:scale-105 active:scale-95 print:hidden">
                        <FiPrinter /> Print
                    </button>
                }
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white print:p-0 print:bg-white print:overflow-visible">
                {/* Receipt Document */}
            <div className="w-full max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:bg-white print:rounded-none relative text-slate-800">
                
                {/* Decorative Premium Glow (Hidden on Print) */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-emerald-200 rounded-full blur-3xl opacity-50 print:hidden pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 print:hidden pointer-events-none"></div>

                {/* Decorative Top Border */}
                <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600"></div>
                
                {/* Receipt Header */}
                <div className="p-10 flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 print:border-slate-200 relative z-10">
                    <div className="flex items-center gap-4 mb-6 sm:mb-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center shadow-md border border-slate-200 print:bg-slate-100 print:text-slate-900 print:border-none">
                            <CgGym className="text-4xl text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 print:text-slate-900 uppercase tracking-tight">{gymName}</h1>
                            <p className="text-sm font-medium text-emerald-600 print:text-slate-500 tracking-wide">FITNESS & LIFESTYLE STUDIO</p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <h2 className="text-4xl font-black text-slate-200 print:text-slate-300 uppercase tracking-widest">INVOICE</h2>
                        <div className="mt-2 space-y-1">
                            <p className="text-sm font-bold text-slate-500 print:text-slate-800">No. <span className="text-slate-800 print:text-slate-500 font-medium">#{member.transactionId ? member.transactionId.substring(member.transactionId.length - 6).toUpperCase() : Math.floor(Math.random()*90000) + 10000}</span></p>
                            <p className="text-sm font-bold text-slate-500 print:text-slate-800">Date: <span className="text-slate-800 print:text-slate-500 font-medium">{receiptDate}</span></p>
                        </div>
                    </div>
                </div>

                {/* Receipt Body */}
                <div className="p-10 relative z-10">
                    
                    {/* Billed To & Status */}
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-12 bg-slate-50/80 print:bg-slate-50 rounded-2xl p-6 border border-slate-100 print:border-slate-100 backdrop-blur-sm shadow-sm">
                        <div>
                            <p className="text-xs font-bold text-slate-400 print:text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                            <h3 className="text-xl font-black text-slate-800 print:text-slate-800 mb-1">{member.firstName} {member.lastName}</h3>
                            <p className="text-sm font-medium text-slate-600 print:text-slate-600 flex items-center gap-2">
                                <span className="w-4 inline-block text-center text-slate-400">📞</span> {member.contactNumber}
                            </p>
                            {member.email && (
                                <p className="text-sm font-medium text-slate-600 print:text-slate-600 flex items-center gap-2 mt-1">
                                    <span className="w-4 inline-block text-center text-slate-400">✉️</span> {member.email}
                                </p>
                            )}
                        </div>
                        <div className="mt-6 sm:mt-0 text-left sm:text-right">
                            <p className="text-xs font-bold text-slate-400 print:text-slate-400 uppercase tracking-widest mb-2">Payment Status</p>
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider ${member.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 print:bg-emerald-100 print:text-emerald-700' : member.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-700 print:bg-amber-100 print:text-amber-700' : 'bg-rose-100 text-rose-700 print:bg-rose-100 print:text-rose-700'}`}>
                                {member.paymentStatus === 'Paid' && <FiCheckCircle className="text-lg" />}
                                {member.paymentStatus ? member.paymentStatus : 'UNKNOWN'}
                            </div>
                        </div>
                    </div>

                    {/* Payment Table */}
                    <div className="rounded-2xl border border-slate-200 print:border-slate-200 overflow-hidden mb-8 shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100/80 print:bg-slate-50">
                                <tr>
                                    <th className="py-4 px-6 font-bold text-slate-600 print:text-slate-800 text-xs uppercase tracking-wider">Description</th>
                                    <th className="py-4 px-6 font-bold text-slate-600 print:text-slate-800 text-xs uppercase tracking-wider text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100 print:divide-slate-100 bg-white/50 print:bg-white backdrop-blur-md">
                                <tr>
                                    <td className="py-5 px-6">
                                        <p className="font-bold text-slate-800 print:text-slate-800 text-base">{planName}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-1">
                                            Valid from: {new Date(member.planStartDate).toLocaleDateString()}
                                        </p>
                                    </td>
                                    <td className="py-5 px-6 text-right font-black text-slate-700 print:text-slate-700 text-base">₹{basePrice.toFixed(2)}</td>
                                </tr>
                                {discount > 0 && (
                                    <tr className="bg-emerald-50/50 print:bg-emerald-50/50">
                                        <td className="py-4 px-6 text-emerald-600 print:text-emerald-700 font-bold">Discount Applied</td>
                                        <td className="py-4 px-6 text-right text-emerald-600 print:text-emerald-700 font-black">- ₹{discount.toFixed(2)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end mb-12">
                        <div className="w-full max-w-sm bg-slate-50/80 print:bg-slate-50 rounded-2xl p-6 border border-slate-100 print:border-slate-100 backdrop-blur-sm shadow-sm">
                            <div className="flex justify-between py-2 text-sm">
                                <span className="font-bold text-slate-500 print:text-slate-500">Total Payable</span>
                                <span className="font-black text-slate-800 print:text-slate-800">₹{finalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-2 text-sm border-b border-slate-200 print:border-slate-200 mb-2 pb-3">
                                <span className="font-bold text-slate-500 print:text-slate-500">Amount Paid</span>
                                <span className="font-black text-emerald-600 print:text-emerald-600">₹{amountPaid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-black text-slate-800 print:text-slate-800 uppercase tracking-wider text-sm">Balance Due</span>
                                <span className={`font-black text-2xl ${balance > 0 ? 'text-rose-500 print:text-rose-600' : 'text-slate-800 print:text-slate-800'}`}>₹{Math.max(0, balance).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-slate-100 print:border-slate-200">
                        <div>
                            <p className="text-slate-400 print:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Payment Mode</p>
                            <p className="font-black text-slate-700 print:text-slate-800">{member.paymentMode || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 print:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Transaction ID</p>
                            <p className="font-black text-slate-700 print:text-slate-800 truncate" title={member.transactionId}>{member.transactionId || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 print:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Valid Until</p>
                            <p className="font-black text-slate-700 print:text-slate-800">{member.paidUntilDate ? new Date(member.paidUntilDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 print:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Generated By</p>
                            <p className="font-black text-slate-700 print:text-slate-800">System Admin</p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="bg-white p-6 text-center print:bg-transparent print:text-slate-600 print:border-t-2 print:border-slate-200 relative z-10 border-t border-slate-100">
                    <p className="font-bold text-emerald-600 text-sm tracking-wide uppercase mb-1 print:text-slate-800">Thank you for your business!</p>
                    <p className="text-xs text-slate-500 print:text-slate-400 font-medium">This is a computer-generated receipt and does not require a physical signature.</p>
                </div>

            </div>
            </div>
        </PageLayout>
    );
}
