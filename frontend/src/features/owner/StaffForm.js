import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Button from '../../components/form/Button';
import Loader from '../../components/page/Loader';
import { FiUser, FiLock, FiMapPin, FiBriefcase, FiClock, FiTrash2, FiUpload, FiCamera, FiX, FiCheckCircle, FiUserX } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
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

        if (isEdit && location.state?.staff) {
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
                joiningDate: toInputDateFormat(staff.joiningDate),
                specialization: staff.specialization || '',
                experienceYears: staff.experienceYears || '',
                salary: staff.salary || '',
                shiftStart: staff.shiftStart || '',
                shiftEnd: staff.shiftEnd || '',
                status: staff.status || 'Active',
                profilePhoto: staff.profilePhoto || ''
            });
            setLoading(false);
        } else if (isEdit) {
            navigate('/dashboard/owner/staff');
        }
    }, [isEdit, location, navigate]);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors({ ...errors, [name]: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let newErrors = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!isEdit && !formData.password) newErrors.password = 'Password is required for new staff';
        
        if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
            newErrors.phone = 'Invalid 10-digit mobile number';
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
                toast.success("Staff updated successfully");
            } else {
                await apiClient.post('/staff', formData);
                toast.success("Staff member added successfully");
            }
            navigate('/dashboard/owner/staff');
        } catch (error) {
            toast.error(error.response?.data?.message || (isEdit ? "Failed to update staff" : "Failed to add staff"));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Loader text="Loading staff details..." />;

    return (
        <PageLayout>
            <PageHeader 
                title={isEdit ? "Edit Staff Member" : "Add New Staff"}
                subtitle={isEdit ? "Update staff information" : "Create a new login for a trainer or admin"}
                showBack={true}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-0 pb-6 bg-[#FAEEEF]">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-white rounded-2xl border border-rose-200/70 shadow-2xs">
                        <div className="w-24 h-24 shrink-0 rounded-full bg-rose-50/60 flex items-center justify-center border-2 border-dashed border-rose-200 text-rose-300 overflow-hidden relative group">
                            {formData.profilePhoto ? (
                                <>
                                    <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all" onClick={() => setFormData(prev => ({ ...prev, profilePhoto: '' }))}>
                                        <FiTrash2 className="text-white" size={20} />
                                    </div>
                                </>
                            ) : (
                                <FiUser size={32} className="text-rose-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Profile Photo</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-3">Upload a clear photo or take one using your camera.</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleFileUpload} 
                                />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200 shadow-2xs cursor-pointer">
                                    <FiUpload /> Upload Image
                                </button>
                                <button type="button" onClick={() => setIsCapturing(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-[#CA0410] hover:bg-[#CA0410] hover:text-white rounded-xl text-xs font-bold transition-colors border border-rose-200 shadow-2xs cursor-pointer">
                                    <FiCamera /> Take Photo
                                </button>
                            </div>
                        </div>
                    </div>

                    {isCapturing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md relative flex flex-col items-center border border-rose-100">
                                <button type="button" onClick={() => setIsCapturing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 z-10 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors cursor-pointer">
                                    <FiX size={18} />
                                </button>
                                <h3 className="text-sm font-bold text-slate-800 mb-4 self-start">Capture Photo</h3>
                                <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-black aspect-square flex items-center justify-center">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{ width: 400, height: 400, facingMode: "user" }}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <Button type="button" onClick={capturePhoto} className="mt-4 w-full flex justify-center items-center gap-2 bg-[#CA0410] hover:bg-[#a8030d] text-white">
                                    <FiCamera /> Capture Image
                                </Button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                        <FormSection title="Personal Information" icon={<FiUser />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input label="Full Name" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Name" error={errors.name} />
                            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} options={['Male', 'Female', 'Other']} />
                            <Input type="date" label="Date of Birth" name="dob" value={formData.dob || ''} onChange={handleChange} />
                            <Input type="email" label="Email Address" name="email" value={formData.email || ''} onChange={handleChange} required placeholder="email@example.com" error={errors.email} />
                            <Input type="tel" label="Phone Number" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="10-digit mobile" error={errors.phone} />
                        </FormSection>

                        <FormSection title="Professional Details" icon={<FiBriefcase />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Select label="Role" name="role" value={formData.role || ''} onChange={handleChange} required error={errors.role} options={['TRAINER', 'ADMIN', 'STAFF', 'BRANCH_MANAGER']} />
                            <Input label="Specialization" name="specialization" value={formData.specialization || ''} onChange={handleChange} placeholder="e.g. Crossfit, Yoga" />
                            <Input type="number" label="Experience (Years)" name="experienceYears" value={formData.experienceYears || ''} onChange={handleChange} placeholder="e.g. 5" />
                            <Input type="date" label="Joining Date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleChange} />
                            <Input type="number" label="Salary / Pay" name="salary" value={formData.salary || ''} onChange={handleChange} placeholder="e.g. 15000" />
                        </FormSection>

                        <FormSection title="Address & Emergency" icon={<FiMapPin />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input containerClassName="sm:col-span-3" label="Address" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Full residential address" />
                            <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} placeholder="Relative Name" />
                            <Input type="tel" label="Emergency Contact Phone" name="emergencyContactNumber" value={formData.emergencyContactNumber || ''} onChange={handleChange} placeholder="10-digit mobile" />
                        </FormSection>

                        <FormSection title="Shift & Account Status" icon={<FiClock />} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input type="time" label="Shift Start Time" name="shiftStart" value={formData.shiftStart || ''} onChange={handleChange} />
                            <Input type="time" label="Shift End Time" name="shiftEnd" value={formData.shiftEnd || ''} onChange={handleChange} />
                            
                            {/* Action Buttons for Status */}
                            <div className="sm:col-span-2 pt-1">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Staff Account Status</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Active Button */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'Active' }))}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                                            (formData.status || 'Active') === 'Active'
                                                ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                                            (formData.status || 'Active') === 'Active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            <FiCheckCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs">Active</p>
                                            <p className="text-[10px] text-slate-500">Full system & login access</p>
                                        </div>
                                    </button>

                                    {/* Suspended Button */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'Suspended' }))}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                                            formData.status === 'Suspended'
                                                ? 'border-rose-500 bg-rose-50/90 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                                            formData.status === 'Suspended' ? 'bg-[#CA0410] text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            <FiUserX size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs">Suspended</p>
                                            <p className="text-[10px] text-slate-500">Block login / Disciplinary</p>
                                        </div>
                                    </button>

                                    {/* Inactive Button */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'Inactive' }))}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                                            formData.status === 'Inactive'
                                                ? 'border-slate-500 bg-slate-100 text-slate-950 ring-2 ring-slate-400/20 shadow-xs'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                                            formData.status === 'Inactive' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            <FiClock size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs">Inactive</p>
                                            <p className="text-[10px] text-slate-500">Off-duty / Left job</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </FormSection>

                        <FormSection title="Account Credentials" icon={<FiLock />} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input 
                                type="text" 
                                label={isEdit ? "New Password (Optional)" : "Password"} 
                                name="password" 
                                value={formData.password || ''} 
                                onChange={handleChange} 
                                required={!isEdit}
                                placeholder={isEdit ? "Leave blank to keep current" : "Enter temporary password"} 
                                error={errors.password} 
                            />
                        </FormSection>

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 pt-2">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/staff')} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting} className="w-full sm:w-auto px-8 bg-[#CA0410] hover:bg-[#a8030d] text-white">
                                {isEdit ? 'Update Staff' : 'Add Staff'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
