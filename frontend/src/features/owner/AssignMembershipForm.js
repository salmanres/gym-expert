import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import { 
    FiActivity, FiTag, FiCheckCircle, FiCreditCard, 
    FiDollarSign, FiPercent, FiCheck, FiInfo, FiFileText, FiAward, FiCalendar
} from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from '../../utils/toast';
import Loader from '../../components/page/Loader';
import { formatDate } from '../../utils/dateUtils';
import ReactSelect from 'react-select';

export default function AssignMembershipForm() {
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [members, setMembers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [gymSettings, setGymSettings] = useState(null);
    const [activeMemberships, setActiveMemberships] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [membershipId, setMembershipId] = useState(null);

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const [staffList, setStaffList] = useState([]);

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
        bonusDays: 0,
        trainerId: '',
        salesPersonId: '',
        reference: '',
        isPTConversion: false
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [memRes, planRes, gymRes, activeMemRes, staffRes] = await Promise.all([
                    apiClient.get('/members').catch(() => ({ data: [] })),
                    apiClient.get('/membership-plans').catch(() => ({ data: [] })),
                    apiClient.get('/gyms/my-gym').catch(() => ({ data: null })),
                    apiClient.get('/member-memberships/active').catch(() => ({ data: [] })),
                    apiClient.get('/staff').catch(() => ({ data: [] }))
                ]);
                setMembers(memRes.data || []);
                setMemberships(planRes.data || []);
                setGymSettings(gymRes.data);
                const activeMems = activeMemRes.data || [];
                setActiveMemberships(activeMems);
                setStaffList(staffRes.data || []);

                // Pre-fill if navigated from Member details
                if (location.state?.member) {
                    const mem = location.state.member;
                    const activeMem = activeMems.find(m => (m.memberId?._id || m.memberId) === mem._id) || mem.activeMembership;
                    const isFullyPaid = activeMem && (activeMem.paymentStatus === 'Paid' || (activeMem.balanceAmount || 0) <= 0);

                    if (activeMem && (location.state.isEdit || !isFullyPaid)) {
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
                            paidUntilDate: activeMem.paidUntilDate ? new Date(activeMem.paidUntilDate).toISOString().split('T')[0] : '',
                            useWallet: false,
                            walletUsed: 0,
                            bonusDays: activeMem.bonusDays || 0
                        }));
                    } else if (activeMem && isFullyPaid) {
                        // Member has fully paid active plan: default to Future/Scheduled plan starting day after current plan ends
                        const activeEnd = new Date(activeMem.paidUntilDate || activeMem.endDate);
                        const futureStartDate = activeEnd.toISOString().split('T')[0];

                        setEditMode(false);
                        setMembershipId(null);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            planStartDate: futureStartDate
                        }));
                    } else {
                        setEditMode(false);
                        setMembershipId(null);
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

                const planNameStr = String(plan?.name || '').toLowerCase();
                const planTypeStr = Array.isArray(plan?.planType) 
                    ? plan.planType.join(' ').toLowerCase() 
                    : String(plan?.planType || '').toLowerCase();
                const isExplicitPTPlan = planTypeStr.includes('personal training') || planTypeStr.includes('pt') || planNameStr.includes('personal training') || planNameStr.includes('pt package');

                setFormData(prev => ({ 
                    ...prev, 
                    planEndDate: maxEndDateStr,
                    amountPaid: editMode ? prev.amountPaid : net, 
                    totalSessions: totalSess,
                    isPTConversion: isExplicitPTPlan ? true : false,
                    paidUntilDate: '' 
                }));
            }
        }
    }, [formData.membershipPlanId, formData.planStartDate, formData.discount, memberships, editMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const updated = { 
                ...prev, 
                [name]: type === 'checkbox' ? checked : value 
            };

            // When Reference Staff / Sales Person is selected, sync reference text automatically
            if (name === 'salesPersonId' && value) {
                const selectedStaff = staffList.find(s => s._id === value);
                if (selectedStaff && (!prev.reference || prev.reference.trim() === '' || staffList.some(s => s.name === prev.reference))) {
                    updated.reference = selectedStaff.name;
                }
            }

            return updated;
        });
    };

    const handleSelectChange = (name, selectedOption) => {
        if (Array.isArray(selectedOption)) {
            setFormData(prev => ({ ...prev, [name]: selectedOption.map(opt => opt.value) }));
        } else {
            const val = selectedOption ? selectedOption.value : '';
            setFormData(prev => {
                const updated = { ...prev, [name]: val };
                if (name === 'memberId') {
                    const activeMem = activeMemberships.find(m => (m.memberId?._id || m.memberId) === val);
                    const isFullyPaid = activeMem && (activeMem.paymentStatus === 'Paid' || (activeMem.balanceAmount || 0) <= 0);

                    if (activeMem && isFullyPaid) {
                        const activeEnd = new Date(activeMem.paidUntilDate || activeMem.endDate);
                        activeEnd.setDate(activeEnd.getDate() + 1);
                        updated.planStartDate = activeEnd.toISOString().split('T')[0];
                        setEditMode(false);
                        setMembershipId(null);
                    } else if (activeMem && !isFullyPaid) {
                        updated.planStartDate = new Date(activeMem.startDate).toISOString().split('T')[0];
                        setEditMode(true);
                        setMembershipId(activeMem._id);
                    } else {
                        updated.planStartDate = new Date().toISOString().split('T')[0];
                        setEditMode(false);
                        setMembershipId(null);
                    }
                } else if (name === 'membershipPlanId') {
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
            toast.success(`Coupon "${codeUpper}" Applied! ${parts.join(' ')}`);
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
            toast.success(`Referral Coupon Applied! ₹${discountAmt} Discount granted (${refereeDiscountPercent}% OFF).`);
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
        toast.success(`Coupon "${codeUpper}" Applied! Discount of ₹${discountAmt} applied.`);
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
                bonusDays: formData.bonusDays,
                trainerId: formData.trainerId || undefined,
                salesPersonId: formData.salesPersonId || undefined,
                reference: formData.reference || undefined,
                isPTConversion: formData.isPTConversion
            };

            if (editMode && membershipId) {
                await apiClient.put(`/member-memberships/${membershipId}`, payload);
                toast.success("Membership updated & payment details saved!");
            } else {
                await apiClient.post('/member-memberships', payload);
                toast.success(`Membership assigned & payment of ₹${paid + walletVal} recorded successfully!`);
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
        control: (provided, state) => ({
            ...provided,
            minHeight: '42px',
            borderRadius: '0.75rem',
            borderColor: state.isFocused ? '#CA0410' : '#cbd5e1',
            backgroundColor: '#ffffff',
            boxShadow: state.isFocused ? '0 0 0 4px rgba(202, 4, 16, 0.1)' : 'none',
            '&:hover': { borderColor: '#CA0410' },
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#1e293b'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#CA0410' : state.isFocused ? '#FFF5F5' : 'transparent',
            color: state.isSelected ? 'white' : '#475569',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            ':active': { backgroundColor: '#FEE2E2' }
        })
    };

    if (loading) return <Loader text="Loading subscription details..." />;

    const availableCoupons = (gymSettings?.couponOffers || []).filter(c => c.isActive);
    const amountPaidNum = Number(formData.amountPaid) || 0;
    const walletBalanceAvailable = selectedMember?.walletBalance || 0;
    const calculatedWalletUsed = formData.useWallet ? Math.min(walletBalanceAvailable, netPayable) : 0;
    const totalCollected = amountPaidNum + calculatedWalletUsed;
    const remainingBalance = Math.max(0, netPayable - totalCollected);

    const selectedMemberActiveMem = activeMemberships.find(m => (m.memberId?._id || m.memberId) === formData.memberId);

    return (
        <PageLayout>
            <PageHeader 
                title={location.state?.isRenew ? "Renew Membership & Payment" : (editMode ? "Update Membership & Payment" : "Assign Membership & Process Payment")} 
                subtitle={location.state?.isRenew ? "Start a new subscription cycle and record payment" : (editMode ? "Edit subscription plan and process payment details" : "Assign a subscription plan and process payment on the same screen")} 
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 bg-[#FAEEEF]">
                <div className="max-w-7xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                        
                        {selectedMemberActiveMem && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-950 shadow-2xs">
                                <div className="flex items-start gap-3">
                                    <FiCalendar className="text-[#CA0410] text-lg shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-extrabold text-sm text-slate-900">
                                            {editMode ? `Editing Active Plan: ${selectedMemberActiveMem.planName || 'Current Plan'}` : `Member Active Till ${formatDate(selectedMemberActiveMem.paidUntilDate || selectedMemberActiveMem.endDate)}`}
                                        </p>
                                        <p className="mt-0.5 text-slate-600 font-medium">
                                            {editMode 
                                                ? `You are modifying details for the active membership.`
                                                : `This new plan will be saved as a Scheduled (Future) Plan starting on ${formData.planStartDate ? formatDate(formData.planStartDate) : 'future date'}.`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editMode) {
                                            setEditMode(false);
                                            setMembershipId(null);
                                            const activeEnd = new Date(selectedMemberActiveMem.paidUntilDate || selectedMemberActiveMem.endDate);
                                            activeEnd.setDate(activeEnd.getDate() + 1);
                                            setFormData(prev => ({
                                                ...prev,
                                                planStartDate: activeEnd.toISOString().split('T')[0]
                                            }));
                                        } else {
                                            setEditMode(true);
                                            setMembershipId(selectedMemberActiveMem._id);
                                            setFormData(prev => ({
                                                ...prev,
                                                membershipPlanId: selectedMemberActiveMem.membershipPlanId?._id || selectedMemberActiveMem.membershipPlanId || '',
                                                planStartDate: new Date(selectedMemberActiveMem.startDate).toISOString().split('T')[0],
                                                planEndDate: new Date(selectedMemberActiveMem.endDate).toISOString().split('T')[0]
                                            }));
                                        }
                                    }}
                                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                                >
                                    {editMode ? 'Switch to Schedule Future Plan' : 'Edit Active Plan Instead'}
                                </button>
                            </div>
                        )}

                        {/* SECTION 1: MEMBERSHIP ASSIGNMENT DETAILS */}
                        <FormSection title="Assignment Details" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            
                            <div className="col-span-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold text-slate-600">Select Member <span className="text-rose-500">*</span></label>
                                    {selectedMember && walletBalanceAvailable > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-50 text-[#CA0410] border border-rose-200 px-2 py-0.5 rounded-md">
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
                            <Input type="number" label="Total PT / Sessions Limit" name="totalSessions" value={formData.totalSessions} onChange={handleChange} placeholder="e.g. 12 or 24 sessions (0 for unlimited)" />
                            <Input type="number" label="Bonus Days (Optional)" name="bonusDays" value={formData.bonusDays} onChange={handleChange} placeholder="e.g. 5" />
                            
                            {/* Referral / Discount Coupon Box */}
                            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 p-4 bg-rose-50/50 border border-rose-200/80 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                                        <FiTag className="text-[#CA0410]" /> Active Coupon Offer / Referral Code
                                    </span>
                                    {appliedCoupon && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-[#CA0410] px-2.5 py-0.5 rounded-full">
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
                                                className="h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#CA0410] cursor-pointer"
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
                                                className="flex-1 h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#CA0410] uppercase tracking-wider"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleApplyCoupon()}
                                                className="px-4 h-10 bg-[#CA0410] hover:bg-[#a8030d] text-white font-extrabold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-rose-200">
                                        <div>
                                            <div className="text-xs font-extrabold text-slate-900 font-mono">
                                                {appliedCoupon.code} - <span className="text-[#CA0410]">{appliedCoupon.description}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                Discount of ₹{appliedCoupon.discountAmount} applied.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveCoupon}
                                            className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                                        >
                                            Remove Coupon
                                        </button>
                                    </div>
                                )}
                            </div>

                        </FormSection>

                        {/* SECTION: TRAINER & SALES ATTRIBUTION */}
                        <FormSection title="Trainer, Sales & Reference Attribution" icon={<FiAward />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Assigned Trainer</label>
                                <select
                                    name="trainerId"
                                    value={formData.trainerId}
                                    onChange={handleChange}
                                    className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#CA0410]"
                                >
                                    <option value="">-- Select Trainer --</option>
                                    {staffList.map(s => (
                                        <option key={s._id} value={s._id}>{s.name} ({s.role || 'Staff'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Referred By / Sales Person (Staff)</label>
                                <select
                                    name="salesPersonId"
                                    value={formData.salesPersonId}
                                    onChange={handleChange}
                                    className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#CA0410]"
                                >
                                    <option value="">-- Select Reference Staff --</option>
                                    {staffList.map(s => (
                                        <option key={s._id} value={s._id}>{s.name} ({s.role || 'Staff'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-1">
                                <Input 
                                    type="text" 
                                    label="Reference Note / Source" 
                                    name="reference" 
                                    value={formData.reference} 
                                    onChange={handleChange} 
                                    placeholder="Auto-filled or enter custom ref..." 
                                />
                            </div>

                            <div className="col-span-1 flex flex-col justify-end">
                                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors h-10">
                                    <input 
                                        type="checkbox" 
                                        name="isPTConversion" 
                                        checked={formData.isPTConversion} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, isPTConversion: e.target.checked }))} 
                                        className="w-4 h-4 text-[#CA0410] rounded focus:ring-[#CA0410]" 
                                    />
                                    <span className="text-xs font-extrabold text-slate-700">PT Conversion</span>
                                </label>
                            </div>
                        </FormSection>

                        {/* SECTION 2: PAYMENT & FINANCIAL SUMMARY */}
                        <FormSection title="Payment Collection & Receipt Details" icon={<FiCreditCard />} className="space-y-5">
                            
                            {/* Dynamic Price Summary Header Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Plan Fee (₹)</p>
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
                                        className="w-full h-9 text-sm font-black text-slate-800 bg-slate-50 border border-slate-200 px-3 rounded-lg focus:bg-white focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                                        placeholder={selectedPlan ? String(selectedPlan.price || 0) : "0"}
                                    />
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Discount (₹)</p>
                                    <input 
                                        type="number"
                                        name="discount"
                                        value={formData.discount}
                                        onChange={handleChange}
                                        className="w-full h-9 text-sm font-black text-[#CA0410] bg-rose-50/50 border border-rose-200 px-3 rounded-lg focus:bg-white focus:outline-none focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
                                    <p className="text-[10px] font-extrabold text-[#CA0410] uppercase tracking-wider">Net Payable</p>
                                    <p className="text-lg font-black text-[#CA0410] mt-0.5">₹{netPayable.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
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
                                <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox"
                                            id="useWallet"
                                            name="useWallet"
                                            checked={formData.useWallet}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-[#CA0410] rounded-md focus:ring-[#CA0410] cursor-pointer"
                                        />
                                        <label htmlFor="useWallet" className="text-xs font-bold text-slate-800 cursor-pointer">
                                            Use Member Wallet Balance (Available: <span className="font-black text-[#CA0410]">₹{walletBalanceAvailable}</span>)
                                        </label>
                                    </div>
                                    {formData.useWallet && (
                                        <span className="text-xs font-extrabold text-[#CA0410] bg-white px-3 py-1 rounded-lg border border-rose-200 shadow-2xs">
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
                                        className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#CA0410] cursor-pointer"
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
                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 pt-2">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/membership')} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting} className="w-full sm:w-auto px-8 bg-[#CA0410] hover:bg-[#a8030d] text-white font-bold">
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
