import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiPhone, FiMail, FiCalendar, FiAward, FiBriefcase, FiEdit2, FiUsers, FiMapPin, FiClock } from 'react-icons/fi';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import apiClient from '../../api/apiClient';

export default function StaffProfilePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const staff = location.state?.staff;
    const [referredMembers, setReferredMembers] = useState([]);

    useEffect(() => {
        if (staff?._id) {
            apiClient.get('/members')
                .then(res => {
                    const referred = res.data.filter(m => m.referredByStaff?._id === staff._id || m.referredByStaff === staff._id);
                    setReferredMembers(referred);
                })
                .catch(err => console.error("Failed to fetch referred members", err));
        }
    }, [staff]);

    if (!staff) {
        return (
            <PageLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-slate-500 mb-4">Staff data not found.</p>
                    <button onClick={() => navigate('/dashboard/owner/staff')} className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold">Go Back</button>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <PageHeader 
                title="Staff Profile" 
                subtitle={`View details for ${staff.name}`}
                showBack={true}
                onBack={() => navigate('/dashboard/owner/staff')}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    
                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 shrink-0 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 overflow-hidden">
                                {staff.profilePhoto ? (
                                    <img src={staff.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <FiUser size={32} />
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {staff.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${staff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                        {staff.status || 'Active'}
                                    </span>
                                    {staff.role && (
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {staff.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <button onClick={() => navigate(`/dashboard/owner/staff/edit/${staff._id}`, { state: { staff } })} className="px-6 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-slate-200 shadow-sm">
                            <FiEdit2 size={16} /> Edit Profile
                        </button>
                    </div>

                    <FormSection title="Personal Information" icon={<FiUser />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pointer-events-none">
                        <Input label="Full Name" value={staff.name || ''} readOnly />
                        <Input label="Gender" value={staff.gender || ''} readOnly />
                        <Input label="Date of Birth" value={staff.dob ? new Date(staff.dob).toLocaleDateString() : ''} readOnly />
                        <Input label="Phone Number" value={staff.phone || ''} readOnly />
                        <Input label="Email Address" value={staff.email || ''} readOnly />
                    </FormSection>

                    <FormSection title="Professional Details" icon={<FiBriefcase />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pointer-events-none mt-6">
                        <Input label="Role" value={staff.role || ''} readOnly />
                        <Input label="Specialization" value={staff.specialization || ''} readOnly />
                        <Input label="Experience (Years)" value={staff.experienceYears || ''} readOnly />
                        <Input label="Joining Date" value={staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : (staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : '')} readOnly />
                        <Input label="Salary / Pay" value={staff.salary ? `₹${staff.salary}` : ''} readOnly />
                    </FormSection>

                    <FormSection title="Address & Emergency" icon={<FiMapPin />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pointer-events-none mt-6">
                        <Input containerClassName="sm:col-span-2" label="Address" value={staff.address || ''} readOnly />
                        <Input label="Emergency Contact Name" value={staff.emergencyContactName || ''} readOnly />
                        <Input label="Emergency Contact Phone" value={staff.emergencyContactNumber || ''} readOnly />
                    </FormSection>

                    <FormSection title="Shift & Status" icon={<FiClock />} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pointer-events-none mt-6">
                        <Input label="Shift Start Time" value={staff.shiftStart || ''} readOnly />
                        <Input label="Shift End Time" value={staff.shiftEnd || ''} readOnly />
                        <Input label="Status" value={staff.status || ''} readOnly />
                    </FormSection>

                    <FormSection title="Wallet & Rewards" icon={<FiAward className="text-indigo-600" />} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pointer-events-none mt-6">
                        <Input label="Wallet Balance (Rewards)" value={staff.walletBalance ? `₹${staff.walletBalance}` : '₹0'} className="font-bold text-indigo-600" readOnly />
                        <Input label="Total Referrals" value={referredMembers.length.toString()} readOnly />
                    </FormSection>

                    {referredMembers.length > 0 && (
                        <FormSection title="Members Referred by this Staff" icon={<FiUsers className="text-emerald-600" />} className="mt-6 pointer-events-none">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {referredMembers.map(refM => (
                                    <div key={refM._id} className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                                            {refM.firstName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{refM.firstName} {refM.lastName || ''}</p>
                                            <p className="text-xs text-slate-500">{refM.contactNumber} • {refM.memberId}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FormSection>
                    )}

                </div>
            </div>
        </PageLayout>
    );
}
