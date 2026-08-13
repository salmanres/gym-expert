import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiUser, FiMapPin, FiMessageSquare, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
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
import { useRef } from 'react';

export default function LeadForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isEdit = !!id;
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [gymSettings, setGymSettings] = useState(null);
    const [logNewFollowUp, setLogNewFollowUp] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', gender: 'Male', dob: '', contactNumber: '', altContact: '', email: '',
        address: '', source: '', inquiryFor: '', followUpDate: '', followUpTime: '', trialDate: '', trialEndDate: '',
        convertibility: 'Warm', status: 'Pending', attendedBy: 'Admin',
        response: '', offerAmount: '', offerDetails: '', selectedOffer: '', lostReason: '', sendTextAndEmail: false, sendWhatsApp: false,
        followUpHistory: []
    });
    const [errors, setErrors] = useState({});
    const negotiationRef = useRef(null);
    const lostReasonRef = useRef(null);

    useEffect(() => {
        if (!loading && location.state?.autoFocusStatus) {
            setTimeout(() => {
                if (location.state.autoFocusStatus === 'Negotiation' && negotiationRef.current) {
                    negotiationRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    negotiationRef.current.focus();
                } else if (location.state.autoFocusStatus === 'Lost' && lostReasonRef.current) {
                    lostReasonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    lostReasonRef.current.focus();
                }
            }, 500);
        }
    }, [loading, location.state]);

    useEffect(() => {
        if (isEdit) {
            if (location.state?.lead) {
                // We still need to fetch gym settings for the dropdowns
                const fetchGymOnly = async () => {
                    try {
                        const gymRes = await apiClient.get('/gyms/my-gym');
                        let matchedOfferId = '';
                        if (gymRes?.data) {
                            setGymSettings(gymRes.data);
                            const matchedOffer = gymRes.data.couponOffers?.find(o => o.title === location.state.lead.offerDetails);
                            matchedOfferId = matchedOffer ? matchedOffer._id : (location.state.lead.offerDetails ? 'Custom' : '');
                        }
                        setFormData({ ...location.state.lead, selectedOffer: matchedOfferId, sendTextAndEmail: false, sendWhatsApp: false });
                    } catch (err) {
                        setFormData({ ...location.state.lead, sendTextAndEmail: false, sendWhatsApp: false });
                    }
                    setLoading(false);
                };
                fetchGymOnly();
            } else {
                // Otherwise fetch it from the backend
                const fetchData = async () => {
                    try {
                        const [leadRes, gymRes] = await Promise.all([
                            apiClient.get(`/enquiries/${id}`),
                            apiClient.get('/gyms/my-gym').catch(() => ({ data: null }))
                        ]);
                        let matchedOfferId = '';
                        if (gymRes?.data) {
                            setGymSettings(gymRes.data);
                            const matchedOffer = gymRes.data.couponOffers?.find(o => o.title === leadRes.data.offerDetails);
                            matchedOfferId = matchedOffer ? matchedOffer._id : (leadRes.data.offerDetails ? 'Custom' : '');
                        }
                        setFormData({ ...leadRes.data, selectedOffer: matchedOfferId, sendTextAndEmail: false, sendWhatsApp: false });
                        setLoading(false);
                    } catch (error) {
                        toast.error("Failed to fetch lead details");
                        navigate('/dashboard/owner/leads');
                    }
                };
                fetchData();
            }
        } else {
            // New Lead - just fetch gym settings
            const fetchGym = async () => {
                try {
                    const gymRes = await apiClient.get('/gyms/my-gym');
                    if (gymRes?.data) setGymSettings(gymRes.data);
                    setLoading(false);
                } catch (error) {
                    setLoading(false);
                }
            };
            fetchGym();
        }
    }, [id, navigate, isEdit, location.state]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name === 'selectedOffer') {
            if (value === 'Custom' || value === '') {
                setFormData({
                    ...formData,
                    selectedOffer: value,
                    offerDetails: '',
                    offerAmount: ''
                });
            } else {
                const selectedOffer = gymSettings?.couponOffers?.find(o => o._id === value);
                if (selectedOffer) {
                    setFormData({
                        ...formData,
                        selectedOffer: value,
                        offerDetails: selectedOffer.title,
                        offerAmount: selectedOffer.discountType === 'Flat' ? selectedOffer.discountValue : '' 
                    });
                }
            }
            return;
        }

        setFormData({ 
            ...formData, 
            [name]: type === 'checkbox' ? checked : value 
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
            return { ...prev, followUpHistory: updatedHistory };
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
                response: item.response,
                followUpDate: item.nextFollowUpDate ? new Date(item.nextFollowUpDate).toISOString().split('T')[0] : '',
                followUpTime: item.nextFollowUpTime || '',
                status: item.status || prev.status
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let newErrors = {};

        // Validate mandatory text fields to prevent empty spaces
        const requiredText = ['firstName', 'dob', 'contactNumber'];
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
            let submitData = { ...formData };
            
            // Check if current form inputs are different from the latest history item
            let isDifferent = true;
            if (submitData.followUpHistory && submitData.followUpHistory.length > 0) {
                const latest = submitData.followUpHistory[submitData.followUpHistory.length - 1];
                const latestNextDate = latest.nextFollowUpDate ? new Date(latest.nextFollowUpDate).toISOString().split('T')[0] : '';
                const currentNextDate = submitData.followUpDate ? new Date(submitData.followUpDate).toISOString().split('T')[0] : '';
                
                if (latest.response === submitData.response && latestNextDate === currentNextDate && latest.nextFollowUpTime === submitData.followUpTime) {
                    isDifferent = false; // They didn't change the response or date
                }
            }

            // Auto-add it to history if it's new or changed!
            if (isDifferent && submitData.response && submitData.response.trim() !== '') {
                const autoAddedItem = {
                    contactDate: new Date().toISOString(),
                    response: submitData.response,
                    nextFollowUpDate: submitData.followUpDate || '',
                    nextFollowUpTime: submitData.followUpTime || '',
                    status: submitData.status
                };
                submitData.followUpHistory = [...(submitData.followUpHistory || []), autoAddedItem];
            }

            // Sync top-level fields for the Leads list view based on the latest history item (in case they deleted the last one)
            if (submitData.followUpHistory && submitData.followUpHistory.length > 0) {
                const latestHistory = submitData.followUpHistory[submitData.followUpHistory.length - 1];
                submitData.response = latestHistory.response;
                submitData.followUpDate = latestHistory.nextFollowUpDate;
                submitData.followUpTime = latestHistory.nextFollowUpTime;
                submitData.status = latestHistory.status;
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form id="leadForm" onSubmit={handleSubmit} className="flex flex-col" noValidate>
                        {/* The top 'Save As' toggle has been moved to the footer as a checkbox */}

                        <FormSection title="Personal Details" icon={<FiUser />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} required placeholder="First Name" error={errors.firstName} />
                            <Input label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} placeholder="Last Name" error={errors.lastName} />
                            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} options={['Male', 'Female', 'Other']} error={errors.gender} />
                            <Input type="date" label="Date of Birth" name="dob" value={formData.dob || ''} onChange={handleChange} required error={errors.dob} />
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
                            <Select label="Interest/For" name="inquiryFor" value={formData.inquiryFor || ''} onChange={handleChange} error={errors.inquiryFor}>
                                <option value="">--Select--</option>
                                <option value="Gym">Gym</option>
                                <option value="Zumba">Zumba</option>
                                <option value="Yoga">Yoga</option>
                                <option value="Crossfit">Crossfit</option>
                            </Select>
                            <Input type="date" label="Follow-up Date" name="followUpDate" value={formData.followUpDate || ''} onChange={handleChange} required error={errors.followUpDate} />
                            <Input type="time" label="Follow-up Time" name="followUpTime" value={formData.followUpTime || ''} onChange={handleChange} error={errors.followUpTime} />
                            <Input type="date" label="Trial Start Date" name="trialDate" value={formData.trialDate || ''} onChange={handleChange} error={errors.trialDate} />
                            <Input type="date" label="Trial End Date" name="trialEndDate" value={formData.trialEndDate || ''} onChange={handleChange} min={formData.trialDate || ''} error={errors.trialEndDate} />
                            <Select label="Lead Priority" name="convertibility" value={formData.convertibility || ''} onChange={handleChange} required options={['Warm', 'Hot', 'Cold']} error={errors.convertibility} />
                        </FormSection>

                        <FormSection title="Feedback & Action" icon={<FiMessageSquare />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Select label="Status" name="status" value={formData.status || ''} onChange={handleChange} required options={['Pending', 'Lead', 'Contacted', 'Negotiation', 'Converted', 'Lost']} error={errors.status}>
                            </Select>
                            
                            {(formData.status === 'Negotiation' || formData.status === 'Converted') && (
                                <>
                                    <Select 
                                        label="Select Preset Offer" 
                                        name="selectedOffer" 
                                        value={formData.selectedOffer || ''}
                                        onChange={handleChange}
                                    >
                                        <option value="">-- Choose an Offer --</option>
                                        {gymSettings?.couponOffers?.filter(o => o.isActive).map(offer => (
                                            <option key={offer._id} value={offer._id}>{offer.title} ({offer.discountType === 'Percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`})</option>
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
                                    />
                                    <Input 
                                        label="Offer Details" 
                                        name="offerDetails" 
                                        value={formData.offerDetails || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 3 Months + 1 Month Free" 
                                        error={errors.offerDetails}
                                        inputRef={negotiationRef}
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
                                <Textarea label="Response / Feedback" name="response" value={formData.response || ''} onChange={handleChange} className="h-[104px]" placeholder="Enter discussion notes or client requirements..." error={errors.response} />
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
                                                            {new Date(history.contactDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                                                                    <span className="font-bold text-indigo-600">{new Date(history.nextFollowUpDate).toLocaleDateString('en-GB')}</span>
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

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 mt-2 pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-6 w-full sm:w-auto flex-wrap">
                                <Checkbox label="Send Text/Email" name="sendTextAndEmail" checked={formData.sendTextAndEmail} onChange={handleChange} />
                                <Checkbox label="Send WhatsApp" name="sendWhatsApp" checked={formData.sendWhatsApp} onChange={handleChange} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/leads')} className="w-full sm:w-auto">
                                    Cancel
                                </Button>
                                <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                                    {formData.status === 'Converted' ? 'Save & Convert to Member' : (isEdit ? 'Update Enquiry' : 'Save Enquiry')}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
