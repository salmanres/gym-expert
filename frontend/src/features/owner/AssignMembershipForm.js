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
import { formatDate, toInputDateFormat, getTodayInputDate } from '../../utils/dateUtils';
import ReactSelect from 'react-select';

const formatToYMD = (date) => {
    return toInputDateFormat(date);
};

const getRenewalStartDate = (rawEndDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatToYMD(today);
    
    if (!rawEndDate) return todayStr;
    const activeEnd = new Date(rawEndDate);
    if (isNaN(activeEnd.getTime())) return todayStr;
    
    // If plan end date is today or in future, renewal begins the next day
    if (activeEnd >= today) {
        const nextDay = new Date(activeEnd);
        nextDay.setDate(nextDay.getDate() + 1);
        return formatToYMD(nextDay);
    }
    // If already expired in the past, renewal begins today
    return todayStr;
};

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
        planStartDate: formatToYMD(new Date()),
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

                // Pre-fill if navigated from Member details or Finance
                if (location.state?.member) {
                    const mem = location.state.member;
                    const memIdStr = (mem._id || mem.id || '').toString();
                    const activeMem = activeMems.find(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr) || location.state?.activeMembership || mem.activeMembership;
                    const isFullyPaid = activeMem && (activeMem.paymentStatus === 'Paid' || (activeMem.balanceAmount || 0) <= 0);

                    // Resolve initial staff & reference
                    let initialSalesPersonId = '';
                    let initialReference = '';

                    const allStaff = staffRes.data || [];

                    if (mem.referredByStaff) {
                        const sId = typeof mem.referredByStaff === 'object' ? mem.referredByStaff._id : mem.referredByStaff;
                        const found = allStaff.find(s => s._id === sId);
                        if (found) {
                            initialSalesPersonId = found._id;
                            initialReference = found.name;
                        } else {
                            initialSalesPersonId = sId;
                            initialReference = typeof mem.referredByStaff === 'object' ? mem.referredByStaff.name : '';
                        }
                    }

                    if (!initialSalesPersonId) {
                        const rawRef = (
                            (typeof mem.referredBy === 'object' && mem.referredBy?.name ? mem.referredBy.name : mem.referredBy) ||
                            mem.enquiryId?.referredBy ||
                            location.state?.convertedLead?.referredBy ||
                            location.state?.leadOffer?.referredBy ||
                            ''
                        ).toString().trim();

                        if (rawRef) {
                            const foundStaff = allStaff.find(s => 
                                s._id === rawRef || 
                                (s.name && rawRef.toLowerCase().includes(s.name.toLowerCase())) ||
                                `${s.name || ''} (${s.role === 'STAFF' ? 'Staff' : s.role === 'TRAINER' ? 'Trainer' : (s.role || 'Staff')})`.toLowerCase() === rawRef.toLowerCase()
                            );
                            if (foundStaff) {
                                initialSalesPersonId = foundStaff._id;
                                initialReference = foundStaff.name;
                            } else {
                                initialReference = rawRef;
                            }
                        }
                    }

                    const rawEnd = activeMem?.paidUntilDate || activeMem?.endDate || mem.paidUntilDate || mem.planEndDate || mem.endDate || location.state?.activeMembership?.endDate;
                    const renewalStartDate = getRenewalStartDate(rawEnd);

                    if (location.state.isRenew) {
                        const prevPlan = activeMem?.membershipPlanId?._id || activeMem?.membershipPlanId || (mem.membershipPlan?._id || mem.membershipPlan);
                        setEditMode(false);
                        setMembershipId(null);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            membershipPlanId: prevPlan || '',
                            planStartDate: renewalStartDate,
                            salesPersonId: initialSalesPersonId || prev.salesPersonId,
                            reference: initialReference || prev.reference
                        }));
                    } else if (activeMem && (location.state.isEdit || !isFullyPaid)) {
                        setEditMode(true);
                        setMembershipId(activeMem._id);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            membershipPlanId: activeMem.membershipPlanId ? (activeMem.membershipPlanId._id || activeMem.membershipPlanId) : '',
                            planStartDate: formatToYMD(activeMem.startDate) || renewalStartDate,
                            planEndDate: formatToYMD(activeMem.endDate),
                            totalSessions: activeMem.totalSessions || '',
                            originalPrice: activeMem.originalPrice !== undefined ? activeMem.originalPrice : '',
                            discount: activeMem.discount || 0,
                            amountPaid: 0,
                            paymentMode: 'Cash',
                            transactionId: '',
                            notes: '',
                            paidUntilDate: activeMem.paidUntilDate ? formatToYMD(activeMem.paidUntilDate) : '',
                            useWallet: false,
                            walletUsed: 0,
                            bonusDays: activeMem.bonusDays || 0,
                            trainerId: activeMem.trainerId ? (activeMem.trainerId._id || activeMem.trainerId) : prev.trainerId,
                            salesPersonId: activeMem.salesPersonId ? (activeMem.salesPersonId._id || activeMem.salesPersonId) : (initialSalesPersonId || prev.salesPersonId),
                            reference: activeMem.reference || initialReference || prev.reference,
                            isPTConversion: activeMem.isPTConversion !== undefined ? activeMem.isPTConversion : prev.isPTConversion
                        }));
                    } else if (activeMem && isFullyPaid) {
                        // Member has fully paid active plan: default to Future/Scheduled plan starting day after current plan ends
                        setEditMode(false);
                        setMembershipId(null);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            planStartDate: renewalStartDate,
                            salesPersonId: initialSalesPersonId || prev.salesPersonId,
                            reference: initialReference || prev.reference
                        }));
                    } else {
                        setEditMode(false);
                        setMembershipId(null);

                        const leadOffer = location.state.leadOffer;
                        const offerAmount = Number(leadOffer?.offerAmount || mem.offerAmount || 0);
                        const offerDetails = (leadOffer?.offerDetails || mem.offerDetails || '').trim();
                        const hasRealNegotiation = offerAmount > 0 || (offerDetails !== '' && !['none', 'discount'].includes(offerDetails.toLowerCase()));
                        const selectedOfferId = leadOffer?.selectedOffer || mem.selectedOffer || '';
                        const inquiryFor = leadOffer?.inquiryFor || mem.interest || '';

                        let matchedPlanId = '';
                        let planPrice = 0;
                        if (inquiryFor && planRes.data) {
                            const foundPlan = planRes.data.find(p => 
                                p.name?.toLowerCase() === inquiryFor.toLowerCase() || 
                                p.planName?.toLowerCase() === inquiryFor.toLowerCase() ||
                                (inquiryFor.toLowerCase().includes((p.name || '').toLowerCase()) && (p.name || '').length > 2)
                            );
                            if (foundPlan) {
                                matchedPlanId = foundPlan._id;
                                planPrice = foundPlan.price || 0;
                            }
                        }

                        // Auto-match against gym coupon offers
                        const allCoupons = (gymRes.data?.couponOffers || []).filter(c => c.isActive);
                        const matchedCoupon = allCoupons.find(c => 
                            (selectedOfferId && (c._id === selectedOfferId || c.code === selectedOfferId)) ||
                            (c.title && offerDetails && c.title.toLowerCase() === offerDetails.toLowerCase()) ||
                            (c.code && offerDetails && c.code.toLowerCase() === offerDetails.toLowerCase())
                        );

                        if (matchedCoupon) {
                            let discountAmt = 0;
                            if (matchedCoupon.discountValue > 0) {
                                if (matchedCoupon.discountType === 'Percentage') {
                                    discountAmt = planPrice > 0 ? Math.round((planPrice * matchedCoupon.discountValue) / 100) : 0;
                                } else {
                                    discountAmt = matchedCoupon.discountValue || 0;
                                }
                            } else if (offerAmount > 0) {
                                discountAmt = offerAmount;
                            }

                            const bonus = matchedCoupon.bonusDays || 0;
                            let descDesc = matchedCoupon.title;
                            let parts = [];
                            if (matchedCoupon.discountValue > 0) {
                                parts.push(matchedCoupon.discountType === 'Percentage' ? `${matchedCoupon.discountValue}% OFF` : `₹${matchedCoupon.discountValue} OFF`);
                            }
                            if (bonus > 0) parts.push(`+${bonus} Free Days`);
                            if (parts.length > 0) descDesc += ` (${parts.join(' ')})`;

                            setAppliedCoupon({
                                code: matchedCoupon.code,
                                description: descDesc,
                                discountAmount: discountAmt
                            });
                            setCouponCode(matchedCoupon.code);

                            setFormData(prev => ({
                                ...prev,
                                memberId: mem._id,
                                membershipPlanId: matchedPlanId || prev.membershipPlanId,
                                originalPrice: planPrice > 0 ? planPrice : prev.originalPrice,
                                discount: discountAmt,
                                bonusDays: bonus,
                                amountPaid: planPrice > 0 ? Math.max(0, planPrice - discountAmt) : prev.amountPaid,
                                notes: hasRealNegotiation && offerDetails ? `Negotiated Lead Offer: ${offerDetails}` : prev.notes,
                                salesPersonId: initialSalesPersonId || prev.salesPersonId,
                                reference: initialReference || prev.reference
                            }));

                            toast.success(`Coupon Offer "${matchedCoupon.title}" auto-applied!`);
                        } else if (hasRealNegotiation) {
                            const initialDiscount = offerAmount > 0 ? offerAmount : 0;
                            setAppliedCoupon({
                                code: 'LEAD_OFFER',
                                description: offerDetails || 'Negotiated Lead Offer',
                                discountAmount: initialDiscount
                            });
                            setCouponCode('LEAD_OFFER');

                            setFormData(prev => ({
                                ...prev,
                                memberId: mem._id,
                                membershipPlanId: matchedPlanId || prev.membershipPlanId,
                                originalPrice: planPrice > 0 ? planPrice : prev.originalPrice,
                                discount: initialDiscount,
                                amountPaid: planPrice > 0 ? Math.max(0, planPrice - initialDiscount) : prev.amountPaid,
                                notes: offerDetails ? `Negotiated Lead Offer: ${offerDetails}` : prev.notes,
                                salesPersonId: initialSalesPersonId || prev.salesPersonId,
                                reference: initialReference || prev.reference
                            }));

                            toast.success(`Negotiated Lead Offer of ₹${initialDiscount} (${offerDetails || 'Discount'}) loaded!`);
                        } else {
                            setAppliedCoupon(null);
                            setCouponCode('');
                            setFormData(prev => ({
                                ...prev,
                                memberId: mem._id,
                                membershipPlanId: matchedPlanId || prev.membershipPlanId,
                                originalPrice: planPrice > 0 ? planPrice : prev.originalPrice,
                                amountPaid: planPrice > 0 ? planPrice : prev.amountPaid,
                                salesPersonId: initialSalesPersonId || prev.salesPersonId,
                                reference: initialReference || prev.reference
                            }));
                        }
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

    const planNameStr = String(selectedPlan?.name || '').toLowerCase();
    const planTypeStr = Array.isArray(selectedPlan?.planType) 
        ? selectedPlan.planType.join(' ').toLowerCase() 
        : String(selectedPlan?.planType || '').toLowerCase();
    const isPTPlan = planTypeStr.includes('personal training') || planTypeStr.includes('pt') || planNameStr.includes('personal training') || planNameStr.includes('pt package') || ((selectedPlan?.sessions || 0) > 0);
    const showTrainerField = isPTPlan || Boolean(formData.isPTConversion);

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
                const maxEndDateStr = toInputDateFormat(maxEndDate);
                const currentPlanPrice = formData.originalPrice !== '' && formData.originalPrice !== null && formData.originalPrice !== undefined
                    ? Number(formData.originalPrice)
                    : (plan ? (plan.price || 0) : 0);
                const net = Math.max(0, currentPlanPrice - discountAmount);

                const currentPlanName = String(plan?.name || '').toLowerCase();
                const currentPlanType = Array.isArray(plan?.planType) 
                    ? plan.planType.join(' ').toLowerCase() 
                    : String(plan?.planType || '').toLowerCase();
                const isExplicitPTPlan = currentPlanType.includes('personal training') || currentPlanType.includes('pt') || currentPlanName.includes('personal training') || currentPlanName.includes('pt package') || ((plan?.sessions || 0) > 0);

                setFormData(prev => ({ 
                    ...prev, 
                    planEndDate: maxEndDateStr,
                    amountPaid: editMode ? prev.amountPaid : net, 
                    totalSessions: totalSess,
                    isPTConversion: isExplicitPTPlan ? true : prev.isPTConversion,
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
                    const memIdStr = val?.toString() || '';
                    const activeMem = activeMemberships.find(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr);
                    const foundMem = members.find(m => (m._id || m.id)?.toString() === memIdStr);
                    const isFullyPaid = activeMem && (activeMem.paymentStatus === 'Paid' || (activeMem.balanceAmount || 0) <= 0);

                    const rawEnd = activeMem?.paidUntilDate || activeMem?.endDate || foundMem?.paidUntilDate || foundMem?.planEndDate || foundMem?.endDate;
                    const renewalStartDate = getRenewalStartDate(rawEnd);

                    if (activeMem && isFullyPaid) {
                        updated.planStartDate = renewalStartDate;
                        setEditMode(false);
                        setMembershipId(null);
                    } else if (activeMem && !isFullyPaid) {
                        updated.planStartDate = formatToYMD(activeMem.startDate) || renewalStartDate;
                        setEditMode(true);
                        setMembershipId(activeMem._id);
                    } else {
                        updated.planStartDate = renewalStartDate;
                        setEditMode(false);
                        setMembershipId(null);

                        if (foundMem) {
                            // Resolve staff & reference from found member
                            let resolvedSalesPersonId = '';
                            let resolvedReference = '';

                            if (foundMem.referredByStaff) {
                                const sId = typeof foundMem.referredByStaff === 'object' ? foundMem.referredByStaff._id : foundMem.referredByStaff;
                                const found = staffList.find(s => s._id === sId);
                                if (found) {
                                    resolvedSalesPersonId = found._id;
                                    resolvedReference = found.name;
                                } else {
                                    resolvedSalesPersonId = sId;
                                    resolvedReference = typeof foundMem.referredByStaff === 'object' ? foundMem.referredByStaff.name : '';
                                }
                            }

                            if (!resolvedSalesPersonId) {
                                const rawRef = (
                                    (typeof foundMem.referredBy === 'object' && foundMem.referredBy?.name ? foundMem.referredBy.name : foundMem.referredBy) ||
                                    foundMem.enquiryId?.referredBy ||
                                    ''
                                ).toString().trim();

                                if (rawRef) {
                                    const foundStaff = staffList.find(s => 
                                        s._id === rawRef || 
                                        (s.name && rawRef.toLowerCase().includes(s.name.toLowerCase())) ||
                                        `${s.name || ''} (${s.role === 'STAFF' ? 'Staff' : s.role === 'TRAINER' ? 'Trainer' : (s.role || 'Staff')})`.toLowerCase() === rawRef.toLowerCase()
                                    );
                                    if (foundStaff) {
                                        resolvedSalesPersonId = foundStaff._id;
                                        resolvedReference = foundStaff.name;
                                    } else {
                                        resolvedReference = rawRef;
                                    }
                                }
                            }

                            if (resolvedSalesPersonId) updated.salesPersonId = resolvedSalesPersonId;
                            if (resolvedReference) updated.reference = resolvedReference;
                            const offerAmount = Number(foundMem.offerAmount || foundMem.enquiryId?.offerAmount || 0);
                            const offerDetails = (foundMem.offerDetails || foundMem.enquiryId?.offerDetails || '').trim();
                            const hasRealNegotiation = offerAmount > 0 || (offerDetails !== '' && !['none', 'discount'].includes(offerDetails.toLowerCase()));
                            const selectedOfferId = foundMem.selectedOffer || foundMem.enquiryId?.selectedOffer || '';
                            const inquiryFor = foundMem.interest || foundMem.enquiryId?.inquiryFor || '';

                            // If member has a target plan from inquiry, pre-select it
                            let matchedPlanId = prev.membershipPlanId;
                            let planPrice = prev.originalPrice;
                            if (inquiryFor && memberships.length > 0) {
                                const foundPlan = memberships.find(p => 
                                    p.name?.toLowerCase() === inquiryFor.toLowerCase() || 
                                    p.planName?.toLowerCase() === inquiryFor.toLowerCase() ||
                                    (inquiryFor.toLowerCase().includes((p.name || '').toLowerCase()) && (p.name || '').length > 2)
                                );
                                if (foundPlan) {
                                    matchedPlanId = foundPlan._id;
                                    planPrice = foundPlan.price || 0;
                                    updated.membershipPlanId = matchedPlanId;
                                    updated.originalPrice = planPrice;
                                }
                            }

                            const allCoupons = (gymSettings?.couponOffers || []).filter(c => c.isActive);
                            const matchedCoupon = allCoupons.find(c => 
                                (selectedOfferId && (c._id === selectedOfferId || c.code === selectedOfferId)) ||
                                (c.title && offerDetails && c.title.toLowerCase() === offerDetails.toLowerCase()) ||
                                (c.code && offerDetails && c.code.toLowerCase() === offerDetails.toLowerCase())
                            );

                            if (matchedCoupon) {
                                let discountAmt = 0;
                                const currentPrice = planPrice || (memberships.find(p => p._id === matchedPlanId)?.price || 0);
                                if (matchedCoupon.discountValue > 0) {
                                    if (matchedCoupon.discountType === 'Percentage') {
                                        discountAmt = currentPrice > 0 ? Math.round((currentPrice * matchedCoupon.discountValue) / 100) : 0;
                                    } else {
                                        discountAmt = matchedCoupon.discountValue || 0;
                                    }
                                } else if (offerAmount > 0) {
                                    discountAmt = offerAmount;
                                }

                                let descDesc = matchedCoupon.title;
                                let parts = [];
                                if (matchedCoupon.discountValue > 0) {
                                    parts.push(matchedCoupon.discountType === 'Percentage' ? `${matchedCoupon.discountValue}% OFF` : `₹${matchedCoupon.discountValue} OFF`);
                                }
                                if (matchedCoupon.bonusDays > 0) parts.push(`+${matchedCoupon.bonusDays} Free Days`);
                                if (parts.length > 0) descDesc += ` (${parts.join(' ')})`;

                                setAppliedCoupon({
                                    code: matchedCoupon.code,
                                    description: descDesc,
                                    discountAmount: discountAmt
                                });
                                setCouponCode(matchedCoupon.code);

                                updated.discount = discountAmt;
                                updated.bonusDays = matchedCoupon.bonusDays || 0;
                                if (currentPrice > 0) {
                                    updated.amountPaid = Math.max(0, currentPrice - discountAmt);
                                }
                                if (hasRealNegotiation && offerDetails && !prev.notes) {
                                    updated.notes = `Negotiated Lead Offer: ${offerDetails}`;
                                }
                                toast.success(`Coupon Offer "${matchedCoupon.title}" auto-applied for ${foundMem.firstName}!`);
                            } else if (hasRealNegotiation) {
                                setAppliedCoupon({
                                    code: 'LEAD_OFFER',
                                    description: offerDetails || 'Negotiated Lead Offer',
                                    discountAmount: offerAmount
                                });
                                setCouponCode('LEAD_OFFER');
                                updated.discount = offerAmount;
                                if (planPrice > 0) {
                                    updated.amountPaid = Math.max(0, planPrice - offerAmount);
                                }
                                if (offerDetails && !prev.notes) {
                                    updated.notes = `Negotiated Lead Offer: ${offerDetails}`;
                                }
                                toast.info(`Found negotiated offer for ${foundMem.firstName}: ₹${offerAmount} (${offerDetails || 'Discount'})`);
                            } else {
                                setAppliedCoupon(null);
                                setCouponCode('');
                                updated.discount = 0;
                                if (planPrice > 0) {
                                    updated.amountPaid = planPrice;
                                }
                            }
                        }
                    }
                } else if (name === 'membershipPlanId') {
                    const plan = memberships.find(p => p._id === val);
                    if (plan) {
                        const price = plan.price || 0;
                        updated.originalPrice = price;

                        // Recalculate discount if coupon is percentage
                        let discountAmt = Number(prev.discount) || 0;
                        if (appliedCoupon && appliedCoupon.code !== 'LEAD_OFFER') {
                            const currentCoupon = (gymSettings?.couponOffers || []).find(c => c.code === appliedCoupon.code);
                            if (currentCoupon && currentCoupon.discountType === 'Percentage' && currentCoupon.discountValue > 0) {
                                discountAmt = Math.round((price * currentCoupon.discountValue) / 100);
                                updated.discount = discountAmt;
                                setAppliedCoupon(ac => ac ? ({ ...ac, discountAmount: discountAmt }) : null);
                            }
                        }
                        updated.amountPaid = Math.max(0, price - discountAmt);
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
                                                planStartDate: toInputDateFormat(activeEnd)
                                            }));
                                        } else {
                                            setEditMode(true);
                                            setMembershipId(selectedMemberActiveMem._id);
                                            setFormData(prev => ({
                                                ...prev,
                                                membershipPlanId: selectedMemberActiveMem.membershipPlanId?._id || selectedMemberActiveMem.membershipPlanId || '',
                                                planStartDate: toInputDateFormat(selectedMemberActiveMem.startDate),
                                                planEndDate: toInputDateFormat(selectedMemberActiveMem.endDate)
                                            }));
                                        }
                                    }}
                                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                                >
                                    {editMode ? 'Switch to Schedule Future Plan' : 'Edit Active Plan Instead'}
                                </button>
                            </div>
                        )}

                        {/* Negotiated Lead Offer Banner (Only shown if actually negotiated / offer exists) */}
                        {(() => {
                            const activeLeadOfferAmount = Number(selectedMember?.offerAmount || location.state?.leadOffer?.offerAmount || 0);
                            const activeLeadOfferDetails = (selectedMember?.offerDetails || location.state?.leadOffer?.offerDetails || '').trim();
                            const hasValidNegotiatedOffer = activeLeadOfferAmount > 0 || (activeLeadOfferDetails !== '' && !['none', 'discount'].includes(activeLeadOfferDetails.toLowerCase()));

                            if (!hasValidNegotiatedOffer) return null;

                            return (
                                <div className="p-4 bg-emerald-50/95 border border-emerald-300/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 font-bold">
                                            <FiTag size={20} />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10.5px] font-black uppercase tracking-wider bg-emerald-200/90 text-emerald-900 px-2.5 py-0.5 rounded-md">
                                                    Negotiated Lead Offer
                                                </span>
                                                <span className="text-xs font-bold text-slate-900">
                                                    {activeLeadOfferDetails || 'Special Discount'}
                                                </span>
                                            </div>
                                            <p className="text-[11.5px] text-slate-600 mt-1">
                                                Discount Offered: <strong className="text-emerald-700 font-extrabold">₹{activeLeadOfferAmount}</strong>
                                                {(selectedMember?.interest || location.state?.leadOffer?.inquiryFor) ? ` • Target: ${selectedMember?.interest || location.state?.leadOffer?.inquiryFor}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const leadAmt = activeLeadOfferAmount;
                                            const leadDesc = activeLeadOfferDetails || 'Negotiated Lead Offer';
                                            const pPrice = selectedPlan ? (selectedPlan.price || 0) : (formData.originalPrice || 0);
                                            setFormData(prev => ({
                                                ...prev,
                                                discount: leadAmt,
                                                amountPaid: Math.max(0, (prev.originalPrice || pPrice) - leadAmt),
                                                notes: prev.notes ? (prev.notes.includes(leadDesc) ? prev.notes : `${prev.notes} | ${leadDesc}`) : leadDesc
                                            }));
                                            toast.success(`Applied Lead Offer discount of ₹${leadAmt}!`);
                                        }}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                                    >
                                        <FiCheckCircle size={14} />
                                        <span>Apply Lead Offer</span>
                                    </button>
                                </div>
                            );
                        })()}

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

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    {availableCoupons.length > 0 && (
                                        <select
                                            value={appliedCoupon ? appliedCoupon.code : (couponCode || '')}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleApplyCoupon(e.target.value);
                                                } else {
                                                    handleRemoveCoupon();
                                                }
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
                                            {appliedCoupon && !availableCoupons.some(c => c.code === appliedCoupon.code) && (
                                                <option value={appliedCoupon.code}>
                                                    {appliedCoupon.code} - {appliedCoupon.description} (₹{appliedCoupon.discountAmount} OFF)
                                                </option>
                                            )}
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

                                {appliedCoupon && (
                                    <div className="flex items-center justify-between bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                                        <div>
                                            <div className="text-xs font-extrabold text-slate-900 font-mono flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10.5px] font-black uppercase">
                                                    {appliedCoupon.code}
                                                </span>
                                                <span className="text-emerald-900 font-sans font-bold">{appliedCoupon.description}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                Discount of <strong className="text-emerald-700 font-extrabold">₹{appliedCoupon.discountAmount}</strong> applied to membership.
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
                        <FormSection title="Trainer, Sales & Reference Attribution" icon={<FiAward />} className={`grid grid-cols-1 sm:grid-cols-2 ${showTrainerField ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
                            {showTrainerField && (
                                <div className="col-span-1">
                                    <label className=" text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                                        <span>Assigned Trainer</span>
                                        <span className="text-[10px] text-amber-600 font-extrabold uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">PT Required</span>
                                    </label>
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
                            )}

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
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            isPTConversion: e.target.checked,
                                            trainerId: (!e.target.checked && !isPTPlan) ? '' : prev.trainerId
                                        }))} 
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
