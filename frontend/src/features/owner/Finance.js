import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import DataTable from '../../components/page/DataTable';
import Tabs from '../../components/page/Tabs';
import Button from '../../components/form/Button';
import { FiDollarSign, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

export default function Finance() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All Fees'); // 'All Fees', 'Pending', 'Paid'
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ paymentStatus: 'Paid', amountPaid: '' });
    const [updating, setUpdating] = useState(false);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/members');
            // Only keep members who have a membership plan
            const membersWithPlans = res.data.filter(m => m.membershipPlan);
            setMembers(membersWithPlans);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to fetch finance records");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const filteredMembers = members.filter(m => {
        const matchesSearch = (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase()) || m.contactNumber.includes(searchTerm);
        if (!matchesSearch) return false;
        
        if (activeTab === 'Pending') return m.paymentStatus === 'Pending' || m.paymentStatus === 'Partial';
        if (activeTab === 'Paid') return m.paymentStatus === 'Paid';
        return true;
    });

    const columns = [
        { label: 'Member' },
        { label: 'Plan Details' },
        { label: 'Amount Paid' },
        { label: 'Status' },
        { label: 'Actions', className: 'text-center' }
    ];

    const openPaymentModal = (m) => {
        setSelectedMember(m);
        setPaymentForm({
            paymentStatus: m.paymentStatus || 'Paid',
            amountPaid: m.amountPaid || ''
        });
        setIsModalOpen(true);
    };

    const handlePaymentUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const plan = selectedMember.membershipPlan;
            let updatedPaidUntil = selectedMember.paidUntilDate;

            if (plan && plan.price > 0) {
                let totalDurationDays = 0;
                if (plan.durationUnit === 'Days') totalDurationDays = plan.duration;
                else if (plan.durationUnit === 'Weeks') totalDurationDays = plan.duration * 7;
                else if (plan.durationUnit === 'Months') totalDurationDays = plan.duration * 30;
                else if (plan.durationUnit === 'Years') totalDurationDays = plan.duration * 365;

                if (totalDurationDays > 0) {
                    const pricePerDay = plan.price / totalDurationDays;
                    const daysPaidFor = Math.floor(paymentForm.amountPaid / pricePerDay);
                    
                    let paidUntil = new Date(selectedMember.planStartDate);
                    paidUntil.setDate(paidUntil.getDate() + daysPaidFor);
                    updatedPaidUntil = paidUntil;
                }
            }

            await apiClient.put(`/members/${selectedMember._id}`, {
                ...selectedMember, // send existing data
                paymentStatus: paymentForm.paymentStatus,
                amountPaid: paymentForm.amountPaid,
                paidUntilDate: updatedPaidUntil
            });
            toast.success("Payment status and check-in access updated!");
            setIsModalOpen(false);
            fetchMembers(); // refresh
        } catch (error) {
            toast.error("Failed to update payment");
        }
        setUpdating(false);
    };

    const renderRow = (m) => {
        const isPaid = m.paymentStatus === 'Paid';
        const isPartial = m.paymentStatus === 'Partial';
        
        return (
            <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                    <p className="font-bold text-slate-800 text-sm">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-slate-500">{m.contactNumber}</p>
                </td>
                <td className="py-3 px-4">
                    <p className="font-bold text-slate-700 text-sm">{m.membershipPlan?.name}</p>
                    <p className="text-[10px] text-slate-500">₹{m.membershipPlan?.price} total</p>
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-emerald-600">
                    ₹{m.amountPaid || 0}
                </td>
                <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 w-max ${isPaid ? 'bg-emerald-50 text-emerald-600' : isPartial ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isPaid ? <FiCheckCircle /> : isPartial ? <FiAlertCircle /> : <FiClock />}
                        {m.paymentStatus || 'Pending'}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <div className="flex items-center justify-center">
                        <button onClick={() => openPaymentModal(m)} className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
                            <FiDollarSign /> Update Fee
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <PageLayout>
            <PageHeader 
                title="Fee Management" 
                subtitle="Track and collect membership fees" 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
            />
            
            <Tabs 
                tabs={['All Fees', 'Pending', 'Paid']} 
                activeTab={activeTab} 
                onTabChange={(tab) => { setActiveTab(tab); setSearchTerm(''); }} 
            />

            <DataTable 
                columns={columns} 
                data={filteredMembers} 
                loading={loading} 
                emptyMessage="No fee records found for the selected filter." 
                renderRow={renderRow} 
            />

            {/* Payment Modal */}
            {isModalOpen && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">Update Payment</h3>
                            <p className="text-xs text-slate-500">Record fee for {selectedMember.firstName} {selectedMember.lastName}</p>
                        </div>
                        <form onSubmit={handlePaymentUpdate} className="p-4 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹)</label>
                                <input 
                                    type="number" 
                                    value={paymentForm.amountPaid} 
                                    onChange={(e) => setPaymentForm({...paymentForm, amountPaid: e.target.value})} 
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                                <select 
                                    value={paymentForm.paymentStatus} 
                                    onChange={(e) => setPaymentForm({...paymentForm, paymentStatus: e.target.value})}
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                >
                                    <option value="Paid">Paid (Full)</option>
                                    <option value="Partial">Partial Payment</option>
                                    <option value="Pending">Pending (Unpaid)</option>
                                </select>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-2">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" loading={updating}>Save Payment</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
