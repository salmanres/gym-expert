import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiUser, FiMapPin, FiMessageSquare } from 'react-icons/fi';
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

export default function LeadForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isEdit = !!id;
    const [loading, setLoading] = useState(isEdit && !location.state?.lead);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', gender: 'Male', dob: '', contactNumber: '', altContact: '', email: '',
        address: '', source: '', inquiryFor: '', followUpDate: '', followUpTime: '', trialDate: '', trialEndDate: '',
        convertibility: 'Warm', status: 'Pending', attendedBy: 'Admin',
        response: '', offerAmount: '', offerDetails: '', sendTextAndEmail: false, sendWhatsApp: false
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isEdit) {
            if (location.state?.lead) {
                // If lead data was passed through navigation state, use it directly
                setFormData({ ...location.state.lead, sendTextAndEmail: false, sendWhatsApp: false });
                setLoading(false);
            } else {
                // Otherwise fetch it from the backend
                const fetchLead = async () => {
                    try {
                        const res = await apiClient.get(`/enquiries/${id}`);
                        setFormData({ ...res.data, sendTextAndEmail: false, sendWhatsApp: false });
                        setLoading(false);
                    } catch (error) {
                        toast.error("Failed to fetch lead details");
                        navigate('/dashboard/owner/leads');
                    }
                };
                fetchLead();
            }
        }
    }, [id, navigate, isEdit, location.state]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ 
            ...formData, 
            [name]: type === 'checkbox' ? checked : value 
        });
        // Clear error when user types
        if (errors[name]) {
            setErrors({ ...errors, [name]: null });
        }
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

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fix the highlighted errors before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            let leadId = id;
            if (isEdit) {
                await apiClient.put(`/enquiries/${id}`, formData);
                toast.success("Lead updated successfully");
            } else {
                const response = await apiClient.post('/enquiries', formData);
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
                            <Select label="Status" name="status" value={formData.status || ''} onChange={handleChange} required options={['Pending', 'Contacted', 'Negotiation', 'Converted', 'Lost']} error={errors.status}>
                                {formData.status === 'Lead' && <option value="Lead" className="hidden">Lead</option>}
                            </Select>
                            
                            {formData.status === 'Negotiation' && (
                                <>
                                    <Input 
                                        type="number"
                                        label="Offer Amount (₹)" 
                                        name="offerAmount" 
                                        value={formData.offerAmount || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 5000" 
                                    />
                                    <Input 
                                        containerClassName="sm:col-span-2 lg:col-span-2"
                                        label="Offer Details" 
                                        name="offerDetails" 
                                        value={formData.offerDetails || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 3 Months + 1 Month Free" 
                                    />
                                </>
                            )}
                            
                            <Textarea containerClassName="sm:col-span-2 lg:col-span-3 xl:col-span-4" label="Response / Feedback" name="response" value={formData.response || ''} onChange={handleChange} required className="h-[104px]" placeholder="Enter discussion notes or client requirements..." error={errors.response} />
                        </FormSection>

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
