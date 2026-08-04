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
        transactionId: autoOpenMember?.transactionId || ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [memRes, memberRes, activeRes] = await Promise.all([
                    apiClient.get('/membership-plans'),
                    apiClient.get('/members'),
                    apiClient.get('/member-memberships/active')
                ]);
                setMemberships(memRes.data.filter(m => m.isActive));
                
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
                        transactionId: freshMember.transactionId || ''
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
            }
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let updates = { [name]: value };
        
        let newDisc = name === 'discount' ? parseFloat(value || 0) : parseFloat(formData.discount || 0);
        let newBase = name === 'baseAmount' ? parseFloat(value || 0) : parseFloat(formData.baseAmount || 0);
        let newFinal = Math.max(0, newBase - newDisc);
        
        let previouslyPaid = parseFloat(formData.previouslyPaid || 0);
        let newPayment = name === 'newPaymentAmount' ? parseFloat(value || 0) : parseFloat(formData.newPaymentAmount || 0);
        let totalPaidNow = previouslyPaid + newPayment;
        
        if (name === 'discount' || name === 'baseAmount') {
            updates.finalAmount = newFinal;
        }

        if (name === 'newPaymentAmount' || name === 'discount' || name === 'baseAmount') {
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

            let totalAmountPaidCalculated = (selectedMember?.amountPaid || 0) + parseFloat(formData.newPaymentAmount || 0);
            
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
                discount: formData.discount,
                finalAmount: formData.finalAmount,
                paymentMode: formData.paymentMode,
                transactionId: formData.transactionId,
                paymentDate: new Date().toISOString(),
                paidUntilDate: updatedPaidUntil,
                recordTransaction: true,
                newPaymentAmount: newPaymentAmountValue > 0 ? newPaymentAmountValue : 0
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
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <FormSection title="Payment Details" icon={<FiDollarSign />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            
                            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
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

                            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
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
                            
                            <Input type="number" label="Base Amount (₹)" name="baseAmount" value={formData.baseAmount} readOnly className="bg-slate-50 cursor-not-allowed" />
                            <Input type="number" label="Discount (₹)" name="discount" value={formData.discount} onChange={handleChange} placeholder="e.g. 500" />
                            <Input type="number" label="Total Plan Fee (₹)" name="finalAmount" value={formData.finalAmount} readOnly className="bg-slate-50 font-bold text-slate-800 cursor-not-allowed" />

                            <Input type="number" label="Already Paid (₹)" name="previouslyPaid" value={formData.previouslyPaid} readOnly className="bg-blue-50 font-bold text-blue-700 cursor-not-allowed" />
                            
                            <Input type="number" label={`Remaining Balance: ₹${Math.max(0, formData.finalAmount - formData.previouslyPaid)}`} name="newPaymentAmount" value={formData.newPaymentAmount} onChange={handleChange} required placeholder="Enter new payment..." className="border-emerald-300 focus:border-emerald-600 font-bold bg-emerald-50/30" />
                            
                            <Select label="Payment Mode" name="paymentMode" value={formData.paymentMode} onChange={handleChange} options={['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other']} />
                            <Input type="text" label="Transaction ID (Optional)" name="transactionId" value={formData.transactionId} onChange={handleChange} placeholder="e.g. UPI-123456789" />

                            
                        </FormSection>

                        <div className="flex justify-end items-center gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/finance')}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting}>
                                Record Payment
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
