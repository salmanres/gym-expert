import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Textarea from '../../components/form/Textarea';
import Button from '../../components/form/Button';
import Loader from '../../components/page/Loader';
import { FiUser, FiMapPin, FiActivity, FiMessageSquare } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';

export default function MemberForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isEdit = !!id;
    const isConversion = !!location.state?.convertedLead;
    
    const [loading, setLoading] = useState(isEdit && !location.state?.member);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', gender: 'Male', contactNumber: '', altContact: '', email: '',
        dob: '', bloodGroup: '', address: '', emergencyContactName: '', emergencyContactNumber: '',
        height: '', weight: '', bmi: '', bodyFat: '', dietPreference: '', medicalConditions: '',
        source: '--Select--', interest: '--Select--', followUpDate: '', followUpTime: '', convertibility: 'Warm',
        attendedBy: 'Admin', response: '',
        joiningDate: new Date().toISOString().split('T')[0], status: 'Active',
        enquiryId: ''
    });

    // Auto-calculate BMI
    useEffect(() => {
        if (formData.height && formData.weight) {
            const heightInMeters = parseFloat(formData.height) / 100;
            const weightInKg = parseFloat(formData.weight);
            if (heightInMeters > 0 && weightInKg > 0) {
                const calculatedBmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
                setFormData(prev => ({ ...prev, bmi: calculatedBmi }));
            }
        }
    }, [formData.height, formData.weight]);

    useEffect(() => {
        if (isEdit && location.state?.member) {
            const member = location.state.member;
            setFormData({
                ...member,
                followUpDate: member.followUpDate ? new Date(member.followUpDate).toISOString().split('T')[0] : ''
            });
            setLoading(false);
        } else if (isConversion) {
            const lead = location.state.convertedLead;
            setFormData(prev => ({
                ...prev,
                firstName: lead.firstName || '',
                lastName: lead.lastName || '',
                gender: lead.gender || 'Male',
                contactNumber: lead.contactNumber || '',
                altContact: lead.altContact || '',
                email: lead.email || '',
                address: lead.address || '',
                source: lead.source || '--Select--',
                interest: lead.interest || '--Select--',
                followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
                followUpTime: lead.followUpTime || '',
                convertibility: lead.convertibility || 'Warm',
                attendedBy: lead.attendedBy || 'Admin',
                response: lead.response || '',
                enquiryId: lead._id
            }));
            setLoading(false);
        } else if (isEdit) {
            navigate('/dashboard/owner/members');
        }
    }, [isEdit, isConversion, location, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) setErrors({ ...errors, [name]: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let newErrors = {};
        const requiredText = ['firstName', 'contactNumber', 'joiningDate'];
        for (let field of requiredText) {
            if (!formData[field] || String(formData[field]).trim() === '') {
                newErrors[field] = 'This field is required';
            }
        }

        if (formData.contactNumber && !/^[6-9]\d{9}$/.test(formData.contactNumber)) {
            newErrors.contactNumber = 'Invalid 10-digit mobile number';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fix the highlighted errors before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            if (isEdit) {
                await apiClient.put(`/members/${id}`, formData);
                toast.success("Member updated successfully");
            } else {
                await apiClient.post('/members', formData);
                toast.success("Member registered successfully");
            }
            navigate('/dashboard/owner/members');
        } catch (error) {
            toast.error(isEdit ? "Failed to update member" : "Failed to register member");
            setSubmitting(false);
        }
    };

    if (loading) return <Loader text="Loading member details..." />;

    return (
        <PageLayout>
            <PageHeader 
                title={isEdit ? "Edit Member" : "New Member Registration"}
                subtitle={isEdit ? "Update member details" : "Register a new member to the gym"}
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    {/* Placeholder for Photo Upload */}
                    <div className="flex items-center gap-6 mb-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400">
                            <FiUser size={32} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Profile Photo</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-3">Upload a clear photo of the member for ID purposes.</p>
                            <button type="button" className="px-4 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold transition-colors">
                                Upload Image
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
                        <FormSection title="Personal Information" icon={<FiUser />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} required placeholder="First Name" error={errors.firstName} />
                            <Input label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} placeholder="Last Name" error={errors.lastName} />
                            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} required error={errors.gender} options={['Male', 'Female', 'Other']} />
                            <Input type="date" label="Date of Birth" name="dob" value={formData.dob || ''} onChange={handleChange} error={errors.dob} />
                            <Input type="tel" label="Phone Number" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required placeholder="10-digit mobile" error={errors.contactNumber} />
                            <Input type="tel" label="Alt. Phone" name="altContact" value={formData.altContact || ''} onChange={handleChange} placeholder="Secondary Phone" error={errors.altContact} />
                            <Input type="email" label="Email Address" name="email" value={formData.email || ''} onChange={handleChange} placeholder="email@example.com" error={errors.email} />
                            <Select label="Blood Group" name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleChange} error={errors.bloodGroup} options={['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
                        </FormSection>

                        <FormSection title="Address & Emergency" icon={<FiMapPin />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input containerClassName="sm:col-span-2" label="Residential Address" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Full address" error={errors.address} />
                            <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} placeholder="Relative Name" error={errors.emergencyContactName} />
                            <Input type="tel" label="Emergency Phone" name="emergencyContactNumber" value={formData.emergencyContactNumber || ''} onChange={handleChange} placeholder="10-digit mobile" error={errors.emergencyContactNumber} />
                        </FormSection>

                        <FormSection title="Body Metrics & Health" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input type="number" step="0.1" label="Height (cm)" name="height" value={formData.height || ''} onChange={handleChange} placeholder="e.g. 175" error={errors.height} />
                            <Input type="number" step="0.1" label="Weight (kg)" name="weight" value={formData.weight || ''} onChange={handleChange} placeholder="e.g. 70.5" error={errors.weight} />
                            <Input type="number" step="0.1" label="BMI (Auto)" name="bmi" value={formData.bmi || ''} onChange={handleChange} placeholder="Auto-calculated" readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
                            <Input type="number" step="0.1" label="Body Fat (%)" name="bodyFat" value={formData.bodyFat || ''} onChange={handleChange} placeholder="e.g. 15" error={errors.bodyFat} />
                            <Select label="Diet Preference" name="dietPreference" value={formData.dietPreference || ''} onChange={handleChange} error={errors.dietPreference} options={['', 'Veg', 'Non-Veg', 'Vegan', 'Eggitarian', 'Any']} />
                            <Input containerClassName="sm:col-span-3" label="Medical Conditions / Injuries" name="medicalConditions" value={formData.medicalConditions || ''} onChange={handleChange} placeholder="Any prior injuries or health conditions to be aware of" error={errors.medicalConditions} />
                        </FormSection>

                        <FormSection title="Membership & Feedback" icon={<FiMessageSquare />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input type="date" label="Joining Date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleChange} required error={errors.joiningDate} />
                            <Select label="Status" name="status" value={formData.status || ''} onChange={handleChange} required error={errors.status} options={['Active', 'Inactive']} />
                            <Textarea containerClassName="sm:col-span-2 lg:col-span-3 xl:col-span-4" label="Response / Feedback" name="response" value={formData.response || ''} onChange={handleChange} className="h-[104px]" placeholder="Enter discussion notes or client requirements..." error={errors.response} />
                        </FormSection>

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/members')} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting} className="w-full sm:w-auto px-8">
                                {isEdit ? 'Update Member' : 'Register Member'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
