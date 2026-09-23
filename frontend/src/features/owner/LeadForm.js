import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiUser, FiMapPin, FiMessageSquare, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { toast } from '../../utils/toast';
import apiClient from '../../api/apiClient';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Textarea from '../../components/form/Textarea';
import Checkbox from '../../components/form/Checkbox';
import Button from '../../components/form/Button';
import Loader from '../../components/page/Loader';
import { formatDate, toInputDateFormat, getTodayInputDate } from '../../utils/dateUtils';
import { useRef } from 'react';

export default function LeadForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isEdit = !!id;
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [gymSettings, setGymSettings] = useState(null);
    const [membershipPlans, setMembershipPlans] = useState([]);
    const [existingMembers, setExistingMembers] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [logNewFollowUp, setLogNewFollowUp] = useState(false);
    
    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const defaultRole = loggedUser.role === 'GYM_OWNER' ? 'Owner' : (loggedUser.role === 'ADMIN' || loggedUser.role === 'SUPERADMIN' ? 'Admin' : (loggedUser.role === 'TRAINER' ? 'Trainer' : 'Staff'));
    const defaultName = loggedUser.name || defaultRole;

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', gender: 'Male', dob: '', contactNumber: '', altContact: '', email: '',
        address: '', source: '', referredBy: '', inquiryFor: '', followUpDate: '', followUpTime: '', trialDate: '', trialEndDate: '',
        trialFeeType: 'Unpaid', trialFee: '', trialPaymentStatus: 'Unpaid', trialPaymentMode: 'Cash', securityAmount: '',
        convertibility: 'Warm', status: 'Pending', attendedBy: defaultName, addedByName: defaultName, addedByRole: defaultRole,
        response: '', offerAmount: '', offerDetails: '', selectedOffer: '', lostReason: '', sendTextAndEmail: false, sendWhatsApp: false,
        followUpHistory: []
    });
    const [errors, setErrors] = useState({});
    const negotiationRef = useRef(null);
    const lostReasonRef = useRef(null);
    const followUpDateRef = useRef(null);
    const trialDateRef = useRef(null);
    const responseRef = useRef(null);
    const statusRef = useRef(null);

    useEffect(() => {
        if (!loading && location.state?.autoFocusStatus) {
            setTimeout(() => {
                if (location.state.autoFocusStatus === 'Negotiation' && negotiationRef.current) {
                    negotiationRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    negotiationRef.current.focus();
                } else if (location.state.autoFocusStatus === 'Lost' && lostReasonRef.current) {
                    lostReasonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    lostReasonRef.current.focus();
                } else if (location.state.autoFocusStatus === 'Contacted' && followUpDateRef.current) {
                    followUpDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    followUpDateRef.current.focus();
                } else if (location.state.autoFocusStatus === 'Trial' && trialDateRef.current) {
                    trialDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    trialDateRef.current.focus();
                }
            }, 500);
        }
    }, [loading, location.state]);

    useEffect(() => {
        const fetchGymAndPlans = async () => {
            try {
                const [gymRes, plansRes, membersRes, staffRes] = await Promise.all([
                    apiClient.get('/gyms/my-gym').catch(() => ({ data: null })),
                    apiClient.get('/membership-plans').catch(() => ({ data: [] })),
                    apiClient.get('/members').catch(() => ({ data: [] })),
                    apiClient.get('/staff').catch(() => ({ data: [] }))
                ]);
                if (gymRes?.data) setGymSettings(gymRes.data);
                if (plansRes?.data) setMembershipPlans(plansRes.data);
                if (membersRes?.data) setExistingMembers(membersRes.data || []);
                if (staffRes?.data) setStaffMembers(staffRes.data || []);

                if (isEdit) {
                    let leadData = location.state?.lead;
                    if (!leadData) {
                        const leadRes = await apiClient.get(`/enquiries/${id}`);
                        leadData = leadRes.data;
                    }
                    if (leadData) {
                        const allCoupons = gymRes?.data?.couponOffers || [];
                        let matchedOfferId = '';
                        let matchedOfferDetails = leadData.offerDetails || leadData.offer || '';
                        let matchedOfferAmount = (leadData.offerAmount !== undefined && leadData.offerAmount !== null) ? leadData.offerAmount : '';

                        if (allCoupons.length > 0) {
                            const rawOfferId = (leadData.selectedOffer || '').toString().trim();
                            const rawDetails = (leadData.offerDetails || leadData.offer || '').toString().trim();

                            const matchedOffer = allCoupons.find(o => 
                                (rawOfferId && (o._id?.toString() === rawOfferId || o.code?.toLowerCase() === rawOfferId.toLowerCase())) ||
                                (rawDetails && o.title?.toLowerCase() === rawDetails.toLowerCase()) ||
                                (rawDetails && o.code?.toLowerCase() === rawDetails.toLowerCase()) ||
                                (rawDetails && (rawDetails.toLowerCase().includes(o.title?.toLowerCase()) || (o.code && rawDetails.toLowerCase().includes(o.code.toLowerCase())))) ||
                                (rawDetails && o.title && o.title.toLowerCase().includes(rawDetails.toLowerCase())) ||
                                (matchedOfferAmount !== '' && Number(matchedOfferAmount) === Number(o.discountValue) && o.isActive)
                            );

                            if (matchedOffer) {
                                matchedOfferId = matchedOffer._id;
                                if (!matchedOfferDetails) {
                                    matchedOfferDetails = matchedOffer.title;
                                }
                                if (matchedOfferAmount === '' && matchedOffer.discountValue !== undefined) {
                                    matchedOfferAmount = matchedOffer.discountValue;
                                }
                            } else if (rawOfferId === 'Custom' || rawDetails || (matchedOfferAmount !== '' && Number(matchedOfferAmount) > 0)) {
                                matchedOfferId = 'Custom';
                            }
                        } else if (leadData.selectedOffer === 'Custom' || leadData.offerDetails || (matchedOfferAmount !== '' && Number(matchedOfferAmount) > 0)) {
                            matchedOfferId = 'Custom';
                        }

                        setFormData({ 
                            ...leadData, 
                            dob: toInputDateFormat(leadData.dob),
                            followUpDate: toInputDateFormat(leadData.followUpDate),
                            trialDate: toInputDateFormat(leadData.trialDate),
                            trialEndDate: toInputDateFormat(leadData.trialEndDate),
                            trialFeeType: leadData.trialFeeType || 'Unpaid',
                            trialFee: leadData.trialFee ?? '',
                            trialPaymentStatus: leadData.trialPaymentStatus || 'Unpaid',
                            trialPaymentMode: leadData.trialPaymentMode || 'Cash',
                            referredBy: leadData.referredBy || '',
                            selectedOffer: matchedOfferId,
                            offerAmount: matchedOfferAmount,
                            offerDetails: matchedOfferDetails,
                            sendTextAndEmail: false, 
                            sendWhatsApp: false,
                            response: '',
                            followUpTime: leadData.followUpTime || ''
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading lead data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGymAndPlans();
    }, [id, isEdit, location.state]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = value;
        
        if (name === 'selectedOffer') {
            if (finalValue === 'Custom') {
                setFormData({
                    ...formData,
                    selectedOffer: 'Custom'
                });
            } else if (finalValue === '') {
                setFormData({
                    ...formData,
                    selectedOffer: '',
                    offerDetails: '',
                    offerAmount: ''
                });
            } else {
                const selectedOffer = gymSettings?.couponOffers?.find(o => o._id === finalValue);
                if (selectedOffer) {
                    setFormData({
                        ...formData,
                        selectedOffer: finalValue,
                        offerDetails: selectedOffer.title,
                        offerAmount: selectedOffer.discountValue !== undefined ? selectedOffer.discountValue : '' 
                    });
                }
            }
            return;
        }

        if (['contactNumber', 'altContact', 'emergencyContactNumber'].includes(name)) {
            finalValue = finalValue.replace(/\D/g, '').slice(0, 10);
        }

        setFormData({ 
            ...formData, 
            [name]: type === 'checkbox' ? checked : finalValue 
        });
        // Clear error when user types
        if (errors[name]) {
            setErrors({ ...errors, [name]: null });
        }
    };

    const handleDeleteFollowUp = (index) => {
        setFormData(prev => {
            const updatedHistory = [...prev.followUpHistory];
            const originalIndex = updatedHistory.length - 1 - index;
            updatedHistory.splice(originalIndex, 1);
            
            if (updatedHistory.length > 0) {
                const latest = updatedHistory[updatedHistory.length - 1];
                return { 
                    ...prev, 
                    followUpHistory: updatedHistory,
                    status: latest.status || 'Pending',
                    response: latest.response || '',
                    followUpDate: latest.nextFollowUpDate ? toInputDateFormat(latest.nextFollowUpDate) : '',
                    followUpTime: latest.nextFollowUpTime || ''
                };
            } else {
                return {
                    ...prev,
                    followUpHistory: updatedHistory,
                    status: 'Pending',
                    response: '',
                    followUpDate: '',
                    followUpTime: ''
                };
            }
        });
    };

    const handleEditFollowUp = (index) => {
        const originalIndex = formData.followUpHistory.length - 1 - index;
        const item = formData.followUpHistory[originalIndex];
        
        setFormData(prev => {
            const updatedHistory = [...prev.followUpHistory];
            updatedHistory.splice(originalIndex, 1);
            
            return {
                ...prev,
                followUpHistory: updatedHistory,
                response: item.response || '',
                followUpDate: item.nextFollowUpDate ? toInputDateFormat(item.nextFollowUpDate) : '',
                followUpTime: item.nextFollowUpTime || '',
                status: item.status || prev.status
            };
        });

        // Focus & smooth scroll directly to the corresponding fields
        setTimeout(() => {
            const targetStatus = item.status || formData.status;
            if (targetStatus === 'Trial' && trialDateRef.current) {
                trialDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                trialDateRef.current.focus?.();
            } else if (targetStatus === 'Negotiation' && negotiationRef.current) {
                negotiationRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                negotiationRef.current.focus?.();
            } else if (targetStatus === 'Lost' && lostReasonRef.current) {
                lostReasonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                lostReasonRef.current.focus?.();
            } else if (responseRef.current) {
                responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                responseRef.current.focus?.();
            } else if (followUpDateRef.current) {
                followUpDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                followUpDateRef.current.focus?.();
            }
        }, 150);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let newErrors = {};

        // Validate mandatory text fields to prevent empty spaces
        const requiredText = ['firstName', 'contactNumber'];
        for (let field of requiredText) {
            if (!formData[field] || String(formData[field]).trim() === '') {
                newErrors[field] = 'This field is required';
            }
        }

        // Validate Indian Phone Number format
        if (formData.contactNumber && !/^[6-9]\d{9}$/.test(formData.contactNumber)) {
            newErrors.contactNumber = 'Invalid 10-digit mobile number';
        }

        if (formData.altContact && !/^[6-9]\d{9}$/.test(formData.altContact)) {
            newErrors.altContact = 'Invalid 10-digit mobile number';
        }

        if (formData.status === 'Negotiation') {
            if (!formData.offerDetails || formData.offerDetails.trim() === '') newErrors.offerDetails = 'Offer details are required';
        }

        if (formData.status === 'Lost') {
            if (!formData.lostReason || formData.lostReason.trim() === '') newErrors.lostReason = 'Please specify the reason for losing this lead';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fix the highlighted errors before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            let submitData = { 
                ...formData,
                followUpDate: formData.followUpDate || null
            };

            // Persist trial dates and fees if set or if status is Trial, Negotiation, or Converted
            if (!['Trial', 'Negotiation', 'Converted'].includes(formData.status) && !formData.trialDate) {
                submitData.trialDate = null;
                submitData.trialEndDate = null;
                submitData.trialFee = 0;
                submitData.securityAmount = 0;
            } else if (formData.trialFeeType !== 'Paid') {
                submitData.trialFee = 0;
                submitData.securityAmount = 0;
            }
            
            // Check if current form inputs are different from the latest history item
            let isDifferent = true;
            let statusChanged = false;
            if (submitData.followUpHistory && submitData.followUpHistory.length > 0) {
                const latest = submitData.followUpHistory[submitData.followUpHistory.length - 1];
                const latestNextDate = toInputDateFormat(latest.nextFollowUpDate);
                const currentNextDate = toInputDateFormat(submitData.followUpDate);
                
                if (latest.response === submitData.response && latestNextDate === currentNextDate && latest.nextFollowUpTime === submitData.followUpTime) {
                    isDifferent = false; // They didn't change the response or date
                }
                if (latest.status !== submitData.status) {
                    statusChanged = true;
                }
            } else {
                statusChanged = true;
            }

            const hasResponse = submitData.response && submitData.response.trim() !== '';

            // Auto-add it to history if it's new/changed, OR if the status changed without a response!
            if ((isDifferent && hasResponse) || (statusChanged && !hasResponse)) {
                const autoAddedItem = {
                    contactDate: new Date().toISOString(),
                    response: hasResponse ? submitData.response : `Status updated to ${submitData.status}`,
                    nextFollowUpDate: submitData.followUpDate || null,
                    nextFollowUpTime: submitData.followUpTime || '',
                    status: submitData.status
                };
                submitData.followUpHistory = [...(submitData.followUpHistory || []), autoAddedItem];
            }

            // Sync top-level response for the Leads list view if no new response was provided
            if (submitData.followUpHistory && submitData.followUpHistory.length > 0) {
                const latestHistory = submitData.followUpHistory[submitData.followUpHistory.length - 1];
                if (!hasResponse) {
                    submitData.response = latestHistory.response;
                }
                // We do NOT overwrite submitData.followUpDate or submitData.status here, 
                // as the form fields are the source of truth!
            }

            let leadId = id;
            if (isEdit) {
                await apiClient.put(`/enquiries/${id}`, submitData);
                toast.success("Lead updated successfully");
            } else {
                const response = await apiClient.post('/enquiries', submitData);
                leadId = response.data._id;
                toast.success("Lead added successfully");
            }
            
            if (formData.status === 'Converted') {
                navigate('/dashboard/owner/members/add', { state: { convertedLead: { ...formData, _id: leadId } } });
            } else {
                navigate('/dashboard/owner/leads');
            }
        } catch (error) {
            toast.error(isEdit ? "Failed to update lead" : "Failed to add lead");
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Loader text="Loading lead details..." />;
    }

    return (
        <PageLayout>
            <PageHeader 
                title={isEdit ? "Edit Enquiry" : "Add New Record"}
                subtitle={isEdit ? "Update existing lead details" : "Record new details"}
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 bg-[#FAEEEF]">
                <div className="w-full max-w-7xl mx-auto">
                    <form id="leadForm" onSubmit={handleSubmit} className="flex flex-col" noValidate>
                        {/* The top 'Save As' toggle has been moved to the footer as a checkbox */}

                        <FormSection title="Personal Details" icon={<FiUser />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} required placeholder="First Name" error={errors.firstName} />
                            <Input label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} placeholder="Last Name" error={errors.lastName} />
                            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} options={['Male', 'Female', 'Other']} error={errors.gender} />
                            <Input type="date" label="Date of Birth" name="dob" value={formData.dob || ''} onChange={handleChange} error={errors.dob} />
                            <Input type="tel" label="Phone Number" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required placeholder="10-digit mobile" pattern="[6-9][0-9]{9}" maxLength={10} title="Please enter a valid 10-digit Indian mobile number starting with 6-9" error={errors.contactNumber} />
                            <Input type="tel" label="Alt. Phone" name="altContact" value={formData.altContact || ''} onChange={handleChange} placeholder="Secondary Phone" pattern="[6-9][0-9]{9}" maxLength={10} title="Please enter a valid 10-digit Indian mobile number starting with 6-9" error={errors.altContact} />
                            <Input type="email" label="Email Address" name="email" value={formData.email || ''} onChange={handleChange} placeholder="email@example.com" error={errors.email} />
                        </FormSection>

                        <FormSection title="Inquiry Details" icon={<FiMapPin />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input containerClassName="sm:col-span-2 lg:col-span-3 xl:col-span-2" label="Residential Address" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Street, Area, City" error={errors.address} />
                            <Select label="Source" name="source" value={formData.source || ''} onChange={handleChange} error={errors.source}>
                                <option value="">--Select--</option>
                                <option value="Walk-in">Walk-in</option>
                                <option value="Website">Website</option>
                                <option value="Reference">Reference</option>
                                <option value="Just Dial">Just Dial</option>
                            </Select>
                            {formData.source === 'Reference' && (
                                <Select
                                    label="Reference By (Member / Staff)"
                                    name="referredBy"
                                    value={formData.referredBy || ''}
                                    onChange={handleChange}
                                    placeholder="-- Select Member or Staff --"
                                    error={errors.referredBy}
                                >
                                    {existingMembers && existingMembers.length > 0 && (
                                        <optgroup label="Existing Members">
                                            {existingMembers.map(m => {
                                                const name = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Gym Member';
                                                const code = m.memberId ? `[${m.memberId}] ` : '';
                                                const phone = m.contactNumber ? `(${m.contactNumber})` : '';
                                                const displayVal = `${name} ${phone}`.trim();
                                                return (
                                                    <option key={m._id} value={displayVal}>
                                                        {code}{displayVal} (Member)
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}
                                    {staffMembers && staffMembers.length > 0 && (
                                        <optgroup label="Gym Staff & Trainers">
                                            {staffMembers.map(s => {
                                                const role = s.role === 'STAFF' ? 'Staff' : s.role === 'TRAINER' ? 'Trainer' : (s.role || 'Staff');
                                                const displayVal = `${s.name || 'Staff'} (${role})`;
                                                return (
                                                    <option key={s._id} value={displayVal}>
                                                        {displayVal}
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    )}
                                </Select>
                            )}
                            <Select label="Enquiry For / Target Plan" name="inquiryFor" value={formData.inquiryFor || ''} onChange={handleChange} error={errors.inquiryFor}>
                                <option value="">-- Select Target Plan or Service --</option>
                                {membershipPlans && membershipPlans.length > 0 && (
                                    <optgroup label="Gym Membership Plans">
                                        {membershipPlans.filter(p => p.isActive !== false).map(plan => {
                                            const title = plan.name || plan.planName || 'Plan';
                                            return (
                                                <option key={plan._id} value={title}>
                                                    {`${title} (₹${plan.price})`}
                                                </option>
                                            );
                                        })}
                                    </optgroup>
                                )}
                                <optgroup label="General Services / Categories">
                                    <option value="Gym (General)">Gym (General)</option>
                                    <option value="Personal Training (PT)">Personal Training (PT)</option>
                                    <option value="Zumba">Zumba</option>
                                    <option value="Yoga">Yoga</option>
                                    <option value="Crossfit">Crossfit</option>
                                </optgroup>
                            </Select>
                            {(['Trial', 'Negotiation', 'Converted'].includes(formData.status) || formData.trialDate) && (
                                <>
                                    <Input type="date" label="Trial Start Date" name="trialDate" value={formData.trialDate || ''} onChange={handleChange} error={errors.trialDate} inputRef={trialDateRef} />
                                    <Input type="date" label="Trial End Date" name="trialEndDate" value={formData.trialEndDate || ''} onChange={handleChange} min={formData.trialDate || ''} error={errors.trialEndDate} />
                                    <Select label="Trial Type" name="trialFeeType" value={formData.trialFeeType || 'Unpaid'} onChange={handleChange} options={['Unpaid', 'Paid']} error={errors.trialFeeType} />
                                    {formData.trialFeeType === 'Paid' && (
                                        <>
                                            <Input 
                                                type="number" 
                                                label="Security Amount (₹)" 
                                                name="securityAmount" 
                                                value={formData.securityAmount || ''} 
                                                onChange={handleChange} 
                                                placeholder="e.g. 500 (Refundable deposit)" 
                                                error={errors.securityAmount} 
                                            />
                                            <Select 
                                                label="Trial Payment Mode" 
                                                name="trialPaymentMode" 
                                                value={formData.trialPaymentMode || 'Cash'} 
                                                onChange={handleChange} 
                                                options={['Cash', 'UPI', 'Card', 'Net Banking', 'Online']} 
                                                error={errors.trialPaymentMode} 
                                            />
                                        </>
                                    )}
                                </>
                            )}
                            <Select label="Lead Priority" name="convertibility" value={formData.convertibility || ''} onChange={handleChange} required options={['Warm', 'Hot', 'Cold']} error={errors.convertibility} />
                        </FormSection>

                        <FormSection title="Feedback & Action" icon={<FiMessageSquare />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Select inputRef={statusRef} label="Status" name="status" value={formData.status || ''} onChange={handleChange} required options={['Pending', 'Contacted', 'Trial', 'Negotiation', 'Converted', 'Lost']} error={errors.status}>
                            </Select>
                            
                            {['Pending', 'Contacted', 'Trial', 'Negotiation'].includes(formData.status) && (
                                <>
                                    <Input type="date" label="Follow-up Date" name="followUpDate" value={formData.followUpDate || ''} onChange={handleChange} error={errors.followUpDate} inputRef={followUpDateRef} />
                                    <Input type="time" label="Follow-up Time" name="followUpTime" value={formData.followUpTime || ''} onChange={handleChange} error={errors.followUpTime} />
                                </>
                            )}
                            
                            {(formData.status === 'Negotiation' || formData.status === 'Converted') && (
                                <>
                                    <Select 
                                        label="Select Preset Offer" 
                                        name="selectedOffer" 
                                        value={formData.selectedOffer || ''}
                                        onChange={handleChange}
                                    >
                                        <option value="">-- Choose an Offer --</option>
                                        {gymSettings?.couponOffers?.filter(o => o.isActive || o._id === formData.selectedOffer).map(offer => (
                                            <option key={offer._id} value={offer._id}>{offer.title} ({offer.discountType === 'Percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}){!offer.isActive ? ' (Inactive)' : ''}</option>
                                        ))}
                                        <option value="Custom">Custom Offer</option>
                                    </Select>

                                    <Input 
                                        type="number"
                                        label="Offer Amount (₹)" 
                                        name="offerAmount" 
                                        value={formData.offerAmount || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 5000" 
                                        error={errors.offerAmount}
                                        disabled={formData.selectedOffer !== 'Custom'}
                                        className={formData.selectedOffer !== 'Custom' ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
                                    />
                                    <Input 
                                        label="Offer Details" 
                                        name="offerDetails" 
                                        value={formData.offerDetails || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 3 Months + 1 Month Free" 
                                        error={errors.offerDetails}
                                        inputRef={negotiationRef}
                                        disabled={formData.selectedOffer !== 'Custom'}
                                        className={formData.selectedOffer !== 'Custom' ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
                                    />
                                </>
                            )}

                            {formData.status === 'Lost' && (
                                <Input 
                                    containerClassName="sm:col-span-2 lg:col-span-2"
                                    label="Lost Reason" 
                                    name="lostReason" 
                                    value={formData.lostReason || ''} 
                                    onChange={handleChange} 
                                    placeholder="e.g. Joined another gym, Too expensive" 
                                    error={errors.lostReason}
                                    inputRef={lostReasonRef}
                                />
                            )}
                            
                            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col gap-2">
                                <Textarea inputRef={responseRef} label="Response / Feedback" name="response" value={formData.response || ''} onChange={handleChange} className="h-[104px]" placeholder="Enter discussion notes or client requirements..." error={errors.response} />
                            </div>
                        </FormSection>

                        {formData.followUpHistory && formData.followUpHistory.length > 0 && (
                            <FormSection title="Follow-up History" icon={<FiMessageSquare />} className="mt-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50">
                                                <th className="py-2.5 px-3">Contact Date</th>
                                                <th className="py-2.5 px-3">Response / Notes</th>
                                                <th className="py-2.5 px-3">Status</th>
                                                <th className="py-2.5 px-3">Next Follow-up</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {formData.followUpHistory && formData.followUpHistory.length > 0 && (
                                                [...formData.followUpHistory].reverse().map((history, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                                                            {formatDate(history.contactDate)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-700 italic max-w-xs break-words">
                                                            "{history.response}"
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-white border border-slate-200 text-slate-600">
                                                                {history.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                                            <div className="flex flex-col gap-0.5">
                                                                {history.nextFollowUpDate ? (
                                                                    <span className="font-bold text-indigo-600">{formatDate(history.nextFollowUpDate)}</span>
                                                                ) : <span className="text-slate-400">-</span>}
                                                                {history.nextFollowUpTime && (
                                                                    <span className="text-[10px] text-slate-500">{history.nextFollowUpTime}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button type="button" onClick={() => handleEditFollowUp(idx)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                                                                    <FiEdit2 size={14} />
                                                                </button>
                                                                <button type="button" onClick={() => handleDeleteFollowUp(idx)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete">
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </FormSection>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 mt-2 pt-4 border-t border-rose-200/60">
                            <div className="flex items-center gap-6 w-full sm:w-auto flex-wrap">
                                <Checkbox label="Send Text/Email" name="sendTextAndEmail" checked={formData.sendTextAndEmail} onChange={handleChange} />
                                <Checkbox label="Send WhatsApp" name="sendWhatsApp" checked={formData.sendWhatsApp} onChange={handleChange} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button 
                                    type="button" 
                                    onClick={() => navigate('/dashboard/owner/leads')} 
                                    className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full sm:w-auto px-8 py-2.5 bg-[#CA0410] hover:bg-[#a8030d] text-white font-bold text-xs rounded-xl transition-all shadow-2xs hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0"></div>
                                            <span>Saving Enquiry...</span>
                                        </>
                                    ) : (formData.status === 'Converted' ? 'Save & Convert to Member' : (isEdit ? 'Update Enquiry' : 'Save Enquiry'))}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
