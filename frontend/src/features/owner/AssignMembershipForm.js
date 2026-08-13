import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import { FiActivity, FiTag, FiCheckCircle } from 'react-icons/fi';
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
        discount: '',
        amountPaid: '',
        paidUntilDate: '',
        walletUsed: '',
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
                            discount: activeMem.discount || '',
                            amountPaid: 0,
                            paidUntilDate: '',
                            walletUsed: '',
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

    // Auto-calculate plan end date based on selected plan and start date
    useEffect(() => {
        if (formData.membershipPlanId && formData.planStartDate && memberships.length > 0) {
            let maxEndDate = null;
            let totalAmount = 0;
            let totalSess = 0;
            
            const plan = memberships.find(p => p._id === formData.membershipPlanId);
            if (plan) {
                totalAmount = plan.price || 0;
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
                const discountVal = Number(formData.discount) || 0;
                setFormData(prev => ({ 
                    ...prev, 
                    planEndDate: maxEndDateStr,
                    amountPaid: 0, 
                    totalSessions: prev.totalSessions || totalSess, 
                    paidUntilDate: '' 
                }));
            }
        }
    }, [formData.membershipPlanId, formData.planStartDate, formData.discount, memberships]);

    // Proportional paidUntilDate calculation removed as payments are handled separately.

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, selectedOption) => {
        if (Array.isArray(selectedOption)) {
            setFormData(prev => ({ ...prev, [name]: selectedOption.map(opt => opt.value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: selectedOption ? selectedOption.value : '' }));
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
        const planPrice = plan ? plan.price || 0 : 0;

        // Check 1: Check Gym Custom Created Coupons
        const createdCoupon = (gymSettings?.couponOffers || []).find(c => (c.code || '').toUpperCase() === codeUpper && c.isActive);

        if (createdCoupon) {
            let discountAmt = 0;
            if (createdCoupon.discountValue > 0) {
                if (createdCoupon.discountType === 'Percentage') {
                    discountAmt = planPrice > 0 ? Math.round((planPrice * createdCoupon.discountValue) / 100) : 0;
                } else {
                    discountAmt = createdCoupon.discountValue || 0;
                }
            }
            
            const bonus = createdCoupon.bonusDays || 0;

            setFormData(prev => ({
                ...prev,
                discount: discountAmt,
                amountPaid: 0,
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
            const discountAmt = planPrice > 0 ? Math.round((planPrice * refereeDiscountPercent) / 100) : 200;

            setFormData(prev => ({
                ...prev,
                discount: discountAmt,
                amountPaid: Math.max(0, planPrice - discountAmt),
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
            discountAmt = planPrice > 0 ? Math.round((planPrice * 10) / 100) : 300;
            desc = 'Welcome Promo - 10% OFF';
        } else if (codeUpper === 'FIT500') {
            discountAmt = 500;
            desc = 'Fitness Special - ₹500 Flat OFF';
        } else {
            discountAmt = planPrice > 0 ? Math.round((planPrice * 10) / 100) : 200;
            desc = `Coupon "${codeUpper}" Applied`;
        }

        setFormData(prev => ({
            ...prev,
            discount: discountAmt,
            amountPaid: Math.max(0, planPrice - discountAmt)
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
        const plan = memberships.find(p => p._id === formData.membershipPlanId);
        const planPrice = plan ? plan.price || 0 : 0;
        setFormData(prev => ({
            ...prev,
            discount: 0,
            amountPaid: 0,
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

        setSubmitting(true);
        try {
            const payload = {
                memberId: formData.memberId,
                membershipPlans: [formData.membershipPlanId], // Wrap in array for backend compatibility
                planStartDate: formData.planStartDate,
                planEndDate: formData.planEndDate,
                totalSessions: formData.totalSessions,
                amountPaid: formData.amountPaid,
                paidUntilDate: formData.paidUntilDate,
                discount: formData.discount,
                couponCode: appliedCoupon ? appliedCoupon.code : undefined,
                walletUsed: formData.walletUsed,
                bonusDays: formData.bonusDays
            };

            if (editMode && membershipId) {
                await apiClient.put(`/member-memberships/${membershipId}`, payload);
                toast.success("Membership updated successfully");
            } else {
                await apiClient.post('/member-memberships', payload);
                toast.success("Membership assigned successfully");
            }
            
            navigate('/dashboard/owner/finance/collect', { state: { autoOpenMember: { _id: formData.memberId } } });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to assign membership");
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

    if (loading) return <Loader text="Loading assignment details..." />;

    const availableCoupons = (gymSettings?.couponOffers || []).filter(c => c.isActive);

    return (
        <PageLayout>
            <PageHeader 
                title={location.state?.isRenew ? "Renew Membership" : (editMode ? "Update Membership" : "Assign Membership")} 
                subtitle={location.state?.isRenew ? "Start a new subscription cycle for this member" : (editMode ? "Edit an existing assigned subscription" : "Select a member and assign a subscription plan")} 
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <FormSection title="Assignment Details" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Member <span className="text-rose-500">*</span></label>
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

                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Membership Plan <span className="text-rose-500">*</span></label>
                                <ReactSelect
                                    options={memberships.map(m => ({
                                        value: m._id,
                                        label: `${m.name} (₹${m.price} - ${m.duration} ${m.durationUnit})`
                                    }))}
                                    value={formData.membershipPlanId ? { 
                                        value: formData.membershipPlanId, 
                                        label: memberships.find(m => m._id === formData.membershipPlanId) ? 
                                            `${memberships.find(m => m._id === formData.membershipPlanId).name} (₹${memberships.find(m => m._id === formData.membershipPlanId).price})` 
                                            : '' 
                                    } : null}
                                    onChange={(val) => handleSelectChange('membershipPlanId', val)}
                                    styles={customStyles}
                                    placeholder="Search and select a plan..."
                                />
                            </div>
                            
                            <Input type="date" label="Plan Start Date" name="planStartDate" value={formData.planStartDate} onChange={handleChange} required />
                            <Input type="date" label="Plan End Date" name="planEndDate" value={formData.planEndDate} onChange={handleChange} required />
                            <Input type="number" label="Total Sessions (if applicable)" name="totalSessions" value={formData.totalSessions} onChange={handleChange} placeholder="e.g. 12" />
                            
                            {/* Referral Coupon Number Box & Dropdown Selector */}
                            <div className="sm:col-span-2 p-4 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                                        <FiTag className="text-emerald-600" /> Apply Active Coupon Offer / Referral Code
                                    </span>
                                    {appliedCoupon && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                                            <FiCheckCircle size={12} /> Coupon Active
                                        </span>
                                    )}
                                </div>

                                {!appliedCoupon ? (
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        {/* Dropdown of active Gym Coupon Offers */}
                                        {availableCoupons.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) handleApplyCoupon(e.target.value);
                                                }}
                                                className="h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
                                            >
                                                <option value="">-- Choose Active Gym Offer --</option>
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
                                                placeholder="Or Enter Code (e.g. MEM-0001, WELCOME10)"
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
                                                Discount of ₹{appliedCoupon.discountAmount} deducted from plan total.
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

                            <Input type="number" label="Discount (₹)" name="discount" value={formData.discount} onChange={handleChange} placeholder="e.g. 1000" />
                            
                        </FormSection>

                        <div className="flex justify-end items-center gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/membership')}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting}>
                                {editMode 
                                    ? 'Update Membership & Pay' 
                                    : 'Assign Plan & Pay'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
