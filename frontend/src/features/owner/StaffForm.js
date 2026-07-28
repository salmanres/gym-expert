import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Button from '../../components/form/Button';
import Loader from '../../components/page/Loader';
import { FiUser, FiLock, FiMapPin, FiBriefcase, FiClock, FiTrash2, FiUpload, FiCamera, FiX } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
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
        joiningDate: new Date().toISOString().split('T')[0], specialization: '', experienceYears: '', salary: '', 
        shiftStart: '', shiftEnd: '', status: 'Active', profilePhoto: ''
    });

    useEffect(() => {
        if (isEdit && location.state?.staff) {
            const staff = location.state.staff;
            setFormData({
                name: staff.name || '',
                email: staff.email || '',
                phone: staff.phone || '',
                role: staff.role || 'TRAINER',
                password: '',
                gender: staff.gender || 'Male',
                dob: staff.dob ? new Date(staff.dob).toISOString().split('T')[0] : '',
                address: staff.address || '',
                emergencyContactName: staff.emergencyContactName || '',
                emergencyContactNumber: staff.emergencyContactNumber || '',
                joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split('T')[0] : '',
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-24 h-24 shrink-0 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 overflow-hidden relative group">
                            {formData.profilePhoto ? (
                                <>
                                    <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all" onClick={() => setFormData(prev => ({ ...prev, profilePhoto: '' }))}>
                                        <FiTrash2 className="text-white" size={20} />
                                    </div>
                                </>
                            ) : (
                                <FiUser size={32} />
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
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm">
                                    <FiUpload /> Upload Image
                                </button>
                                <button type="button" onClick={() => setIsCapturing(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-colors border border-emerald-100 shadow-sm">
                                    <FiCamera /> Take Photo
                                </button>
                            </div>
                        </div>
                    </div>

                    {isCapturing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                            <div className="bg-white p-4 rounded-xl shadow-xl w-full max-w-md relative flex flex-col items-center">
                                <button type="button" onClick={() => setIsCapturing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 z-10 bg-white rounded-full p-1 shadow-sm">
                                    <FiX size={20} />
                                </button>
                                <h3 className="text-sm font-bold text-slate-800 mb-4 self-start">Capture Photo</h3>
                                <div className="w-full rounded-lg overflow-hidden border-2 border-slate-200 bg-black aspect-square flex items-center justify-center">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{ width: 400, height: 400, facingMode: "user" }}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <Button type="button" onClick={capturePhoto} className="mt-4 w-full flex justify-center items-center gap-2">
                                    <FiCamera /> Capture Image
                                </Button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
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

                        <FormSection title="Shift & Status" icon={<FiClock />} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input type="time" label="Shift Start Time" name="shiftStart" value={formData.shiftStart || ''} onChange={handleChange} />
                            <Input type="time" label="Shift End Time" name="shiftEnd" value={formData.shiftEnd || ''} onChange={handleChange} />
                            <Select label="Status" name="status" value={formData.status || ''} onChange={handleChange} options={['Active', 'Inactive']} />
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

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/owner/staff')} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" loading={submitting} className="w-full sm:w-auto px-8">
                                {isEdit ? 'Update Staff' : 'Add Staff'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
