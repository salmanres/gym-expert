import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import { 
    FiActivity, FiTag, FiCheckCircle, FiCreditCard, 
    FiInfo, FiAward, FiCalendar
} from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from '../../utils/toast';
import Loader from '../../components/page/Loader';
import { formatDate, toInputDateFormat } from '../../utils/dateUtils';
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

const isPTPlan = (plan) => {
    const name = String(plan?.name || '').toLowerCase();
    const type = Array.isArray(plan?.planType)
        ? plan.planType.join(' ').toLowerCase()
        : String(plan?.planType || '').toLowerCase();

    return type.includes('personal training') || type.includes('pt') || name.includes('personal training') || name.includes('pt package') || (plan?.sessions || 0) > 0;
};

const isPTMembership = (membership) => Boolean(membership?.isPTConversion) || isPTPlan(membership?.membershipPlanId || membership);

const normalizeReference = (reference) => {
    if (!reference) return '';
    if (typeof reference === 'string' || typeof reference === 'number') return String(reference).trim();
    if (typeof reference !== 'object') return '';

    const fullName = [reference.firstName, reference.lastName].filter(Boolean).join(' ');
    const readableValue = reference.name || fullName || reference.label || reference.reference || reference.title || reference.code;
    return readableValue ? normalizeReference(readableValue) : '';
};

const round2 = (num) => Math.round(((Number(num) || 0) + Number.EPSILON) * 100) / 100;

export default function AssignMembershipForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isPTConversionMode, setIsPTConversionMode] = useState(Boolean(location.state?.isPTConversion));

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [members, setMembers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [gymSettings, setGymSettings] = useState(null);
    const [activeMemberships, setActiveMemberships] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [membershipId, setMembershipId] = useState(null);
    const [existingPaidAmount, setExistingPaidAmount] = useState(0);
    const [ptAddonEnabled, setPtAddonEnabled] = useState(Boolean(location.state?.isPTConversion));
    const [ptAddonPlanId, setPtAddonPlanId] = useState('');
    const [ptAddonFee, setPtAddonFee] = useState('');
    const [ptAddonSessions, setPtAddonSessions] = useState('');
    const [ptAddonTrainerId, setPtAddonTrainerId] = useState('');
    const [ptAddonEndDate, setPtAddonEndDate] = useState('');

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const [staffList, setStaffList] = useState([]);
    const skipAutoEndDateRef = React.useRef(false);

    const [formData, setFormData] = useState({
        memberId: '',
        membershipPlanId: '',
        planStartDate: formatToYMD(new Date()),
        planEndDate: '',
        totalSessions: '',
        originalPrice: '',
        discount: 0,
        amountPaid: '',
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
        isPTConversion: Boolean(location.state?.isPTConversion)
    });

    const loadMembershipForEdit = (targetMem) => {
        if (!targetMem) return;
        skipAutoEndDateRef.current = true;
        setEditMode(true);
        setIsPTConversionMode(false);
        setMembershipId(targetMem._id);
        setExistingPaidAmount(Number(targetMem.paidAmount) || 0);
        setPtAddonEnabled(false);
        setAppliedCoupon(null);
        setCouponCode('');

        const planId = targetMem.membershipPlanId?._id || targetMem.membershipPlanId || '';
        const startStr = toInputDateFormat(targetMem.startDate);
        const endStr = toInputDateFormat(targetMem.endDate);
        const origPrice = targetMem.originalPrice !== undefined && targetMem.originalPrice !== null && targetMem.originalPrice !== ''
            ? targetMem.originalPrice
            : (targetMem.finalPrice !== undefined ? targetMem.finalPrice : '');
        const disc = targetMem.discount !== undefined ? targetMem.discount : 0;
        const sess = targetMem.totalSessions !== undefined ? targetMem.totalSessions : '';
        const bDays = targetMem.bonusDays || 0;
        const tId = targetMem.trainerId?._id || targetMem.trainerId || '';
        const sId = targetMem.salesPersonId?._id || targetMem.salesPersonId || '';
        const ref = normalizeReference(targetMem.reference) || '';
        const nts = targetMem.notes || '';
        const pUntil = targetMem.paidUntilDate ? toInputDateFormat(targetMem.paidUntilDate) : '';

        setFormData(prev => ({
            ...prev,
            memberId: (targetMem.memberId?._id || targetMem.memberId || prev.memberId),
            membershipPlanId: planId,
            planStartDate: startStr,
            planEndDate: endStr,
            totalSessions: sess,
            originalPrice: origPrice,
            discount: disc,
            amountPaid: '',
            paymentMode: 'Cash',
            transactionId: '',
            notes: nts,
            paidUntilDate: pUntil,
            useWallet: false,
            walletUsed: 0,
            bonusDays: bDays,
            trainerId: tId,
            salesPersonId: sId,
            reference: ref,
            isPTConversion: Boolean(targetMem.isPTConversion)
        }));
    };

    const switchToScheduleMode = (targetMember, currentActiveMems = activeMemberships) => {
        setEditMode(false);
        setIsPTConversionMode(false);
        setMembershipId(null);
        setExistingPaidAmount(0);

        const mId = targetMember?._id || targetMember?.id || formData.memberId;
        const memMems = currentActiveMems.filter(m => (m.memberId?._id || m.memberId)?.toString() === mId?.toString());
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const nowEnd = new Date();
        nowEnd.setHours(23, 59, 59, 999);

        const sched = memMems.find(m => {
            if (isPTMembership(m) || m.membershipStatus === 'Cancelled') return false;
            const s = new Date(m.startDate);
            return (s && s > nowEnd) || m.membershipStatus === 'Scheduled';
        });
        const act = memMems.find(m => {
            if (isPTMembership(m) || m.membershipStatus === 'Cancelled') return false;
            const s = new Date(m.startDate);
            const e = new Date(m.endDate);
            return s && e && s <= nowEnd && e >= now;
        }) || memMems.find(m => !isPTMembership(m) && m.membershipStatus === 'Active');

        const latestMem = sched || act;
        const rawEnd = latestMem?.endDate || targetMember?.planEndDate || targetMember?.endDate || latestMem?.paidUntilDate || targetMember?.paidUntilDate;
        const renewalStartDate = getRenewalStartDate(rawEnd);

        setFormData(prev => ({
            ...prev,
            planStartDate: renewalStartDate,
            planEndDate: '',
            amountPaid: '0',
            discount: 0,
            bonusDays: 0,
            notes: ''
        }));
    };

    const switchToPTConversionMode = (targetMember) => {
        const mem = targetMember || selectedMember;
        if (!mem) return;
        setIsPTConversionMode(true);
        setEditMode(false);
        setMembershipId(null);
        setExistingPaidAmount(0);
        setPtAddonEnabled(true);
        setPtAddonPlanId('');
        setPtAddonFee('');
        setPtAddonSessions('');
        setPtAddonTrainerId('');
        setCouponCode('');
        setAppliedCoupon(null);
        setFormData(prev => ({
            ...prev,
            memberId: mem._id || mem.id,
            membershipPlanId: '',
            planStartDate: formatToYMD(new Date()),
            planEndDate: '',
            totalSessions: '',
            originalPrice: '',
            discount: 0,
            amountPaid: '',
            trainerId: '',
            isPTConversion: false
        }));
    };

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
                    const memberMems = activeMems.filter(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr);
                    
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const nowEnd = new Date();
                    nowEnd.setHours(23, 59, 59, 999);

                    const actMem = memberMems.find(m => {
                        if (isPTMembership(m) || m.membershipStatus === 'Cancelled') return false;
                        const s = new Date(m.startDate);
                        const e = new Date(m.endDate);
                        return s && e && s <= nowEnd && e >= now;
                    }) || memberMems.find(m => !isPTMembership(m) && m.membershipStatus === 'Active');

                    const schedMem = memberMems.find(m => {
                        if (isPTMembership(m) || m.membershipStatus === 'Cancelled') return false;
                        const s = new Date(m.startDate);
                        return (s && s > nowEnd) || m.membershipStatus === 'Scheduled';
                    });

                    const targetMem = location.state?.targetMembership || 
                        location.state?.membership || 
                        (location.state?.isEdit ? (location.state?.activeMembership || location.state?.scheduledMembership || actMem || schedMem) : null);

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
                            initialReference = normalizeReference(mem.referredByStaff);
                        }
                    }

                    if (!initialSalesPersonId) {
                        const rawRef = normalizeReference(mem.referredBy) ||
                            normalizeReference(mem.enquiryId?.referredBy) ||
                            normalizeReference(location.state?.convertedLead?.referredBy) ||
                            normalizeReference(location.state?.leadOffer?.referredBy);

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

                    const rawEnd = (schedMem || actMem)?.endDate || mem.planEndDate || mem.endDate || (schedMem || actMem)?.paidUntilDate || mem.paidUntilDate || location.state?.activeMembership?.endDate;
                    const renewalStartDate = getRenewalStartDate(rawEnd);

                    if (location.state.isPTConversion) {
                        setEditMode(false);
                        setMembershipId(null);
                        setExistingPaidAmount(0);
                        setPtAddonEnabled(true);
                        setPtAddonPlanId('');
                        setPtAddonFee('');
                        setPtAddonSessions('');
                        setPtAddonTrainerId('');
                        setCouponCode('');
                        setAppliedCoupon(null);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            membershipPlanId: '',
                            planStartDate: formatToYMD(new Date()),
                            planEndDate: '',
                            totalSessions: '',
                            originalPrice: '',
                            discount: 0,
                            amountPaid: '',
                            trainerId: '',
                            isPTConversion: false,
                            salesPersonId: initialSalesPersonId || prev.salesPersonId,
                            reference: initialReference || prev.reference
                        }));
                    } else if (targetMem && location.state.isEdit) {
                        loadMembershipForEdit(targetMem);
                    } else if (location.state.isRenew) {
                        const prevPlan = actMem?.membershipPlanId?._id || actMem?.membershipPlanId || (mem.membershipPlan?._id || mem.membershipPlan);
                        setEditMode(false);
                        setMembershipId(null);
                        setExistingPaidAmount(0);
                        setPtAddonEnabled(false);
                        setFormData(prev => ({
                            ...prev,
                            memberId: mem._id,
                            membershipPlanId: prevPlan || '',
                            planStartDate: renewalStartDate,
                            isPTConversion: Boolean(actMem?.isPTConversion),
                            salesPersonId: initialSalesPersonId || prev.salesPersonId,
                            reference: initialReference || prev.reference
                        }));
                    } else if (actMem || schedMem) {
                        // Member has active or scheduled plan: default to Schedule Future plan
                        setEditMode(false);
                        setMembershipId(null);
                        setExistingPaidAmount(0);
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
                        setExistingPaidAmount(0);

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

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const selectedMemberMemberships = activeMemberships.filter(m => (m.memberId?._id || m.memberId)?.toString() === formData.memberId?.toString());
    const activeRegularMem = selectedMemberMemberships.find(m => {
        if (isPTMembership(m) || m.membershipStatus === 'Cancelled') return false;
        const st = new Date(m.startDate);
        const en = new Date(m.paidUntilDate || m.endDate);
        return m.membershipStatus === 'Active' || (!m.membershipStatus && st <= todayEnd && en >= todayStart);
    }) || selectedMemberMemberships.find(m => !isPTMembership(m) && m.membershipStatus !== 'Scheduled');

    const scheduledRegularMem = selectedMemberMemberships.find(m => {
        if (isPTMembership(m) || m.membershipStatus === 'Cancelled') return false;
        if (activeRegularMem && m._id?.toString() === activeRegularMem._id?.toString()) return false;
        const st = new Date(m.startDate);
        return m.membershipStatus === 'Scheduled' || (st && st > todayEnd);
    });

    const isEditingScheduled = editMode && scheduledRegularMem && membershipId === scheduledRegularMem._id;
    const isEditingActive = editMode && activeRegularMem && membershipId === activeRegularMem._id;

    const activeMemAlreadyPaid = Boolean(
        activeRegularMem && (
            activeRegularMem.paymentStatus === 'Paid' ||
            (Number(activeRegularMem.balanceAmount) <= 0 && Number(activeRegularMem.paidAmount) > 0) ||
            (Number(activeRegularMem.paidAmount) >= Number(activeRegularMem.finalPrice || activeRegularMem.originalPrice || 0))
        )
    );

    const selectedPlan = memberships.find(p => p._id === formData.membershipPlanId);
    const ptAddonPlan = memberships.find(p => p._id === ptAddonPlanId);
    const ptAddonStartDate = isPTConversionMode ? formatToYMD(new Date()) : formData.planStartDate;
    const showPTAddon = isPTConversionMode || ptAddonEnabled;
    const planPrice = formData.originalPrice !== '' && formData.originalPrice !== null && formData.originalPrice !== undefined
        ? Number(formData.originalPrice)
        : (selectedPlan ? (selectedPlan.price || 0) : 0);
    const discountAmount = Number(formData.discount) || 0;
    const netPayable = Math.max(0, planPrice - discountAmount);

    const isPTPackageOnlyMode = Boolean(
        isPTConversionMode ||
        (showPTAddon && activeRegularMem && (editMode ? existingPaidAmount >= (netPayable || 0) : activeMemAlreadyPaid))
    );

    const selectedPlanIsPT = isPTPlan(selectedPlan);
    const showTrainerField = !isPTConversionMode && !isPTPackageOnlyMode && (selectedPlanIsPT || Boolean(formData.isPTConversion));
    const baseDueNow = isPTPackageOnlyMode ? 0 : Math.max(0, netPayable - (editMode ? existingPaidAmount : 0));
    const ptAddonFeeAmount = showPTAddon ? Math.max(0, Number(ptAddonFee) || 0) : 0;
    const overallPayableNow = isPTPackageOnlyMode ? ptAddonFeeAmount : (baseDueNow + ptAddonFeeAmount);

    const todayEndForSched = new Date();
    todayEndForSched.setHours(23, 59, 59, 999);
    const isFuturePlan = Boolean(formData.planStartDate && new Date(formData.planStartDate) > todayEndForSched);

    useEffect(() => {
        if (!ptAddonEnabled || !ptAddonPlan || !ptAddonStartDate) {
            setPtAddonEndDate('');
            return;
        }

        const endDate = new Date(ptAddonStartDate);
        const duration = parseInt(ptAddonPlan.duration, 10) || 0;
        const unit = String(ptAddonPlan.durationUnit || 'months').toLowerCase();

        if (unit.includes('month')) endDate.setMonth(endDate.getMonth() + duration);
        else if (unit.includes('day')) endDate.setDate(endDate.getDate() + duration);
        else if (unit.includes('year')) endDate.setFullYear(endDate.getFullYear() + duration);
        else if (unit.includes('week')) endDate.setDate(endDate.getDate() + (duration * 7));

        setPtAddonEndDate(toInputDateFormat(endDate));
    }, [ptAddonEnabled, ptAddonPlan, ptAddonStartDate]);

    // Auto-calculate plan end date & default payment amount when plan or start date changes
    useEffect(() => {
        if (formData.membershipPlanId && formData.planStartDate && memberships.length > 0) {
            if (skipAutoEndDateRef.current) {
                skipAutoEndDateRef.current = false;
                return;
            }

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

                const isExplicitPTPlan = isPTPlan(plan);

                setFormData(prev => {
                    const defaultAmount = editMode 
                        ? prev.amountPaid 
                        : (prev.amountPaid === '' || prev.amountPaid === null ? (isFuturePlan ? '0' : net) : prev.amountPaid);
                    return { 
                        ...prev, 
                        planEndDate: maxEndDateStr,
                        amountPaid: defaultAmount, 
                        totalSessions: prev.totalSessions || totalSess,
                        isPTConversion: isExplicitPTPlan ? true : prev.isPTConversion,
                        paidUntilDate: '' 
                    };
                });
            }
        }
    }, [formData.membershipPlanId, formData.planStartDate, memberships]);

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
                    const memberMems = activeMemberships.filter(m => (m.memberId?._id || m.memberId)?.toString() === memIdStr);
                    const activeMem = memberMems.find(m => !isPTMembership(m)) || memberMems[0];
                    const foundMem = members.find(m => (m._id || m.id)?.toString() === memIdStr);

                    const rawEnd = activeMem?.paidUntilDate || activeMem?.endDate || foundMem?.paidUntilDate || foundMem?.planEndDate || foundMem?.endDate;
                    const renewalStartDate = getRenewalStartDate(rawEnd);

                    updated.planStartDate = renewalStartDate;
                    setEditMode(false);
                    setMembershipId(null);
                    setExistingPaidAmount(0);

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
                                    resolvedReference = normalizeReference(foundMem.referredByStaff);
                                }
                            }

                            if (!resolvedSalesPersonId) {
                                const rawRef = normalizeReference(foundMem.referredBy) || normalizeReference(foundMem.enquiryId?.referredBy);

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
                } else if (name === 'membershipPlanId') {
                    const plan = memberships.find(p => p._id === val);
                    if (plan) {
                        if (isPTPlan(plan)) setPtAddonEnabled(false);
                        const price = plan.price || 0;
                        const planName = String(plan.name || '').toLowerCase();
                        const planType = Array.isArray(plan.planType)
                            ? plan.planType.join(' ').toLowerCase()
                            : String(plan.planType || '').toLowerCase();
                        updated.isPTConversion = planType.includes('personal training') || planType.includes('pt') || planName.includes('personal training') || planName.includes('pt package') || (plan.sessions || 0) > 0;
                        if (!updated.isPTConversion) updated.trainerId = '';
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
                        updated.amountPaid = editMode
                            ? prev.amountPaid
                            : Math.max(0, price - discountAmt);
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
        
        if (!formData.memberId || (!isPTConversionMode && !isPTPackageOnlyMode && !formData.membershipPlanId)) {
            toast.error("Please select a member and a membership plan.");
            return;
        }

        if (showPTAddon && (!ptAddonPlanId || !ptAddonTrainerId)) {
            toast.error("Select a PT package and trainer for the PT add-on.");
            return;
        }

        if (showTrainerField && !formData.trainerId) {
            toast.error("Please select a trainer for the PT membership.");
            return;
        }

        const paid = round2(Number(formData.amountPaid) || 0);
        const walletBalanceAvailable = round2(selectedMember?.walletBalance || 0);
        const baseAmountPaid = (isPTConversionMode || isPTPackageOnlyMode) ? 0 : round2(Math.min(paid, baseDueNow));
        const ptAddonAmountPaid = showPTAddon
            ? round2(Math.min(Math.max(0, paid - baseAmountPaid), ptAddonFeeAmount))
            : 0;
        const walletAvailableForPayment = !editMode && formData.useWallet ? walletBalanceAvailable : 0;
        const baseWalletUsed = round2(Math.min(
            walletAvailableForPayment,
            Math.max(0, baseDueNow - baseAmountPaid),
            Math.max(0, overallPayableNow - paid)
        ));
        const ptAddonWalletUsed = round2(Math.min(
            Math.max(0, walletAvailableForPayment - baseWalletUsed),
            Math.max(0, ptAddonFeeAmount - ptAddonAmountPaid),
            Math.max(0, overallPayableNow - paid - baseWalletUsed)
        ));
        const walletVal = round2(baseWalletUsed + ptAddonWalletUsed);

        setSubmitting(true);
        let baseMembershipSaved = false;
        let parentMembershipId = editMode ? membershipId : (activeRegularMem?._id || null);
        try {
            if (!isPTConversionMode && !isPTPackageOnlyMode) {
                const payload = {
                    memberId: formData.memberId,
                    membershipPlans: [formData.membershipPlanId],
                    planStartDate: formData.planStartDate,
                    planEndDate: formData.planEndDate,
                    totalSessions: formData.totalSessions,
                    originalPrice: formData.originalPrice !== '' ? Number(formData.originalPrice) : undefined,
                    amountPaid: baseAmountPaid,
                    paymentMode: formData.paymentMode || 'Cash',
                    transactionId: formData.transactionId || undefined,
                    notes: formData.notes || undefined,
                    paidUntilDate: formData.paidUntilDate || undefined,
                    discount: formData.discount,
                    couponCode: appliedCoupon ? appliedCoupon.code : undefined,
                    walletUsed: baseWalletUsed,
                    bonusDays: formData.bonusDays,
                    trainerId: formData.trainerId || undefined,
                    salesPersonId: formData.salesPersonId || undefined,
                    reference: formData.reference || undefined,
                    isPTConversion: formData.isPTConversion
                };

                const baseResponse = editMode && membershipId
                    ? await apiClient.put(`/member-memberships/${membershipId}`, payload)
                    : await apiClient.post('/member-memberships', payload);
                baseMembershipSaved = true;
                parentMembershipId = baseResponse.data?.membership?._id || parentMembershipId;
            }

            if (showPTAddon) {
                const resolvedParentId = parentMembershipId || activeRegularMem?._id || location.state?.activeMembership?._id || undefined;
                try {
                    await apiClient.post('/member-memberships', {
                        memberId: formData.memberId,
                        membershipPlans: [ptAddonPlanId],
                        planStartDate: ptAddonStartDate,
                        planEndDate: ptAddonEndDate,
                        totalSessions: ptAddonSessions,
                        originalPrice: Number(ptAddonFee) || 0,
                        amountPaid: ptAddonAmountPaid,
                        paymentMode: formData.paymentMode || 'Cash',
                        transactionId: formData.transactionId || undefined,
                        notes: formData.notes || undefined,
                        discount: 0,
                        walletUsed: ptAddonWalletUsed,
                        trainerId: ptAddonTrainerId,
                        salesPersonId: formData.salesPersonId || undefined,
                        reference: formData.reference || undefined,
                        isPTConversion: true,
                        parentMembershipId: resolvedParentId
                    });
                } catch (addonError) {
                    if (baseMembershipSaved) {
                        toast.error(`Gym plan saved, but PT add-on failed: ${addonError.response?.data?.message || 'Please add the PT package from the member profile.'}`);
                        navigate(`/dashboard/owner/members/view/${formData.memberId}`);
                        return;
                    }
                    throw addonError;
                }
            }

            if (isPTPackageOnlyMode || isPTConversionMode) {
                toast.success(`PT package assigned successfully! Payment of ₹${ptAddonAmountPaid} recorded (Gym plan retained).`);
            } else if (editMode) {
                toast.success(paid > 0
                    ? `Membership updated & additional payment of ₹${paid} recorded!`
                    : `Membership details updated successfully!`);
            } else if (showPTAddon) {
                toast.success(`Membership and PT add-on assigned; total payment of ₹${paid + walletVal} recorded.`);
            } else {
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
    const amountPaidNum = round2(Number(formData.amountPaid) || 0);
    const walletBalanceAvailable = round2(selectedMember?.walletBalance || 0);
    const baseAmountPaidNow = isPTPackageOnlyMode ? 0 : round2(Math.min(amountPaidNum, baseDueNow));
    const ptAddonAmountPaidNow = showPTAddon
        ? round2(Math.min(Math.max(0, amountPaidNum - baseAmountPaidNow), ptAddonFeeAmount))
        : 0;
    const walletAvailableForPayment = !editMode && formData.useWallet ? walletBalanceAvailable : 0;
    const baseWalletUsed = round2(Math.min(
        walletAvailableForPayment,
        Math.max(0, baseDueNow - baseAmountPaidNow),
        Math.max(0, overallPayableNow - amountPaidNum)
    ));
    const ptAddonWalletUsed = round2(Math.min(
        Math.max(0, walletAvailableForPayment - baseWalletUsed),
        Math.max(0, ptAddonFeeAmount - ptAddonAmountPaidNow),
        Math.max(0, overallPayableNow - amountPaidNum - baseWalletUsed)
    ));
    const calculatedWalletUsed = round2(baseWalletUsed + ptAddonWalletUsed);
    const totalCollectedToday = round2(amountPaidNum + calculatedWalletUsed);
    const totalCollectedOverall = totalCollectedToday;
    const remainingBalance = round2(Math.max(0, overallPayableNow - totalCollectedToday));

    return (
        <PageLayout>
            <PageHeader 
                title={isPTPackageOnlyMode || isPTConversionMode ? "Convert Member to PT / Add PT Package" : location.state?.isRenew ? "Renew Membership & Payment" : (editMode ? (isEditingScheduled ? "Update Scheduled Membership" : "Update Active Membership") : "Assign Membership & Process Payment")} 
                subtitle={isPTPackageOnlyMode || isPTConversionMode ? "Add a PT package alongside the member's active gym plan without re-billing the existing plan" : location.state?.isRenew ? "Start a new subscription cycle and record payment" : (editMode ? "Edit plan dates, price, trainer attribution and record payments" : "Assign a subscription plan and process payment on the same screen")} 
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 bg-[#FAEEEF]">
                <div className="max-w-7xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                        
                        {(isPTPackageOnlyMode || isPTConversionMode) && activeRegularMem && (
                            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-2xs">
                                <div className="flex items-start gap-3">
                                    <FiActivity className="text-amber-600 text-lg shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-extrabold text-sm text-slate-900">
                                            PT Conversion Mode Active: Current Gym Plan Retained
                                        </p>
                                        <p className="mt-0.5 text-slate-700 font-medium">
                                            Active gym plan ({activeRegularMem?.planName || activeRegularMem?.membershipPlanId?.name || 'Active Plan'} - ₹{(activeRegularMem?.paidAmount || activeRegularMem?.finalPrice || 10000).toLocaleString()} already submitted) is retained and active. That ₹10,000 is not billed again. Only the PT package fee is payable today.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPTConversionMode(false);
                                            setPtAddonEnabled(false);
                                            if (activeRegularMem) loadMembershipForEdit(activeRegularMem);
                                        }}
                                        className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Switch to Regular Plan
                                    </button>
                                </div>
                            </div>
                        )}

                        {!(isPTPackageOnlyMode || isPTConversionMode) && (activeRegularMem || scheduledRegularMem) && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-950 shadow-2xs">
                                <div className="flex items-start gap-3">
                                    <FiCalendar className="text-[#CA0410] text-lg shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-extrabold text-sm text-slate-900">
                                            {editMode 
                                                ? (isEditingScheduled 
                                                    ? `Editing Scheduled Plan: ${scheduledRegularMem?.planName || scheduledRegularMem?.membershipPlanId?.name || 'Scheduled Plan'}` 
                                                    : `Editing Active Plan: ${activeRegularMem?.planName || activeRegularMem?.membershipPlanId?.name || 'Active Plan'}`)
                                                : (activeRegularMem 
                                                    ? `Member Active Till ${formatDate(activeRegularMem.paidUntilDate || activeRegularMem.endDate)}` 
                                                    : `Member has Scheduled Plan Starting ${formatDate(scheduledRegularMem?.startDate)}`)}
                                        </p>
                                        <p className="mt-0.5 text-slate-600 font-medium">
                                            {editMode 
                                                ? (isEditingScheduled
                                                    ? `Scheduled to start on ${formatDate(scheduledRegularMem?.startDate)} and end on ${formatDate(scheduledRegularMem?.endDate)}.`
                                                    : `Currently active. Changes will update the member's active subscription.`)
                                                : (activeRegularMem
                                                    ? `This new plan will be saved as a Scheduled (Future) Plan starting on ${formData.planStartDate ? formatDate(formData.planStartDate) : 'future date'}.`
                                                    : `Starts on ${formData.planStartDate ? formatDate(formData.planStartDate) : 'selected date'}.`)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                    {activeRegularMem && (
                                        <button
                                            type="button"
                                            onClick={() => switchToPTConversionMode(selectedMember)}
                                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                                        >
                                            <FiActivity size={13} />
                                            Convert to PT
                                        </button>
                                    )}
                                    {editMode ? (
                                        <>
                                            {isEditingScheduled && activeRegularMem && (
                                                <button
                                                    type="button"
                                                    onClick={() => loadMembershipForEdit(activeRegularMem)}
                                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    Edit Active Plan Instead
                                                </button>
                                            )}
                                            {isEditingActive && scheduledRegularMem && (
                                                <button
                                                    type="button"
                                                    onClick={() => loadMembershipForEdit(scheduledRegularMem)}
                                                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    Edit Scheduled Plan Instead
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => switchToScheduleMode(selectedMember)}
                                                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                            >
                                                Switch to Schedule / Assign Mode
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {activeRegularMem && (
                                                <button
                                                    type="button"
                                                    onClick={() => loadMembershipForEdit(activeRegularMem)}
                                                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    Edit Active Plan
                                                </button>
                                            )}
                                            {scheduledRegularMem && (
                                                <button
                                                    type="button"
                                                    onClick={() => loadMembershipForEdit(scheduledRegularMem)}
                                                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    Edit Scheduled Plan
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
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
                                            <FiAward size={12} /> Wallet: ₹{Number(walletBalanceAvailable).toFixed(2)}
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

                            {isPTConversionMode ? (
                                <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900">
                                    PT will be added as a separate package. The member's current gym plan and its fee will not change.
                                </div>
                            ) : (
                                <>
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
                                    {showTrainerField && (
                                        <Input type="number" label="Total PT Sessions" name="totalSessions" value={formData.totalSessions} onChange={handleChange} placeholder="e.g. 12 or 24 sessions (0 for unlimited)" />
                                    )}
                                    <Input type="number" label="Bonus Days (Optional)" name="bonusDays" value={formData.bonusDays} onChange={handleChange} placeholder="e.g. 5" />

                                    {formData.membershipPlanId && !selectedPlanIsPT && (
                                        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={ptAddonEnabled}
                                                    onChange={(event) => setPtAddonEnabled(event.target.checked)}
                                                    className="w-4 h-4 text-[#CA0410] rounded focus:ring-[#CA0410] cursor-pointer"
                                                />
                                                <span className="text-xs font-extrabold text-amber-900">Add PT package separately</span>
                                                <span className="text-xs text-amber-800">Gym plan and PT package keep separate fees and sessions.</span>
                                            </label>
                                            {ptAddonEnabled && activeRegularMem && (activeMemAlreadyPaid || (editMode && existingPaidAmount >= netPayable)) && (
                                                <div className="text-[11.5px] font-bold text-emerald-800 bg-emerald-100/90 p-2.5 rounded-lg border border-emerald-300 flex items-center gap-2">
                                                    <FiCheckCircle className="text-emerald-700 shrink-0 text-base" />
                                                    <span>
                                                        Current Gym Plan ({activeRegularMem?.planName || 'Active Plan'} - ₹{(activeRegularMem?.paidAmount || activeRegularMem?.finalPrice || 10000).toLocaleString()} already submitted) is retained. That ₹10,000 will NOT be charged again. Only the PT package fee below is payable.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {/* Referral / Discount Coupon Box */}
                            {!isPTConversionMode && !isPTPackageOnlyMode && (
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
                            )}

                        </FormSection>

                        {showPTAddon && (
                            <FormSection title="PT Add-on" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">PT Package <span className="text-rose-500">*</span></label>
                                    <select
                                        value={ptAddonPlanId}
                                        onChange={(event) => {
                                            const planId = event.target.value;
                                            const plan = memberships.find(item => item._id === planId);
                                            const planFee = plan ? (plan.price || 0) : '';
                                            setPtAddonPlanId(planId);
                                            setPtAddonFee(planFee);
                                            setPtAddonSessions(plan ? plan.sessions || 0 : '');
                                            setPtAddonTrainerId('');
                                            if (isPTPackageOnlyMode || isPTConversionMode) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    amountPaid: planFee
                                                }));
                                            }
                                        }}
                                        className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#CA0410]"
                                    >
                                        <option value="">-- Select PT package --</option>
                                        {memberships.filter(isPTPlan).map(plan => (
                                            <option key={plan._id} value={plan._id}>{plan.name} (₹{plan.price})</option>
                                        ))}
                                    </select>
                                </div>
                                {ptAddonPlanId && (
                                    <>
                                        <Input type="date" label="PT Start Date" value={ptAddonStartDate} disabled />
                                        <Input type="date" label="PT End Date" value={ptAddonEndDate} disabled />
                                        <Input type="number" label="PT Sessions" value={ptAddonSessions} onChange={(event) => setPtAddonSessions(event.target.value)} min="0" />
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5">PT Trainer <span className="text-rose-500">*</span></label>
                                            <select
                                                value={ptAddonTrainerId}
                                                onChange={(event) => setPtAddonTrainerId(event.target.value)}
                                                className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#CA0410]"
                                            >
                                                <option value="">-- Select Trainer --</option>
                                                {staffList.map(staff => <option key={staff._id} value={staff._id}>{staff.name} ({staff.role || 'Staff'})</option>)}
                                            </select>
                                        </div>
                                        <Input 
                                            type="number" 
                                            label="PT Fee (₹)" 
                                            value={ptAddonFee} 
                                            onChange={(event) => {
                                                const val = event.target.value;
                                                setPtAddonFee(val);
                                                if (isPTPackageOnlyMode || isPTConversionMode) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        amountPaid: val
                                                    }));
                                                }
                                            }} 
                                            min="0" 
                                        />
                                    </>
                                )}
                            </FormSection>
                        )}

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

                        </FormSection>

                        {/* SECTION 2: PAYMENT & FINANCIAL SUMMARY */}
                        <FormSection title="Payment Collection & Receipt Details" icon={<FiCreditCard />} className="space-y-5">
                            
                            {/* Dynamic Price Summary Header Cards */}
                            <div className={`grid grid-cols-1 sm:grid-cols-2 ${editMode || isPTPackageOnlyMode ? 'lg:grid-cols-4' : 'lg:grid-cols-4'} gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80`}>
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                                        {isPTPackageOnlyMode ? "PT Package Fee (₹)" : (editMode ? "Net Plan Price (₹)" : "Overall Amount Due (₹)")}
                                    </p>
                                    <p className="text-lg font-black text-slate-800 mt-1">
                                        ₹{(isPTPackageOnlyMode ? ptAddonFeeAmount : (editMode ? netPayable : overallPayableNow)).toLocaleString()}
                                    </p>
                                    {isPTPackageOnlyMode && (
                                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                            Gym plan ₹{(activeRegularMem?.paidAmount || activeRegularMem?.finalPrice || 10000).toLocaleString()} already submitted
                                        </p>
                                    )}
                                </div>
                                {isPTPackageOnlyMode ? (
                                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
                                        <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-1">Current Gym Plan</p>
                                        <p className="text-sm font-black text-emerald-900 mt-1 truncate">
                                            {activeRegularMem?.planName || activeRegularMem?.membershipPlanId?.name || 'Active Gym Plan'}
                                        </p>
                                        <p className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">
                                            ₹{(activeRegularMem?.paidAmount || activeRegularMem?.finalPrice || 10000).toLocaleString()} Paid & Retained
                                        </p>
                                    </div>
                                ) : (
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
                                )}
                                {isPTPackageOnlyMode ? (
                                    <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
                                        <p className="text-[10px] font-extrabold text-[#CA0410] uppercase tracking-wider">Remaining PT Balance</p>
                                        <p className="text-lg font-black text-[#CA0410] mt-0.5">₹{Number(remainingBalance).toFixed(2)}</p>
                                    </div>
                                ) : editMode ? (
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Previously Paid (₹)</p>
                                        <p className="text-lg font-black text-emerald-600 mt-1">₹{Number(existingPaidAmount).toFixed(2)}</p>
                                    </div>
                                ) : (
                                    <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
                                        <p className="text-[10px] font-extrabold text-[#CA0410] uppercase tracking-wider">Remaining After Payment</p>
                                        <p className="text-lg font-black text-[#CA0410] mt-0.5">₹{Number(remainingBalance).toFixed(2)}</p>
                                    </div>
                                )}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                        {isPTPackageOnlyMode ? 'PT Payment Status' : (editMode ? `Balance Due: ₹${Number(remainingBalance).toFixed(2)}` : 'Payment Status')}
                                    </p>
                                    <div className="mt-1">
                                        {remainingBalance === 0 && (isPTPackageOnlyMode ? ptAddonFeeAmount > 0 : true) ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                                                <FiCheckCircle /> Full Paid
                                            </span>
                                        ) : (totalCollectedOverall > 0 || (!isPTPackageOnlyMode && editMode && existingPaidAmount > 0)) ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">
                                                <FiInfo /> Partial (Due: ₹{Number(remainingBalance).toFixed(2)})
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md">
                                                Unpaid (Due: ₹{Number(overallPayableNow).toFixed(2)})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Wallet Usage Toggle */}
                            {!editMode && selectedMember && walletBalanceAvailable > 0 && (
                                <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="useWallet"
                                            name="useWallet"
                                            checked={formData.useWallet}
                                            onChange={(event) => {
                                                const useWallet = event.target.checked;
                                                const walletContribution = useWallet
                                                    ? round2(Math.min(walletBalanceAvailable, overallPayableNow))
                                                    : 0;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    useWallet,
                                                    amountPaid: round2(Math.max(0, overallPayableNow - walletContribution))
                                                }));
                                            }}
                                            className="w-4 h-4 text-[#CA0410] rounded-md focus:ring-[#CA0410] cursor-pointer"
                                        />
                                        <label htmlFor="useWallet" className="text-xs font-bold text-slate-800 cursor-pointer">
                                            Use Member Wallet Balance (Available: <span className="font-black text-[#CA0410]">₹{Number(walletBalanceAvailable).toFixed(2)}</span>)
                                        </label>
                                    </div>
                                    {formData.useWallet && (
                                        <span className="text-xs font-extrabold text-[#CA0410] bg-white px-3 py-1 rounded-lg border border-rose-200 shadow-2xs">
                                            Deducting ₹{Number(calculatedWalletUsed).toFixed(2)} from wallet
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Payment Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                <Input 
                                    type="number" 
                                    label={isPTPackageOnlyMode ? "PT Amount Received Today (₹)" : (editMode ? "Additional Amount Received Today (₹)" : (isFuturePlan ? "Advance Received Today (₹, optional)" : "Overall Amount Received Today (₹)"))} 
                                    name="amountPaid" 
                                    value={formData.amountPaid} 
                                    onChange={handleChange} 
                                    placeholder={isPTPackageOnlyMode ? "Enter PT paid amount" : (editMode ? "0 (or enter additional amount)" : (isFuturePlan ? "0 (Advance, optional)" : "Enter paid amount"))} 
                                    required={!editMode && !isFuturePlan && !isPTPackageOnlyMode} 
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
                                {isPTPackageOnlyMode || isPTConversionMode
                                    ? `Assign PT Package & Collect Payment (₹${Number(totalCollectedOverall).toFixed(2)})`
                                    : editMode 
                                    ? (totalCollectedOverall > 0 ? `Update Plan & Record Payment (₹${Number(totalCollectedOverall).toFixed(2)})` : 'Save Plan Changes')
                                    : `Assign Membership & Collect Payment (₹${Number(totalCollectedOverall).toFixed(2)})`}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
