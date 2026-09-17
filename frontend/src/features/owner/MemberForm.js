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
import { FiUser, FiMapPin, FiActivity, FiMessageSquare, FiCamera, FiUpload, FiX, FiTrash2, FiGift, FiAward, FiCheckCircle, FiCalendar, FiCreditCard, FiTag } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/dateUtils';
import Webcam from 'react-webcam';

export default function MemberForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isEdit = !!id;
    const isConversion = !!location.state?.convertedLead;
    
    const [loading, setLoading] = useState(isEdit && !location.state?.member);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [existingMembers, setExistingMembers] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [gymSettings, setGymSettings] = useState(null);
    const [customizeReward, setCustomizeReward] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', gender: 'Male', contactNumber: '', altContact: '', email: '',
        dob: '', bloodGroup: '', address: '', emergencyContactName: '', emergencyContactNumber: '',
        height: '', weight: '', bmi: '', bodyFat: '', dietPreference: '', medicalConditions: '',
        source: '--Select--', interest: '--Select--', followUpDate: '', followUpTime: '', convertibility: 'Warm',
        attendedBy: 'Admin', response: '',
        joiningDate: new Date().toISOString().split('T')[0], status: 'Active',
        referredBy: '',
        referredByStaff: '',
        referralRewardType: 'Both', // 'Bonus Days' | 'Wallet Cash' | 'Both'
        referralBonusDays: 7,
        referralWalletAmount: 200,
        enquiryId: '',
        membershipPlan: '',
        planStartDate: '',
        planEndDate: '',
        totalSessions: '',
        paymentStatus: 'Pending',
        amountPaid: '',
        profilePhoto: ''
    });

    const [memberships, setMemberships] = useState([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const fileInputRef = React.useRef(null);
    const webcamRef = React.useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePhoto: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const capturePhoto = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setFormData(prev => ({ ...prev, profilePhoto: imageSrc }));
        setIsCapturing(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansRes, membersRes, gymRes, staffRes] = await Promise.all([
                    apiClient.get('/membership-plans').catch(() => ({ data: [] })),
                    apiClient.get('/members').catch(() => ({ data: [] })),
                    apiClient.get('/gyms/my-gym').catch(() => ({ data: null })),
                    apiClient.get('/staff').catch(() => ({ data: [] }))
                ]);
                setMemberships((plansRes.data || []).filter(m => m.isActive));
                setExistingMembers(membersRes.data || []);
                setStaffMembers(staffRes.data || []);
                setGymSettings(gymRes.data);

                if (gymRes.data) {
                    setFormData(prev => ({
                        ...prev,
                        referralRewardType: gymRes.data.referralRewardType || 'Both',
                        referralBonusDays: gymRes.data.referrerBonusDays || 7,
                        referralWalletAmount: gymRes.data.referrerWalletAmount || 200
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch initial registration data", err);
            }
        };
        fetchData();
    }, []);

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
                referredBy: member.referredBy?._id || member.referredBy || '',
                referredByStaff: member.referredByStaff?._id || member.referredByStaff || '',
                followUpDate: member.followUpDate ? new Date(member.followUpDate).toISOString().split('T')[0] : ''
            });
            setLoading(false);
        } else if (isConversion) {
            const lead = location.state.convertedLead;
            const refStr = (lead.referredBy || '').toString().trim();

            const isStaffReferral = 
                refStr.includes('(Staff)') || 
                refStr.includes('(Trainer)') || 
                refStr.includes('(Admin)') ||
                staffMembers.some(s => s._id === refStr || (s.name && refStr.toLowerCase().includes(s.name.toLowerCase())));

            let matchedMemberId = '';
            let matchedStaffId = '';

            if (refStr) {
                if (isStaffReferral) {
                    const foundStaff = staffMembers.find(s => 
                        s._id === refStr || 
                        `${s.name || 'Staff'} (${s.role === 'STAFF' ? 'Staff' : s.role === 'TRAINER' ? 'Trainer' : (s.role || 'Staff')})` === refStr ||
                        (s.name && refStr.toLowerCase().includes(s.name.toLowerCase()))
                    );
                    matchedStaffId = foundStaff ? foundStaff._id : refStr;
                } else {
                    const foundMember = existingMembers.find(m => 
                        m._id === refStr || 
                        `${m.firstName || ''} ${m.lastName || ''}`.trim().toLowerCase() === refStr.toLowerCase()
                    );
                    matchedMemberId = foundMember ? foundMember._id : refStr;
                }
            }

            setFormData(prev => ({
                ...prev,
                firstName: lead.firstName || '',
                lastName: lead.lastName || '',
                gender: lead.gender || 'Male',
                dob: lead.dob ? new Date(lead.dob).toISOString().split('T')[0] : '',
                contactNumber: lead.contactNumber || '',
                altContact: lead.altContact || '',
                email: lead.email || '',
                address: lead.address || '',
                source: lead.source || '--Select--',
                referredBy: matchedMemberId,
                referredByStaff: matchedStaffId,
                interest: lead.inquiryFor || '--Select--',
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
    }, [isEdit, isConversion, location, navigate, staffMembers, existingMembers]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        let updates = { [name]: value };

        if (name === 'referredBy' && value) {
            updates.referredByStaff = '';
        } else if (name === 'referredByStaff' && value) {
            updates.referredBy = '';
        }
        
        // Auto calculate end date and pre-fill details when a plan is selected or start date changes
        if (name === 'membershipPlan' || name === 'planStartDate') {
            const planId = name === 'membershipPlan' ? value : formData.membershipPlan;
            const startDateStr = name === 'planStartDate' ? value : formData.planStartDate;
            
            if (planId && startDateStr) {
                const selectedPlan = memberships.find(m => m._id === planId);
                if (selectedPlan) {
                    const start = new Date(startDateStr);
                    let end = new Date(start);
                    
                    if (selectedPlan.durationUnit === 'Days') end.setDate(end.getDate() + selectedPlan.duration);
                    else if (selectedPlan.durationUnit === 'Weeks') end.setDate(end.getDate() + selectedPlan.duration * 7);
                    else if (selectedPlan.durationUnit === 'Months') end.setMonth(end.getMonth() + selectedPlan.duration);
                    else if (selectedPlan.durationUnit === 'Years') end.setFullYear(end.getFullYear() + selectedPlan.duration);
                    
                    updates.planEndDate = end.toISOString().split('T')[0];
                    if (name === 'membershipPlan') {
                        updates.totalSessions = selectedPlan.sessions || '';
                        updates.amountPaid = selectedPlan.price || '';
                    }
                }
            }
        }

        if (['contactNumber', 'altContact', 'emergencyContactNumber'].includes(name)) {
            updates[name] = value.replace(/\D/g, '').slice(0, 10);
        }
        
        setFormData(prev => ({ ...prev, ...updates }));
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
                navigate('/dashboard/owner/members');
            } else {
                const res = await apiClient.post('/members', formData);
                if (formData.referredBy || formData.referredByStaff) {
                    toast.success("Member registered & Referral Rewards (Wallet/Bonus) credited to Referrer!");
                } else {
                    toast.success("Member registered successfully");
                }
                // Navigate seamlessly to Assign Plan step
                navigate('/dashboard/owner/membership/assign', { state: { member: res.data } });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || (isEdit ? "Failed to update member" : "Failed to register member");
            toast.error(errorMsg);
            setSubmitting(false);
        }
    };

    if (loading) return <Loader text="Loading member details..." />;

    // Selected Referrer Member details
    const selectedReferrer = existingMembers.find(m => m._id === formData.referredBy);
    const rewardType = formData.referralRewardType || 'Both';
    const bonusDays = formData.referralBonusDays || 7;
    const walletAmt = formData.referralWalletAmount || 200;

    let rewardSummaryText = '';
    if (rewardType === 'Bonus Days') {
        rewardSummaryText = `+${bonusDays} Bonus Days`;
    } else if (rewardType === 'Wallet Cash') {
        rewardSummaryText = `₹${walletAmt} Wallet Cash`;
    } else {
        rewardSummaryText = `+${bonusDays} Bonus Days & ₹${walletAmt} Wallet Cash`;
    }

    return (
        <PageLayout>
            <PageHeader 
                title={isEdit ? "Edit Member" : "New Member Registration"}
                subtitle={isEdit ? "Update member details" : "Register a new member to the gym"}
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 bg-[#FAEEEF]">
                <div className="w-full max-w-7xl mx-auto">
                    {/* Read-Only Active Membership Info for Context */}
                    {isEdit && location.state?.member?.activeMembership && (
                        <div className="mb-6 p-5 bg-white rounded-2xl border border-rose-200/70 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xs font-bold text-[#CA0410] uppercase tracking-wider mb-1">Active Membership</h3>
                                <p className="text-base font-bold text-slate-800">{location.state.member.activeMembership.membershipPlanId?.name || 'Unknown Plan'}</p>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                    Valid till: <span className="font-bold text-slate-800">{formatDate(location.state.member.activeMembership.endDate)}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Status</h3>
                                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-2xs ${location.state.member.activeMembership.paymentStatus === 'Paid' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {location.state.member.activeMembership.paymentStatus}
                                </span>
                                {location.state.member.activeMembership.remainingBalance > 0 && (
                                    <p className="text-xs font-bold text-[#CA0410] mt-1.5">Due: ₹{location.state.member.activeMembership.remainingBalance}</p>
                                )}
                            </div>
                            <div className="w-full sm:w-auto">
                                <button 
                                    type="button" 
                                    onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member: location.state.member } })} 
                                    className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-[#CA0410] border border-rose-200 font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                                >
                                    Manage Plan & Payment
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Profile Photo Card */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6 p-6 bg-white rounded-2xl border border-rose-200/70 shadow-2xs">
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-rose-50/50 flex items-center justify-center border-2 border-dashed border-rose-200 text-slate-400 overflow-hidden relative group">
                            {formData.profilePhoto ? (
                                <>
                                    <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all" onClick={() => setFormData(prev => ({ ...prev, profilePhoto: '' }))}>
                                        <FiTrash2 className="text-white" size={20} />
                                    </div>
                                </>
                            ) : (
                                <FiUser className="text-[#CA0410]" size={32} />
                            )}
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 leading-none">Profile Photo</h3>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-1 mb-3">Upload a clear member photo or capture one using your webcam.</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleFileUpload} 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="flex items-center gap-2 px-3.5 py-1.5 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-2xs cursor-pointer active:scale-95"
                                >
                                    <FiUpload /> Upload Image
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsCapturing(true)} 
                                    className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 text-[#CA0410] hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-200 shadow-2xs cursor-pointer active:scale-95"
                                >
                                    <FiCamera /> Take Photo
                                </button>
                            </div>
                        </div>
                    </div>

                    {isCapturing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
                            <div className="bg-white p-5 rounded-2xl shadow-xl w-full max-w-md relative flex flex-col items-center border border-rose-200">
                                <button type="button" onClick={() => setIsCapturing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 z-10 bg-slate-100 rounded-full p-1 shadow-sm cursor-pointer">
                                    <FiX size={18} />
                                </button>
                                <h3 className="text-sm font-bold text-slate-800 mb-4 self-start">Capture Photo</h3>
                                <div className="w-full rounded-xl overflow-hidden border-2 border-rose-200 bg-black aspect-square flex items-center justify-center">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{ width: 400, height: 400, facingMode: "user" }}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={capturePhoto} 
                                    className="mt-4 w-full py-2.5 bg-[#CA0410] hover:bg-[#a8030d] text-white font-bold text-xs rounded-xl shadow-2xs flex justify-center items-center gap-2 transition-all cursor-pointer active:scale-95"
                                >
                                    <FiCamera /> Capture Image
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
                        <FormSection title="Personal Information" icon={<FiUser />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} required placeholder="First Name" error={errors.firstName} />
                            <Input label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} placeholder="Last Name" error={errors.lastName} />
                            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} required error={errors.gender} options={['Male', 'Female', 'Other']} />
                            <Input type="date" label="Date of Birth" name="dob" value={formData.dob || ''} onChange={handleChange} error={errors.dob} />
                            <Input type="date" label="Joining Date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleChange} required error={errors.joiningDate} />
                            <Input type="tel" label="Phone Number" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required placeholder="10-digit mobile" error={errors.contactNumber} maxLength={10} />
                            <Input type="tel" label="Alt. Phone" name="altContact" value={formData.altContact || ''} onChange={handleChange} placeholder="Secondary Phone" error={errors.altContact} maxLength={10} />
                            <Input type="email" label="Email Address" name="email" value={formData.email || ''} onChange={handleChange} placeholder="email@example.com" error={errors.email} />
                            <Select label="Blood Group" name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleChange} error={errors.bloodGroup} options={['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
                        </FormSection>

                        {/* Dedicated Referral Section */}
                        <FormSection title="Referral Source" icon={<FiGift />} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col justify-end">
                                <Select
                                    label="Referred By Existing Member (Optional)"
                                    name="referredBy"
                                    value={formData.referredBy || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: '', label: '-- Direct Registration / No Member Referral --' },
                                        ...existingMembers.map(m => {
                                            const name = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Gym Member';
                                            const code = m.memberId || 'MEM';
                                            const phone = m.contactNumber || m.phone || '';
                                            return {
                                                value: m._id,
                                                label: `${code} - ${name} ${phone ? `(${phone})` : ''}`
                                            };
                                        })
                                    ]}
                                />
                            </div>
                            <div className="flex flex-col justify-end">
                                <Select
                                    label="Referred By Staff/Agent (Optional)"
                                    name="referredByStaff"
                                    value={formData.referredByStaff || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: '', label: '-- Direct Registration / No Staff Referral --' },
                                        ...staffMembers.map(s => {
                                            const name = s.name || 'Staff Member';
                                            const role = s.role === 'STAFF' ? 'Staff' : s.role === 'TRAINER' ? 'Trainer' : s.role;
                                            return {
                                                value: s._id,
                                                label: `${name} (${role})`
                                            };
                                        })
                                    ]}
                                />
                            </div>
                        </FormSection>

                        <FormSection title="Address & Emergency" icon={<FiMapPin />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input containerClassName="sm:col-span-2" label="Residential Address" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Full address" error={errors.address} />
                            <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} placeholder="Relative Name" error={errors.emergencyContactName} />
                            <Input type="tel" label="Emergency Phone" name="emergencyContactNumber" value={formData.emergencyContactNumber || ''} onChange={handleChange} placeholder="10-digit mobile" error={errors.emergencyContactNumber} maxLength={10} />
                        </FormSection>

                        <FormSection title="Body Metrics & Health" icon={<FiActivity />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input type="number" step="0.1" label="Height (cm)" name="height" value={formData.height || ''} onChange={handleChange} placeholder="e.g. 175" error={errors.height} />
                            <Input type="number" step="0.1" label="Weight (kg)" name="weight" value={formData.weight || ''} onChange={handleChange} placeholder="e.g. 70.5" error={errors.weight} />
                            <Input type="number" step="0.1" label="BMI (Auto)" name="bmi" value={formData.bmi || ''} onChange={handleChange} placeholder="Auto-calculated" readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
                            <Input type="number" step="0.1" label="Body Fat (%)" name="bodyFat" value={formData.bodyFat || ''} onChange={handleChange} placeholder="e.g. 15" error={errors.bodyFat} />
                            <Select label="Diet Preference" name="dietPreference" value={formData.dietPreference || ''} onChange={handleChange} error={errors.dietPreference} options={['', 'Veg', 'Non-Veg', 'Vegan', 'Eggitarian', 'Any']} />
                            <Input containerClassName="sm:col-span-3" label="Medical Conditions / Injuries" name="medicalConditions" value={formData.medicalConditions || ''} onChange={handleChange} placeholder="Any prior injuries or health conditions to be aware of" error={errors.medicalConditions} />
                        </FormSection>

                        <FormSection title="Lead / Enquiry Details" icon={<FiMessageSquare />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Select label="Source" name="source" value={formData.source || ''} onChange={handleChange} options={['--Select--', 'Walk-in', 'Website', 'Reference', 'Just Dial', 'Other']} />
                            <Select label="Interest/For" name="interest" value={formData.interest || ''} onChange={handleChange} options={['--Select--', 'Gym', 'Zumba', 'Yoga', 'Crossfit']} />
                            <Select label="Convertibility" name="convertibility" value={formData.convertibility || ''} onChange={handleChange} options={['Warm', 'Hot', 'Cold']} />
                            <Input label="Attended By" name="attendedBy" value={formData.attendedBy || ''} onChange={handleChange} placeholder="Staff Name" />
                            <Textarea containerClassName="sm:col-span-2 lg:col-span-3 xl:col-span-4" label="Response / Feedback" name="response" value={formData.response || ''} onChange={handleChange} className="h-[104px]" placeholder="Enter discussion notes or client requirements..." error={errors.response} />
                        </FormSection>

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-4 pt-4 border-t border-rose-200/60">
                            <button 
                                type="button" 
                                onClick={() => navigate('/dashboard/owner/members')} 
                                className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full sm:w-auto px-8 py-2.5 bg-[#CA0410] hover:bg-[#a8030d] text-white font-bold text-xs rounded-xl transition-all shadow-2xs hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {submitting ? 'Saving Member...' : (isEdit ? 'Update Member' : 'Register Member')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
