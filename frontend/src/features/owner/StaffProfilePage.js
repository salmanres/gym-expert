import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiPhone, FiMail, FiCalendar, FiAward, FiBriefcase, FiEdit2, FiUsers, FiMapPin, FiClock } from 'react-icons/fi';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import apiClient from '../../api/apiClient';
import { formatDate } from '../../utils/dateUtils';

export default function StaffProfilePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const staff = location.state?.staff;
    const [referredMembers, setReferredMembers] = useState([]);

    const [trainerMemberships, setTrainerMemberships] = useState([]);
    const [salesMemberships, setSalesMemberships] = useState([]);

    useEffect(() => {
        if (staff?._id) {
            Promise.all([
                apiClient.get('/members').catch(() => ({ data: [] })),
                apiClient.get('/member-memberships/latest').catch(() => ({ data: [] }))
            ]).then(([memRes, memShipRes]) => {
                const referred = (memRes.data || []).filter(m => m.referredByStaff?._id === staff._id || m.referredByStaff === staff._id);
                setReferredMembers(referred);

                const allMemShips = memShipRes.data || [];
                const assigned = allMemShips.filter(m => (m.trainerId?._id || m.trainerId) === staff._id);
                const sales = allMemShips.filter(m => (m.salesPersonId?._id || m.salesPersonId) === staff._id);

                setTrainerMemberships(assigned);
                setSalesMemberships(sales);
            }).catch(err => console.error("Failed to fetch staff attribution data", err));
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

            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-4 bg-[#FAEEEF]">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 bg-white rounded-2xl border border-rose-200/70 shadow-2xs">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 shrink-0 rounded-full bg-rose-50/60 flex items-center justify-center border-2 border-dashed border-rose-200 text-rose-400 overflow-hidden">
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
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${staff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                        {staff.status || 'Active'}
                                    </span>
                                    {staff.role && (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-[#CA0410] border border-rose-200">
                                            {staff.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <button onClick={() => navigate(`/dashboard/owner/staff/edit/${staff._id}`, { state: { staff } })} className="px-5 py-2.5 bg-[#CA0410] text-white hover:bg-[#a8030d] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer">
                            <FiEdit2 size={15} /> Edit Profile
                        </button>
                    </div>

                    <FormSection title="Personal Information" icon={<FiUser />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pointer-events-none">
                        <Input label="Full Name" value={staff.name || ''} readOnly />
                        <Input label="Gender" value={staff.gender || ''} readOnly />
                        <Input label="Date of Birth" value={formatDate(staff.dob)} readOnly />
                        <Input label="Phone Number" value={staff.phone || ''} readOnly />
                        <Input label="Email Address" value={staff.email || ''} readOnly />
                    </FormSection>

                    <FormSection title="Professional Details" icon={<FiBriefcase />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pointer-events-none mt-6">
                        <Input label="Role" value={staff.role || ''} readOnly />
                        <Input label="Specialization" value={staff.specialization || ''} readOnly />
                        <Input label="Experience (Years)" value={staff.experienceYears || ''} readOnly />
                        <Input label="Joining Date" value={formatDate(staff.joiningDate || staff.createdAt)} readOnly />
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

                    <FormSection title="Wallet, Sales & Performance Overview" icon={<FiAward className="text-indigo-600" />} className="grid grid-cols-1 sm:grid-cols-4 gap-4 pointer-events-none mt-6">
                        <Input label="Wallet Balance (Rewards)" value={staff.walletBalance ? `₹${staff.walletBalance}` : '₹0'} className="font-bold text-indigo-600" readOnly />
                        <Input label="Assigned Trainees" value={trainerMemberships.length.toString()} readOnly />
                        <Input label="Individual Sales Count" value={salesMemberships.length.toString()} readOnly />
                        <Input label="PT Conversions" value={trainerMemberships.filter(m => m.isPTConversion).length.toString()} readOnly />
                    </FormSection>

                    {/* Assigned Members / Trainees List */}
                    {trainerMemberships.length > 0 && (
                        <FormSection title="Assigned Trainees & Members" icon={<FiUsers className="text-indigo-600" />} className="mt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {trainerMemberships.map(m => {
                                    const mem = m.memberId || {};
                                    return (
                                        <div key={m._id} className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                                                    {(mem.firstName || 'M').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{mem.firstName} {mem.lastName || ''}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{m.planName} • {mem.contactNumber || 'N/A'}</p>
                                                </div>
                                            </div>
                                            {m.isPTConversion && (
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full border border-amber-300">
                                                    PT
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </FormSection>
                    )}

                    {/* Sales Attribution List */}
                    {salesMemberships.length > 0 && (
                        <FormSection title="Individual Sales & Conversions" icon={<FiAward className="text-emerald-600" />} className="mt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {salesMemberships.map(m => {
                                    const mem = m.memberId || {};
                                    return (
                                        <div key={m._id} className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{mem.firstName} {mem.lastName || ''}</p>
                                                <p className="text-xs text-slate-500 font-medium">{m.planName} (₹{m.finalPrice || m.originalPrice})</p>
                                                {m.reference && <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Ref: {m.reference}</p>}
                                            </div>
                                            <span className="font-extrabold text-emerald-600 text-sm">
                                                ₹{m.paidAmount || 0}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </FormSection>
                    )}

                    {referredMembers.length > 0 && (
                        <FormSection title="Members Referred by this Staff" icon={<FiUsers className="text-emerald-600" />} className="mt-6">
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
