import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Button from '../../components/form/Button';
import ReactSelect from 'react-select';
import Loader from '../../components/page/Loader';
import { FiDollarSign } from 'react-icons/fi';

export default function PaymentForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const autoOpenMember = location.state?.autoOpenMember;
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [memberships, setMemberships] = useState([]);
    const [members, setMembers] = useState([]);
    const [gymSettings, setGymSettings] = useState(null);
    
    const [formData, setFormData] = useState({
        memberId: autoOpenMember?._id || '',
        membershipPlan: autoOpenMember?.membershipPlan?._id || '',
        baseAmount: autoOpenMember?.membershipPlan?.price || 0,
        discount: autoOpenMember?.discount || 0,
        finalAmount: (autoOpenMember?.membershipPlan?.price || 0) - (autoOpenMember?.discount || 0),
        previouslyPaid: autoOpenMember?.amountPaid || 0,
        newPaymentAmount: '',
        paymentStatus: autoOpenMember?.paymentStatus || 'Pending',
        paymentMode: autoOpenMember?.paymentMode || 'Cash',
        appliedCoupon: '',
        additionalDiscount: 0,
        useWallet: false
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [memRes, memberRes, activeRes, gymRes] = await Promise.all([
                    apiClient.get('/membership-plans'),
                    apiClient.get('/members'),
                    apiClient.get('/member-memberships/active'),
                    apiClient.get('/gyms/my-gym').catch(() => ({ data: null }))
                ]);
                setMemberships(memRes.data.filter(m => m.isActive));
                if (gymRes?.data) setGymSettings(gymRes.data);
                
                const activeMemberships = activeRes.data;
                const membersWithPlans = memberRes.data.map(member => {
                    const membership = activeMemberships.find(m => m.memberId?._id === member._id);
                    if (membership) {
                        member.membershipPlan = membership.membershipPlanId;
                        member.activeMembership = membership;
                        member.paymentStatus = membership.paymentStatus;
                        member.amountPaid = membership.paidAmount;
                        member.planStartDate = membership.startDate;
                        member.paidUntilDate = membership.paidUntilDate;
                        member.balanceAmount = membership.balanceAmount;
                        member.discount = membership.discount;
                        member.finalAmount = membership.finalPrice;
                    }
                    return member;
                }).filter(m => m.membershipPlan); // Only show members with active plans
                
                setMembers(membersWithPlans);
                setLoading(false);

                if (autoOpenMember) {
                    const freshMember = membersWithPlans.find(m => m._id === autoOpenMember._id) || autoOpenMember;
                    setFormData(prev => ({
                        ...prev,
                        memberId: freshMember._id,
                        membershipPlan: freshMember.membershipPlan?._id || '',
                        baseAmount: freshMember.membershipPlan?.price || 0,
                        discount: freshMember.discount || 0,
                        finalAmount: freshMember.finalAmount || ((freshMember.membershipPlan?.price || 0) - (freshMember.discount || 0)),
                        previouslyPaid: freshMember.amountPaid || 0,
                        newPaymentAmount: '',
                        paymentStatus: freshMember.paymentStatus || 'Pending',
                        paymentMode: freshMember.paymentMode || 'Cash',
                        transactionId: freshMember.transactionId || '',
                        walletUsed: '',
                        additionalDiscount: 0
                    }));
                }
            } catch (err) {
                toast.error("Failed to fetch necessary data");
                setLoading(false);
            }
        };
        fetchData();
    }, [autoOpenMember]);

    const handleSelectChange = (name, selectedOption) => {
        const value = selectedOption ? selectedOption.value : '';
        let updates = { [name]: value };

        if (name === 'memberId') {
            const selectedMember = members.find(m => m._id === value);
            if (selectedMember) {
                updates.membershipPlan = selectedMember.membershipPlan?._id || '';
                updates.baseAmount = selectedMember.membershipPlan?.price || 0;
                updates.discount = selectedMember.discount || 0;
                updates.finalAmount = selectedMember.finalAmount || Math.max(0, updates.baseAmount - updates.discount);
                updates.previouslyPaid = selectedMember.amountPaid || 0;
                updates.newPaymentAmount = '';
                updates.paymentStatus = selectedMember.paymentStatus || 'Pending';
                updates.paymentMode = selectedMember.paymentMode || 'Cash';
                updates.transactionId = selectedMember.transactionId || '';
                updates.walletUsed = '';
                updates.additionalDiscount = 0;
            }
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let updates = { [name]: value };
        
        let initialDisc = parseFloat(formData.discount || 0);
        let additionalDisc = name === 'additionalDiscount' ? parseFloat(value || 0) : parseFloat(formData.additionalDiscount || 0);
        let totalDisc = initialDisc + additionalDisc;
        
        let newBase = parseFloat(formData.baseAmount || 0);
        let newFinal = Math.max(0, newBase - totalDisc);
        
        let walletAmt = (name === 'useWallet' && !e.target.checked) ? 0 : 
                        (name === 'walletUsed' ? parseFloat(value || 0) : 
                        (formData.useWallet ? parseFloat(formData.walletUsed || 0) : 0));
        
        let previouslyPaid = parseFloat(formData.previouslyPaid || 0);
        let newPayment = name === 'newPaymentAmount' ? parseFloat(value || 0) : parseFloat(formData.newPaymentAmount || 0);
        let totalPaidNow = previouslyPaid + newPayment + walletAmt;
        
        if (name === 'additionalDiscount') {
            updates.finalAmount = newFinal;
        }

        if (name === 'useWallet') {
            updates.useWallet = e.target.checked;
            if (!e.target.checked) updates.walletUsed = '';
        }

        if (name === 'newPaymentAmount' || name === 'walletUsed' || name === 'additionalDiscount' || name === 'useWallet') {
            if (totalPaidNow >= newFinal && newFinal > 0) {
                updates.paymentStatus = 'Paid';
            } else if (totalPaidNow > 0 && totalPaidNow < newFinal) {
                updates.paymentStatus = 'Partial';
            } else if (totalPaidNow <= 0) {
                updates.paymentStatus = 'Pending';
            }
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleCouponChange = (e) => {
        const code = e.target.value;
        setFormData(prev => ({ ...prev, appliedCoupon: code }));
        
        if (!code) return;

        const coupon = gymSettings?.couponOffers?.find(c => c.code === code);
        if (coupon) {
            let discountAmt = 0;
            const baseAmount = parseFloat(formData.baseAmount || 0);
            
            if (coupon.discountValue > 0) {
                if (coupon.discountType === 'Percentage') {
                    discountAmt = baseAmount > 0 ? Math.round((baseAmount * coupon.discountValue) / 100) : 0;
                } else {
                    discountAmt = coupon.discountValue || 0;
                }
            }

            const newFinal = Math.max(0, baseAmount - discountAmt);
            
            setFormData(prev => ({ 
                ...prev, 
                discount: discountAmt,
                finalAmount: newFinal
            }));
            toast.success(`Coupon applied! ₹${discountAmt} discount calculated.`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.memberId) {
            toast.error("Please select a member.");
            return;
        }

        setSubmitting(true);
        try {
            const selectedMember = members.find(m => m._id === formData.memberId);
            const plan = memberships.find(m => m._id === formData.membershipPlan) || selectedMember?.membershipPlan;
            
            let updatedPaidUntil = selectedMember?.paidUntilDate;

            let totalAmountPaidCalculated = (selectedMember?.amountPaid || 0) + parseFloat(formData.newPaymentAmount || 0) + parseFloat(formData.walletUsed || 0);
            
            // Recalculate paid until based on new total amount
            if (plan && plan.price > 0) {
                let totalDurationDays = 0;
                if (plan.durationUnit === 'Days') totalDurationDays = plan.duration;
                else if (plan.durationUnit === 'Weeks') totalDurationDays = plan.duration * 7;
                else if (plan.durationUnit === 'Months') totalDurationDays = plan.duration * 30;
                else if (plan.durationUnit === 'Years') totalDurationDays = plan.duration * 365;

                if (totalDurationDays > 0) {
                    if (totalAmountPaidCalculated <= 0) {
                        updatedPaidUntil = null;
                    } else {
                        const pricePerDay = plan.price / totalDurationDays;
                        const daysPaidFor = Math.floor(totalAmountPaidCalculated / pricePerDay);
                        
                        let paidUntil = new Date(selectedMember.planStartDate || Date.now());
                        paidUntil.setDate(paidUntil.getDate() + daysPaidFor);
                        updatedPaidUntil = paidUntil.toISOString().split('T')[0];
                    }
                }
            }

            const newPaymentAmountValue = parseFloat(formData.newPaymentAmount || 0);

            await apiClient.put(`/members/${formData.memberId}`, {
                ...selectedMember,
                paymentStatus: formData.paymentStatus,
                amountPaid: totalAmountPaidCalculated,
                discount: parseFloat(formData.discount || 0) + parseFloat(formData.additionalDiscount || 0),
                finalAmount: formData.finalAmount,
                paymentMode: formData.paymentMode,
                transactionId: formData.transactionId,
                paymentDate: new Date().toISOString(),
                paidUntilDate: updatedPaidUntil,
                recordTransaction: true,
                newPaymentAmount: newPaymentAmountValue > 0 ? newPaymentAmountValue : 0,
                walletUsed: formData.walletUsed
            });

            toast.success("Payment recorded successfully!");
            navigate(`/dashboard/owner/finance/receipt/${formData.memberId}`);
        } catch (error) {
            toast.error("Failed to record payment");
            setSubmitting(false);
        }
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            minHeight: '40px',
            borderRadius: '0.5rem',
            borderColor: '#e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#10b981'
            },
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#1e293b'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#ecfdf5' : 'transparent',
            color: state.isSelected ? 'white' : '#475569',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            ':active': {
                backgroundColor: '#d1fae5'
            }
        })
    };

    if (loading) return <Loader text="Loading payment details..." />;

    return (
        <PageLayout>
            <PageHeader 
                title="Collect Payment" 
                subtitle="Record fee payments, discounts, and transaction details" 
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form id="paymentForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
                        
                        {/* Section 1: Membership Summary */}
                        <FormSection title="Membership Summary" icon={<FiDollarSign />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="col-span-1 sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Member <span className="text-rose-500">*</span></label>
                                <ReactSelect
                                    options={members.map(m => ({
                                        value: m._id,
                                        label: `${m.firstName} ${m.lastName || ''}`.trim() + ` (${m.contactNumber})`
                                    }))}
                                    value={formData.memberId ? { value: formData.memberId, label: members.find(m => m._id === formData.memberId) ? `${members.find(m => m._id === formData.memberId).firstName} ${members.find(m => m._id === formData.memberId).lastName || ''}`.trim() + ` (${members.find(m => m._id === formData.memberId).contactNumber})` : 'Select...' } : null}
                                    onChange={(val) => handleSelectChange('memberId', val)}
                                    styles={customStyles}
                                    placeholder="Search Member..."
                                />
                            </div>

                            <div className="col-span-1 sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Membership Plan</label>
                                <ReactSelect
                                    options={memberships.map(m => ({
                                        value: m._id,
                                        label: `${m.name} (₹${m.price})`
                                    }))}
                                    value={formData.membershipPlan ? { value: formData.membershipPlan, label: memberships.find(m => m._id === formData.membershipPlan) ? `${memberships.find(m => m._id === formData.membershipPlan).name} (₹${memberships.find(m => m._id === formData.membershipPlan).price})` : 'N/A' } : null}
                                    onChange={(val) => handleSelectChange('membershipPlan', val)}
                                    styles={customStyles}
                                    isDisabled={true}
                                />
                            </div>

                            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                <Input type="text" label="Original Price (₹)" name="baseAmount" value={Number(formData.baseAmount || 0).toLocaleString()} disabled className="bg-slate-50 font-bold" />
                            </div>
                            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                <Input type="text" label="Initial Discount (₹)" name="discount" value={Number(formData.discount || 0).toLocaleString()} disabled className="bg-slate-50 font-bold text-rose-500" />
                            </div>
                            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                <Input type="text" label="Already Paid (₹)" name="previouslyPaid" value={Number(formData.previouslyPaid || 0).toLocaleString()} disabled className="bg-slate-50 font-bold text-blue-600" />
                            </div>
                            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                <Input type="text" label="Amount Due (₹)" name="amountDue" value={Math.max(0, Number(formData.baseAmount - formData.discount) - Number(formData.previouslyPaid || 0)).toLocaleString()} disabled className="bg-slate-50 font-black text-slate-800" />
                            </div>
                        </FormSection>

                        {/* Layout for Payment Section (Right) & Summary (Left) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* LEFT: Payment Summary Receipt */}
                            <div className="lg:col-span-5 w-full">
                                <FormSection title="Payment Summary" icon={<FiDollarSign />} className="flex flex-col h-full">
                                    <div className="w-full bg-slate-900 text-slate-300 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
                                        
                                        {/* Premium subtle background glow */}
                                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
                                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-20"></div>

                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="text-white font-black tracking-widest uppercase text-sm">Invoice</h4>
                                                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                                    <FiDollarSign className="text-emerald-400 text-xs" />
                                                </div>
                                            </div>

                                            <div className="space-y-4 font-mono text-sm">
                                                <div className="flex justify-between items-center group">
                                                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors">Amount Due</span>
                                                    <span className="font-bold text-white">₹{Math.max(0, Number(formData.baseAmount - formData.discount) - Number(formData.previouslyPaid || 0)).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center group">
                                                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors">Additional Discount</span>
                                                    <span className="text-rose-400 font-bold">-₹{Number(formData.additionalDiscount || 0).toLocaleString()}</span>
                                                </div>
                                                
                                                <div className="my-4 border-t border-dashed border-slate-700"></div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-300 font-semibold uppercase tracking-wider text-xs">Total Payable</span>
                                                    <span className="font-black text-white text-lg">₹{Math.max(0, Number(formData.baseAmount - formData.discount) - Number(formData.previouslyPaid || 0) - Number(formData.additionalDiscount || 0)).toLocaleString()}</span>
                                                </div>

                                                <div className="my-4 border-t border-dashed border-slate-700"></div>

                                                <div className="flex justify-between items-center group">
                                                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors">Wallet Used</span>
                                                    <span className="text-blue-400 font-bold">₹{Number(formData.useWallet ? (formData.walletUsed || 0) : 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center group">
                                                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{formData.paymentMode || 'Payment'}</span>
                                                    <span className="text-emerald-400 font-bold">₹{Number(formData.newPaymentAmount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative z-10 mt-8 pt-6 border-t-2 border-slate-800">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Remaining Balance</span>
                                                <span className="text-3xl font-black text-white tracking-tight">₹{Math.max(0, (Number(formData.baseAmount - formData.discount) - Number(formData.previouslyPaid || 0) - Number(formData.additionalDiscount || 0)) - (Number(formData.newPaymentAmount || 0) + Number(formData.useWallet ? (formData.walletUsed || 0) : 0))).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </FormSection>
                            </div>

                            {/* RIGHT: Collect Payment */}
                            <div className="lg:col-span-7 w-full">
                                <FormSection title="Collect Payment" icon={<FiDollarSign />} className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                                    <div className="col-span-1 sm:col-span-2">
                                        <Input 
                                            type="number" 
                                            label="Amount to Pay (₹)" 
                                            name="newPaymentAmount" 
                                            value={formData.newPaymentAmount} 
                                            onChange={handleChange} 
                                            required 
                                            placeholder="Enter amount..." 
                                            className="text-xl py-3 border-emerald-300 focus:border-emerald-600 font-bold bg-emerald-50/30 text-emerald-900 placeholder:text-emerald-300" 
                                        />
                                    </div>
                                    
                                    <div className="col-span-1 sm:col-span-1">
                                        <Select 
                                            label="Payment Method" 
                                            name="paymentMode" 
                                            value={formData.paymentMode} 
                                            onChange={handleChange} 
                                            options={['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other']} 
                                        />
                                    </div>

                                    <div className="col-span-1 sm:col-span-1">
                                        <Input 
                                            type="number" 
                                            label="Additional Discount (₹)" 
                                            name="additionalDiscount" 
                                            value={formData.additionalDiscount} 
                                            onChange={handleChange} 
                                            placeholder="e.g. 500" 
                                        />
                                    </div>
                                    
                                    <div className="col-span-1 sm:col-span-2 mt-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="flex-1">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <div className="relative flex items-center">
                                                        <input 
                                                            type="checkbox" 
                                                            name="useWallet" 
                                                            checked={formData.useWallet} 
                                                            onChange={handleChange} 
                                                            disabled={!formData.memberId || (members.find(m => m._id === formData.memberId)?.walletBalance || 0) <= 0}
                                                            className="peer sr-only"
                                                        />
                                                        <div className={`w-10 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${(!formData.memberId || (members.find(m => m._id === formData.memberId)?.walletBalance || 0) <= 0) ? 'opacity-50' : 'peer-checked:bg-emerald-500'}`}></div>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-extrabold text-slate-800 block">Use Wallet</span>
                                                        <span className="text-xs font-bold text-slate-500">Available: ₹{members.find(m => m._id === formData.memberId)?.walletBalance || 0}</span>
                                                    </div>
                                                </label>
                                            </div>
                                            
                                            {formData.useWallet && (
                                                <div className="flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <Input
                                                        type="number"
                                                        label="Wallet Amount (₹)"
                                                        name="walletUsed"
                                                        value={formData.walletUsed}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            const maxWallet = members.find(m => m._id === formData.memberId)?.walletBalance || 0;
                                                            if (val <= maxWallet) handleChange(e);
                                                        }}
                                                        placeholder="Amount to deduct"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-1 sm:col-span-2 mt-2">
                                        <Input type="text" label="Transaction ID (Optional)" name="transactionId" value={formData.transactionId} onChange={handleChange} placeholder="e.g. UPI-123456789" />
                                    </div>
                                </FormSection>
                            </div>
                        </div>

                        <div className="flex justify-end items-center gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/finance')}>
                                Cancel
                            </Button>
                            <Button type="submit" form="paymentForm" loading={submitting}>
                                Record Payment
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
