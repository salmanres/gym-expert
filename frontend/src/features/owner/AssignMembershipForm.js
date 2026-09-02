import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import { 
    FiActivity, FiTag, FiCheckCircle, FiCreditCard, 
    FiDollarSign, FiPercent, FiCheck, FiInfo, FiFileText, FiAward
} from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import Loader from '../../components/page/Loader';
import ReactSelect from 'react-select';

export default function AssignMembershipForm() {
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [members, setMembers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [gymSettings, setGymSettings] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [membershipId, setMembershipId] = useState(null);

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const [formData, setFormData] = useState({
        memberId: '',
        membershipPlanId: '',
        planStartDate: new Date().toISOString().split('T')[0],
        planEndDate: '',
        totalSessions: '',
        originalPrice: '',
        discount: 0,
        amountPaid: 0,
        paymentMode: 'Cash',
        transactionId: '',
        notes: '',
        paidUntilDate: '',
        useWallet: false,
        walletUsed: 0,
        bonusDays: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [memRes, planRes, gymRes] = await Promise.all([
                    apiClient.get('/members').catch(() => ({ data: [] })),
                    apiClient.get('/membership-plans').catch(() => ({ data: [] })),
                    apiClient.get('/gyms/my-gym').catch(() => ({ data: null }))
                ]);
                setMembers(memRes.data || []);
                setMemberships(planRes.data || []);
                setGymSettings(gymRes.data);

                // Pre-fill if navigated from Member details
                if (location.state?.member) {
                    const mem = location.state.member;
                    const activeMem = location.state.isRenew ? null : mem.activeMembership;
                    
                    if (activeMem) {
                        setEditMode(true);
                        setMembershipId(activeMem._id);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            membershipPlanId: activeMem.membershipPlanId ? (activeMem.membershipPlanId._id || activeMem.membershipPlanId) : '',
                            planStartDate: new Date(activeMem.startDate).toISOString().split('T')[0],
                            planEndDate: new Date(activeMem.endDate).toISOString().split('T')[0],
                            totalSessions: activeMem.totalSessions || '',
                            originalPrice: activeMem.originalPrice !== undefined ? activeMem.originalPrice : '',
                            discount: activeMem.discount || 0,
                            amountPaid: 0,
                            paymentMode: 'Cash',
                            transactionId: '',
                            notes: '',
                            paidUntilDate: '',
                            useWallet: false,
                            walletUsed: 0,
                            bonusDays: 0
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id
                        }));
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load members and plans");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.state]);

    // Selected plan and member objects
    const selectedMember = members.find(m => m._id === formData.memberId);
    const selectedPlan = memberships.find(p => p._id === formData.membershipPlanId);
    const planPrice = formData.originalPrice !== '' && formData.originalPrice !== null && formData.originalPrice !== undefined
        ? Number(formData.originalPrice)
        : (selectedPlan ? (selectedPlan.price || 0) : 0);
    const discountAmount = Number(formData.discount) || 0;
    const netPayable = Math.max(0, planPrice - discountAmount);

    // Auto-calculate plan end date & default payment amount when plan or start date changes
    useEffect(() => {
        if (formData.membershipPlanId && formData.planStartDate && memberships.length > 0) {
            let maxEndDate = null;
            let totalSess = 0;
            
            const plan = memberships.find(p => p._id === formData.membershipPlanId);
            if (plan) {
                totalSess = plan.sessions || 0;
                
                const startDateObj = new Date(formData.planStartDate);
                let duration = parseInt(plan.duration) || 0;
                let unit = plan.durationUnit ? plan.durationUnit.toLowerCase() : 'months';
                
                if (unit.includes('month')) {
                    startDateObj.setMonth(startDateObj.getMonth() + duration);
                } else if (unit.includes('day')) {
                    startDateObj.setDate(startDateObj.getDate() + duration);
                } else if (unit.includes('year')) {
                    startDateObj.setFullYear(startDateObj.getFullYear() + duration);
                } else if (unit.includes('week')) {
                    startDateObj.setDate(startDateObj.getDate() + (duration * 7));
                }
                
                maxEndDate = startDateObj;
            }

            if (maxEndDate) {
                const maxEndDateStr = maxEndDate.toISOString().split('T')[0];
                const currentPlanPrice = formData.originalPrice !== '' && formData.originalPrice !== null && formData.originalPrice !== undefined
                    ? Number(formData.originalPrice)
                    : (plan ? (plan.price || 0) : 0);
                const net = Math.max(0, currentPlanPrice - discountAmount);

                setFormData(prev => ({ 
                    ...prev, 
                    planEndDate: maxEndDateStr,
                    amountPaid: editMode ? prev.amountPaid : net, 
                    totalSessions: prev.totalSessions || totalSess,
                    paidUntilDate: '' 
                }));
            }
        }
    }, [formData.membershipPlanId, formData.planStartDate, formData.discount, memberships, editMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleSelectChange = (name, selectedOption) => {
        if (Array.isArray(selectedOption)) {
            setFormData(prev => ({ ...prev, [name]: selectedOption.map(opt => opt.value) }));
        } else {
            const val = selectedOption ? selectedOption.value : '';
            setFormData(prev => {
                const updated = { ...prev, [name]: val };
                if (name === 'membershipPlanId') {
                    const plan = memberships.find(p => p._id === val);
                    if (plan) {
                        const price = plan.price || 0;
                        const disc = Number(prev.discount) || 0;
                        updated.originalPrice = price;
                        updated.amountPaid = Math.max(0, price - disc);
                    }
                }
                return updated;
            });
        }
    };

    // Apply Referral / Discount Coupon Code
    const handleApplyCoupon = (overrideCode) => {
        const targetCode = overrideCode || couponCode;
        if (!targetCode || !targetCode.trim()) {
            toast.error("Please enter or select a coupon code");
            return;
        }

        const codeUpper = targetCode.trim().toUpperCase();
        const plan = memberships.find(p => p._id === formData.membershipPlanId);
        const pPrice = plan ? plan.price || 0 : 0;

        // Check 1: Check Gym Custom Created Coupons
        const createdCoupon = (gymSettings?.couponOffers || []).find(c => (c.code || '').toUpperCase() === codeUpper && c.isActive);

        if (createdCoupon) {
            let discountAmt = 0;
            if (createdCoupon.discountValue > 0) {
                if (createdCoupon.discountType === 'Percentage') {
                    discountAmt = pPrice > 0 ? Math.round((pPrice * createdCoupon.discountValue) / 100) : 0;
                } else {
                    discountAmt = createdCoupon.discountValue || 0;
                }
            }
            
            const bonus = createdCoupon.bonusDays || 0;
            const net = Math.max(0, pPrice - discountAmt);

            setFormData(prev => ({
                ...prev,
                discount: discountAmt,
                amountPaid: net,
                bonusDays: bonus
            }));
            
            let descDesc = createdCoupon.title;
            let parts = [];
            if (createdCoupon.discountValue > 0) {
                parts.push(createdCoupon.discountType === 'Percentage' ? `${createdCoupon.discountValue}% OFF` : `₹${createdCoupon.discountValue} OFF`);
            }
            if (bonus > 0) parts.push(`+${bonus} Free Days`);
            if (parts.length > 0) descDesc += ` (${parts.join(' ')})`;

            setAppliedCoupon({
                code: codeUpper,
                description: descDesc,
                discountAmount: discountAmt
            });
            setCouponCode(codeUpper);
            toast.success(`🎉 Coupon "${codeUpper}" Applied! ${parts.join(' ')}`);
            return;
        }

        // Check 2: Is it a Member Referral Code (e.g. MEM-0001)?
        const matchedMember = members.find(m => (m.memberId || '').toUpperCase() === codeUpper);

        if (matchedMember) {
            const refereeDiscountPercent = gymSettings?.refereeDiscountPercent || 10;
            const refereeBonusDays = gymSettings?.refereeBonusDays || 5;
            const discountAmt = pPrice > 0 ? Math.round((pPrice * refereeDiscountPercent) / 100) : 200;
            const net = Math.max(0, pPrice - discountAmt);

            setFormData(prev => ({
                ...prev,
                discount: discountAmt,
                amountPaid: net,
                bonusDays: refereeBonusDays
            }));
            setAppliedCoupon({
                code: codeUpper,
                description: `Referral Coupon (${matchedMember.firstName}) - ${refereeDiscountPercent}% OFF + ${refereeBonusDays} Bonus Days`,
                discountAmount: discountAmt
            });
            setCouponCode(codeUpper);
            toast.success(`🎉 Referral Coupon Applied! ₹${discountAmt} Discount granted (${refereeDiscountPercent}% OFF).`);
            return;
        }

        // Check 3: Standard Fallbacks
        let discountAmt = 0;
        let desc = '';

        if (codeUpper === 'WELCOME10') {
            discountAmt = pPrice > 0 ? Math.round((pPrice * 10) / 100) : 300;
            desc = 'Welcome Promo - 10% OFF';
        } else if (codeUpper === 'FIT500') {
            discountAmt = 500;
            desc = 'Fitness Special - ₹500 Flat OFF';
        } else {
            discountAmt = pPrice > 0 ? Math.round((pPrice * 10) / 100) : 200;
            desc = `Coupon "${codeUpper}" Applied`;
        }

        const net = Math.max(0, pPrice - discountAmt);

        setFormData(prev => ({
            ...prev,
            discount: discountAmt,
            amountPaid: net
        }));
        setAppliedCoupon({
            code: codeUpper,
            description: desc,
            discountAmount: discountAmt
        });
        setCouponCode(codeUpper);
        toast.success(`🎉 Coupon "${codeUpper}" Applied! Discount of ₹${discountAmt} applied.`);
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        const pPrice = selectedPlan ? selectedPlan.price || 0 : 0;
        setFormData(prev => ({
            ...prev,
            discount: 0,
            amountPaid: pPrice,
            bonusDays: 0
        }));
        toast.info("Coupon removed.");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.memberId || !formData.membershipPlanId) {
            toast.error("Please select a member and a membership plan.");
            return;
        }

        const paid = Number(formData.amountPaid) || 0;
        const walletBalanceAvailable = selectedMember?.walletBalance || 0;
        let walletVal = 0;

        if (formData.useWallet && walletBalanceAvailable > 0) {
            walletVal = Math.min(walletBalanceAvailable, netPayable);
        }

        setSubmitting(true);
        try {
            const payload = {
                memberId: formData.memberId,
                membershipPlans: [formData.membershipPlanId],
                planStartDate: formData.planStartDate,
                planEndDate: formData.planEndDate,
                totalSessions: formData.totalSessions,
                originalPrice: formData.originalPrice !== '' ? Number(formData.originalPrice) : undefined,
                amountPaid: paid,
                paymentMode: formData.paymentMode || 'Cash',
                transactionId: formData.transactionId || undefined,
                notes: formData.notes || undefined,
                paidUntilDate: formData.paidUntilDate || undefined,
                discount: formData.discount,
                couponCode: appliedCoupon ? appliedCoupon.code : undefined,
                walletUsed: walletVal,
                bonusDays: formData.bonusDays
            };

            if (editMode && membershipId) {
                await apiClient.put(`/member-memberships/${membershipId}`, payload);
                toast.success("Membership updated & payment details saved!");
            } else {
                await apiClient.post('/member-memberships', payload);
                toast.success(`🎉 Membership assigned & payment of ₹${paid + walletVal} recorded successfully!`);
            }
            
            const targetMemberId = location.state?.member?._id || formData.memberId;
            if (targetMemberId) {
                navigate(`/dashboard/owner/members/view/${targetMemberId}`, {
                    state: selectedMember ? { member: selectedMember } : undefined
                });
            } else {
                navigate('/dashboard/owner/members');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to assign membership and process payment");
            setSubmitting(false);
        }
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            minHeight: '42px',
            borderRadius: '0.75rem',
            borderColor: '#cbd5e1',
            backgroundColor: '#ffffff',
            boxShadow: 'none',
            '&:hover': { borderColor: '#10b981' },
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
            ':active': { backgroundColor: '#d1fae5' }
        })
    };

    if (loading) return <Loader text="Loading subscription details..." />;

    const availableCoupons = (gymSettings?.couponOffers || []).filter(c => c.isActive);
    const amountPaidNum = Number(formData.amountPaid) || 0;
    const walletBalanceAvailable = selectedMember?.walletBalance || 0;
    const calculatedWalletUsed = formData.useWallet ? Math.min(walletBalanceAvailable, netPayable) : 0;
    const totalCollected = amountPaidNum + calculatedWalletUsed;
    const remainingBalance = Math.max(0, netPayable - totalCollected);

    return (
        <PageLayout>
            <PageHeader 
                title={location.state?.isRenew ? "Renew Membership & Payment" : (editMode ? "Update Membership & Payment" : "Assign Membership & Process Payment")} 
                subtitle={location.state?.isRenew ? "Start a new subscription cycle and record payment" : (editMode ? "Edit subscription plan and process payment details" : "Assign a subscription plan and process payment on the same screen")} 
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                        
                        {/* SECTION 1: MEMBERSHIP ASSIGNMENT DETAILS */}
                        <FormSection title="Assignment Details" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            
                            <div className="col-span-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold text-slate-600">Select Member <span className="text-rose-500">*</span></label>
                                    {selectedMember && walletBalanceAvailable > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                                            <FiAward size={12} /> Wallet: ₹{walletBalanceAvailable}
                                        </span>
                                    )}
                                </div>
                                <ReactSelect
                                    options={members.map(m => ({
                                        value: m._id,
                                        label: `${m.firstName} ${m.lastName || ''}`.trim() + ` (${m.contactNumber})`
                                    }))}
                                    value={formData.memberId ? { 
                                        value: formData.memberId, 
                                        label: selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName || ''}`.trim() + ` (${selectedMember.contactNumber})` : 'Select...' 
                                    } : null}
                                    onChange={(val) => handleSelectChange('memberId', val)}
                                    styles={customStyles}
                                    placeholder="Search Member..."
                                />
                            </div>

                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Membership Plan <span className="text-rose-500">*</span></label>
                                <ReactSelect
                                    options={memberships.map(m => ({
                                        value: m._id,
                                        label: `${m.name} (₹${m.price} - ${m.duration} ${m.durationUnit})`
                                    }))}
                                    value={formData.membershipPlanId ? { 
                                        value: formData.membershipPlanId, 
                                        label: selectedPlan ? `${selectedPlan.name} (₹${selectedPlan.price} - ${selectedPlan.duration} ${selectedPlan.durationUnit})` : 'Select plan...' 
                                    } : null}
                                    onChange={(val) => handleSelectChange('membershipPlanId', val)}
                                    styles={customStyles}
                                    placeholder="Search and select a plan..."
                                />
                            </div>
                            
                            <Input type="date" label="Plan Start Date" name="planStartDate" value={formData.planStartDate} onChange={handleChange} required />
                            <Input type="date" label="Plan End Date" name="planEndDate" value={formData.planEndDate} onChange={handleChange} required />
                            <Input type="number" label="Total Sessions (if applicable)" name="totalSessions" value={formData.totalSessions} onChange={handleChange} placeholder="e.g. 12" />
                            <Input type="number" label="Bonus Days (Optional)" name="bonusDays" value={formData.bonusDays} onChange={handleChange} placeholder="e.g. 5" />
                            
                            {/* Referral / Discount Coupon Box */}
                            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 p-4 bg-linear-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200/80 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                                        <FiTag className="text-emerald-600" /> Active Coupon Offer / Referral Code
                                    </span>
                                    {appliedCoupon && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                                            <FiCheckCircle size={12} /> Coupon Active
                                        </span>
                                    )}
                                </div>

                                {!appliedCoupon ? (
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        {availableCoupons.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) handleApplyCoupon(e.target.value);
                                                }}
                                                className="h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
                                            >
                                                <option value="">-- Choose Gym Offer --</option>
                                                {availableCoupons.map((c, i) => (
                                                    <option key={i} value={c.code}>
                                                        {c.code} - {c.title} 
                                                        ({c.discountValue > 0 ? (c.discountType === 'Percentage' ? `${c.discountValue}% OFF ` : `₹${c.discountValue} OFF `) : ''}
                                                        {c.bonusDays > 0 ? `+${c.bonusDays} Free Days` : ''})
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        <div className="flex-1 flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                                placeholder="Enter Coupon / Referral (e.g. MEM-0001)"
                                                className="flex-1 h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 uppercase tracking-wider"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleApplyCoupon()}
                                                className="px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-colors shadow-xs"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-200">
                                        <div>
                                            <div className="text-xs font-extrabold text-slate-900 font-mono">
                                                {appliedCoupon.code} - <span className="text-emerald-700">{appliedCoupon.description}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                Discount of ₹{appliedCoupon.discountAmount} applied.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveCoupon}
                                            className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                                        >
                                            Remove Coupon
                                        </button>
                                    </div>
                                )}
                            </div>

                        </FormSection>

                        {/* SECTION 2: PAYMENT & FINANCIAL SUMMARY */}
                        <FormSection title="Payment Collection & Receipt Details" icon={<FiCreditCard />} className="space-y-5">
                            
                            {/* Dynamic Price Summary Header Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Plan Fee (₹)</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <input 
                                            type="number"
                                            name="originalPrice"
                                            value={formData.originalPrice}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData(prev => {
                                                    const priceNum = val !== '' ? Number(val) : (selectedPlan ? selectedPlan.price || 0 : 0);
                                                    const disc = Number(prev.discount) || 0;
                                                    return {
                                                        ...prev,
                                                        originalPrice: val,
                                                        amountPaid: editMode ? prev.amountPaid : Math.max(0, priceNum - disc)
                                                    };
                                                });
                                            }}
                                            className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md focus:outline-none focus:border-emerald-500"
                                            placeholder={selectedPlan ? String(selectedPlan.price || 0) : "0"}
                                        />
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Discount (₹)</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <input 
                                            type="number"
                                            name="discount"
                                            value={formData.discount}
                                            onChange={handleChange}
                                            className="w-full text-sm font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-200 px-2 py-0.5 rounded-md focus:outline-none focus:border-emerald-500"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/30">
                                    <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Net Payable</p>
                                    <p className="text-lg font-black text-emerald-700 mt-0.5">₹{netPayable.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Payment Status</p>
                                    <div className="mt-1">
                                        {remainingBalance === 0 && netPayable > 0 ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                                                <FiCheckCircle /> Full Paid
                                            </span>
                                        ) : totalCollected > 0 ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">
                                                <FiInfo /> Partial (Due: ₹{remainingBalance})
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md">
                                                Unpaid (Due: ₹{netPayable})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Wallet Usage Toggle */}
                            {selectedMember && walletBalanceAvailable > 0 && (
                                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox"
                                            id="useWallet"
                                            name="useWallet"
                                            checked={formData.useWallet}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <label htmlFor="useWallet" className="text-xs font-bold text-amber-900 cursor-pointer">
                                            Use Member Wallet Balance (Available: <span className="font-black text-amber-950">₹{walletBalanceAvailable}</span>)
                                        </label>
                                    </div>
                                    {formData.useWallet && (
                                        <span className="text-xs font-extrabold text-emerald-700 bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-2xs">
                                            Deducting ₹{calculatedWalletUsed} from wallet
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Payment Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                <Input 
                                    type="number" 
                                    label="Amount Received Today (₹)" 
                                    name="amountPaid" 
                                    value={formData.amountPaid} 
                                    onChange={handleChange} 
                                    placeholder="Enter paid amount" 
                                    required 
                                />

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Payment Method <span className="text-rose-500">*</span></label>
                                    <select
                                        name="paymentMode"
                                        value={formData.paymentMode}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI / GPay / PhonePe / Paytm</option>
                                        <option value="Card">Credit / Debit Card</option>
                                        <option value="Bank Transfer">Bank Transfer / Net Banking</option>
                                        <option value="Other">Other Mode</option>
                                    </select>
                                </div>

                                <Input 
                                    type="text" 
                                    label="Transaction Ref / UTR (Optional)" 
                                    name="transactionId" 
                                    value={formData.transactionId} 
                                    onChange={handleChange} 
                                    placeholder="e.g. UPI Ref / UTR" 
                                />

                                <Input 
                                    type="text" 
                                    label="Payment Notes (Optional)" 
                                    name="notes" 
                                    value={formData.notes} 
                                    onChange={handleChange} 
                                    placeholder="e.g. Paid initial installment" 
                                />
                            </div>

                        </FormSection>

                        {/* SUBMIT BUTTONS */}
                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/membership')} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting} className="w-full sm:w-auto px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black">
                                {editMode 
                                    ? `Update Plan & Process Payment (₹${totalCollected})` 
                                    : `Assign Membership & Collect Payment (₹${totalCollected})`}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
