import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Loader from '../../components/page/Loader';
import Button from '../../components/form/Button';
import { FiUser, FiLock, FiMapPin, FiBriefcase, FiClock, FiTrash2, FiUpload, FiCamera, FiX } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from '../../utils/toast';
import { toInputDateFormat, getTodayInputDate } from '../../utils/dateUtils';
import Webcam from 'react-webcam';

export default function StaffForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isEdit = !!id;
    const [loading, setLoading] = useState(isEdit && !location.state?.staff);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [isCapturing, setIsCapturing] = useState(false);
    const fileInputRef = React.useRef(null);
    const webcamRef = React.useRef(null);
    
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', role: 'TRAINER', password: '',
        gender: 'Male', dob: '', address: '', emergencyContactName: '', emergencyContactNumber: '',
        joiningDate: getTodayInputDate(), specialization: '', experienceYears: '', salary: '', 
        shiftStart: '', shiftEnd: '', status: 'Active', profilePhoto: ''
    });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        if (currentUser?.role !== 'GYM_OWNER') {
            toast.error("Only Gym Owner can add or edit staff members.");
            navigate('/dashboard/owner/staff');
            return;
        }

        const loadStaffData = async () => {
            if (isEdit) {
                if (location.state?.staff) {
                    const staff = location.state.staff;
                    setFormData({
                        name: staff.name || '',
                        email: staff.email || '',
                        phone: staff.phone || '',
                        role: staff.role || 'TRAINER',
                        password: '',
                        gender: staff.gender || 'Male',
                        dob: toInputDateFormat(staff.dob),
                        address: staff.address || '',
                        emergencyContactName: staff.emergencyContactName || '',
                        emergencyContactNumber: staff.emergencyContactNumber || '',
                        joiningDate: toInputDateFormat(staff.joiningDate) || getTodayInputDate(),
                        specialization: staff.specialization || '',
                        experienceYears: staff.experienceYears || '',
                        salary: staff.salary || '',
                        shiftStart: staff.shiftStart || '',
                        shiftEnd: staff.shiftEnd || '',
                        status: staff.status || 'Active',
                        profilePhoto: staff.profilePhoto || ''
                    });
                    setLoading(false);
                } else {
                    try {
                        const res = await apiClient.get('/staff');
                        const found = (res.data || []).find(s => s._id === id);
                        if (found) {
                            setFormData({
                                name: found.name || '',
                                email: found.email || '',
                                phone: found.phone || '',
                                role: found.role || 'TRAINER',
                                password: '',
                                gender: found.gender || 'Male',
                                dob: toInputDateFormat(found.dob),
                                address: found.address || '',
                                emergencyContactName: found.emergencyContactName || '',
                                emergencyContactNumber: found.emergencyContactNumber || '',
                                joiningDate: toInputDateFormat(found.joiningDate) || getTodayInputDate(),
                                specialization: found.specialization || '',
                                experienceYears: found.experienceYears || '',
                                salary: found.salary || '',
                                shiftStart: found.shiftStart || '',
                                shiftEnd: found.shiftEnd || '',
                                status: found.status || 'Active',
                                profilePhoto: found.profilePhoto || ''
                            });
                        } else {
                            toast.error("Staff member not found");
                            navigate('/dashboard/owner/staff');
                        }
                    } catch (error) {
                        toast.error("Failed to load staff details");
                        navigate('/dashboard/owner/staff');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        };

        loadStaffData();
    }, [id, isEdit, location, navigate]);

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
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setFormData(prev => ({ ...prev, profilePhoto: imageSrc }));
        }
        setIsCapturing(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors({ ...errors, [name]: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let newErrors = {};
        if (!formData.name?.trim()) newErrors.name = 'Full name is required';
        if (!formData.email?.trim()) newErrors.email = 'Email address is required';
        if (!formData.phone?.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
            newErrors.phone = 'Enter valid 10-digit mobile number';
        }

        if (!isEdit && !formData.password) {
            newErrors.password = 'Password is required for new staff account';
        }

        if (formData.emergencyContactNumber && !/^[6-9]\d{9}$/.test(formData.emergencyContactNumber)) {
            newErrors.emergencyContactNumber = 'Enter valid 10-digit mobile number';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fix the highlighted errors before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            if (isEdit) {
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;
                
                await apiClient.put(`/staff/${id}`, updateData);
                toast.success("Staff member updated successfully");
            } else {
                await apiClient.post('/staff', formData);
                toast.success("Staff member registered successfully");
            }
            navigate('/dashboard/owner/staff');
        } catch (error) {
            toast.error(error.response?.data?.message || (isEdit ? "Failed to update staff" : "Failed to register staff"));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Loader text="Loading staff details..." />;

    return (
        <PageLayout>
            <PageHeader 
                title={isEdit ? "Edit Staff Member" : "New Staff Registration"}
                subtitle={isEdit ? "Update staff member details" : "Register a new trainer, manager or admin to the gym"}
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 bg-[#FAEEEF]">
                <div className="w-full max-w-7xl mx-auto">
                    {/* Profile Photo Card */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6 p-6 bg-white rounded-2xl border border-rose-200/70 shadow-2xs">
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-rose-50/50 flex items-center justify-center border-2 border-dashed border-rose-200 text-slate-400 overflow-hidden relative group">
                            {formData.profilePhoto ? (
                                <>
                                    <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    <div 
                                        className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all" 
                                        onClick={() => setFormData(prev => ({ ...prev, profilePhoto: '' }))}
                                        title="Remove photo"
                                    >
                                        <FiTrash2 className="text-white" size={20} />
                                    </div>
                                </>
                            ) : (
                                <FiUser className="text-[#CA0410]" size={32} />
                            )}
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 leading-none">Profile Photo</h3>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-1 mb-3">Upload a clear staff photo or capture one using your webcam.</p>
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
                            <Input label="Full Name" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Full Name" error={errors.name} />
                            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} required options={['Male', 'Female', 'Other']} />
                            <Input type="dob" label="Date of Birth" name="dob" value={formData.dob || ''} onChange={handleChange} error={errors.dob} />
                            <Input type="date" label="Joining Date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleChange} required error={errors.joiningDate} />
                            <Input type="tel" label="Phone Number" name="phone" value={formData.phone || ''} onChange={handleChange} required placeholder="10-digit mobile" error={errors.phone} maxLength={10} />
                            <Input type="email" label="Email Address" name="email" value={formData.email || ''} onChange={handleChange} required placeholder="email@example.com" error={errors.email} />
                        </FormSection>

                        <FormSection title="Role & Employment Details" icon={<FiBriefcase />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Select 
                                label="Designation / Role" 
                                name="role" 
                                value={formData.role || ''} 
                                onChange={handleChange} 
                                required 
                                error={errors.role} 
                                options={[
                                    { value: 'TRAINER', label: 'Trainer / Fitness Coach' },
                                    { value: 'ADMIN', label: 'Admin / Operations' },
                                    { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
                                    { value: 'STAFF', label: 'Support Staff / Front Desk' }
                                ]} 
                            />
                            <Input label="Specialization" name="specialization" value={formData.specialization || ''} onChange={handleChange} placeholder="e.g. Crossfit, Yoga, Strength" error={errors.specialization} />
                            <Input type="number" step="0.5" label="Experience (Years)" name="experienceYears" value={formData.experienceYears || ''} onChange={handleChange} placeholder="e.g. 5" error={errors.experienceYears} />
                            <Input type="number" label="Monthly Salary (₹)" name="salary" value={formData.salary || ''} onChange={handleChange} placeholder="e.g. 25000" error={errors.salary} />
                        </FormSection>

                        <FormSection title="Shift & Working Hours" icon={<FiClock />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input type="time" label="Shift Start Time" name="shiftStart" value={formData.shiftStart || ''} onChange={handleChange} error={errors.shiftStart} />
                            <Input type="time" label="Shift End Time" name="shiftEnd" value={formData.shiftEnd || ''} onChange={handleChange} error={errors.shiftEnd} />
                        </FormSection>

                        <FormSection title="Address & Emergency Contact" icon={<FiMapPin />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input containerClassName="sm:col-span-2" label="Residential Address" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Full residential address" error={errors.address} />
                            <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} placeholder="Relative Name" error={errors.emergencyContactName} />
                            <Input type="tel" label="Emergency Phone" name="emergencyContactNumber" value={formData.emergencyContactNumber || ''} onChange={handleChange} placeholder="10-digit mobile" error={errors.emergencyContactNumber} maxLength={10} />
                        </FormSection>

                        <FormSection title="Account Status & Credentials" icon={<FiLock />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Select 
                                label="Account Status" 
                                name="status" 
                                value={formData.status || 'Active'} 
                                onChange={handleChange} 
                                options={[
                                    { value: 'Active', label: 'Active - Full Login Access' },
                                    { value: 'Suspended', label: 'Suspended - Block Login' },
                                    { value: 'Inactive', label: 'Inactive - Off Duty / Resigned' }
                                ]} 
                            />
                            <Input 
                                type="text" 
                                label={isEdit ? "New Password (Optional)" : "Account Password"} 
                                name="password" 
                                value={formData.password || ''} 
                                onChange={handleChange} 
                                required={!isEdit}
                                placeholder={isEdit ? "Leave blank to keep unchanged" : "Enter account password"} 
                                error={errors.password} 
                            />
                        </FormSection>

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-4 pt-4 border-t border-rose-200/60">
                            <Button 
                                onClick={() => navigate('/dashboard/owner/staff')} 
                                variant="secondary"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={submitting}
                                loading={submitting}
                            >
                                {isEdit ? 'Update Staff Member' : 'Register Staff Member'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
