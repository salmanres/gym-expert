import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
    FiUser, FiPhone, FiMail, FiCalendar, FiAward, FiBriefcase, 
    FiEdit2, FiUsers, FiMapPin, FiClock, FiTag, FiDollarSign, 
    FiCheckCircle, FiShield, FiTrendingUp, FiUserCheck, FiUserX
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import ConfirmModal from '../../components/modal/ConfirmModal';
import apiClient from '../../api/apiClient';
import { formatDate } from '../../utils/dateUtils';

export default function StaffProfilePage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isOwner = currentUser?.role === 'GYM_OWNER' || currentUser?.role === 'OWNER' || currentUser?.role === 'SUPER_ADMIN';

    const [fetchedStaff, setFetchedStaff] = useState(null);
    const [loadingStaff, setLoadingStaff] = useState(!location.state?.staff && !!id);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });

    const staff = fetchedStaff || location.state?.staff;
    const staffIdVal = staff?._id || id;

    const [referredMembers, setReferredMembers] = useState([]);
    const [trainerMemberships, setTrainerMemberships] = useState([]);
    const [salesMemberships, setSalesMemberships] = useState([]);

    useEffect(() => {
        if (!location.state?.staff && id) {
            setLoadingStaff(true);
            apiClient.get(`/staff/${id}`)
                .then(res => setFetchedStaff(res.data))
                .catch(err => console.error("Failed to fetch staff by ID", err))
                .finally(() => setLoadingStaff(false));
        }
    }, [id, location.state]);

    useEffect(() => {
        if (staffIdVal) {
            Promise.all([
                apiClient.get('/members').catch(() => ({ data: [] })),
                apiClient.get('/member-memberships/latest').catch(() => ({ data: [] }))
            ]).then(([memRes, memShipRes]) => {
                const referred = (memRes.data || []).filter(m => m.referredByStaff?._id === staffIdVal || m.referredByStaff === staffIdVal);
                setReferredMembers(referred);

                const allMemShips = memShipRes.data || [];
                const assigned = allMemShips.filter(m => (m.trainerId?._id || m.trainerId) === staffIdVal);
                const sales = allMemShips.filter(m => (m.salesPersonId?._id || m.salesPersonId) === staffIdVal);

                setTrainerMemberships(assigned);
                setSalesMemberships(sales);
            }).catch(err => console.error("Failed to fetch staff attribution data", err));
        }
    }, [staffIdVal]);

    const handleToggleStatus = () => {
        if (!isOwner) {
            toast.error("Only Gym Owner can change staff status.");
            return;
        }

        const isCurrentlySuspended = (staff?.status || 'Active') === 'Suspended';
        const targetStatus = isCurrentlySuspended ? 'Active' : 'Suspended';

        setConfirmModal({
            isOpen: true,
            title: isCurrentlySuspended ? 'Activate Staff Member' : 'Suspend Staff Member',
            message: isCurrentlySuspended
                ? `Are you sure you want to activate ${staff?.name || 'this staff member'}? Their system access and login will be restored.`
                : `Are you sure you want to suspend ${staff?.name || 'this staff member'}? They will be blocked from logging into the gym portal.`,
            isDestructive: !isCurrentlySuspended,
            onConfirm: async () => {
                try {
                    await apiClient.put(`/staff/${staffIdVal}`, { status: targetStatus });
                    toast.success(`Staff member ${isCurrentlySuspended ? 'activated' : 'suspended'} successfully`);
                    setFetchedStaff(prev => ({ ...(prev || staff), status: targetStatus }));
                } catch (error) {
                    toast.error(error.response?.data?.message || `Failed to update staff status`);
                }
            }
        });
    };

    if (loadingStaff) {
        return <Loader text="Loading staff profile..." />;
    }

    if (!staff) {
        return (
            <PageLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-slate-500 mb-4 font-medium">Staff data not found.</p>
                    <button 
                        onClick={() => navigate('/dashboard/owner/staff')} 
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all cursor-pointer"
                    >
                        Go Back
                    </button>
                </div>
            </PageLayout>
        );
    }

    const staffName = staff.name || 'Staff Member';
    const staffRole = staff.role || 'STAFF';
    const status = staff.status || 'Active';
    const joiningDate = staff.joiningDate || staff.createdAt;
    const profilePhoto = staff.profilePhoto;
    const specialization = staff.specialization || 'General Fitness';
    const shiftStart = staff.shiftStart;
    const shiftEnd = staff.shiftEnd;
    const walletBalance = staff.walletBalance || 0;
    const contactNumber = staff.phone || 'N/A';
    const email = staff.email || 'Not Provided';
    const gender = staff.gender || 'N/A';
    const dob = staff.dob;
    const address = staff.address;
    const emergencyContactName = staff.emergencyContactName;
    const emergencyContactNumber = staff.emergencyContactNumber;
    const experienceYears = staff.experienceYears;
    const salary = staff.salary;

    return (
        <PageLayout>
            <PageHeader 
                title="Staff & Profile" 
                subtitle="Manage and track your staff & trainer details"
                showBack={true}
                onBack={() => navigate('/dashboard/owner/staff')}
            />

            <div className="flex-1 overflow-y-auto p-5 bg-[#FAEEEF]">
                <div className="max-w-7xl mx-auto space-y-5">
                    
                    {/* RED HERO HEADER BANNER */}
                    <div 
                        className="rounded-2xl p-4 sm:p-5 shadow-sm text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#CA0410]/40 overflow-hidden relative"
                        style={{ background: 'linear-gradient(135deg, #2D090E 0%, #6E0A12 22%, #A2040E 52%, #CA0410 80%, #DB0E1B 100%)' }}
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            {/* Avatar Box */}
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/25 border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt={staffName} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <span className="text-white font-black text-2xl sm:text-3xl leading-none select-none">
                                        {staffName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            
                            {/* Staff Name & Status */}
                            <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                                        {staffName}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide leading-tight shadow-2xs ${
                                        status === 'Active' ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]' : 
                                        status === 'Suspended' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                        'bg-slate-100 text-slate-800 border border-slate-200'
                                    }`}>
                                        {status}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-white/20 text-white border border-white/30 leading-tight">
                                        {staffRole}
                                    </span>
                                </div>
                                
                                <p className="text-xs text-rose-100/90 font-medium flex items-center gap-1.5 leading-normal">
                                    <span>Specialization: {specialization}</span>
                                    <span>•</span>
                                    <span>Joined {formatDate(joiningDate, 'N/A')}</span>
                                </p>
                            </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-2.5 shrink-0 flex-wrap self-start sm:self-center">
                            {isOwner && (
                                <button 
                                    onClick={handleToggleStatus}
                                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer border ${
                                        status === 'Suspended'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                                            : 'bg-white/15 hover:bg-white/25 text-white border-white/30 backdrop-blur-xs'
                                    }`}
                                >
                                    {status === 'Suspended' ? (
                                        <>
                                            <FiUserCheck size={14} className="text-emerald-200" /> Activate Staff
                                        </>
                                    ) : (
                                        <>
                                            <FiUserX size={14} className="text-rose-200" /> Suspend Staff
                                        </>
                                    )}
                                </button>
                            )}
                            <button 
                                onClick={() => navigate(`/dashboard/owner/staff/edit/${staff._id || staffIdVal}`, { state: { staff } })}
                                className="px-4 py-2 bg-white hover:bg-rose-50 text-slate-900 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                                <FiEdit2 size={13} className="text-[#CA0410]" /> Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* KEY STATS HIGHLIGHT BAR */}
                    <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs overflow-hidden">
                        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-rose-100/80">
                            {/* 1. ROLE & SPEC */}
                            <div className="p-3.5 sm:p-4 px-5">
                                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">ROLE & SPEC</p>
                                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                    <FiBriefcase className="text-[#CA0410] text-sm shrink-0" />
                                    <p className="text-[13.5px] sm:text-[14px] font-black text-slate-900 truncate" title={`${staffRole} - ${specialization}`}>
                                        {staffRole} • {specialization}
                                    </p>
                                </div>
                            </div>

                            {/* 2. INDIVIDUAL SALES */}
                            <div className="p-3.5 sm:p-4 px-5">
                                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">INDIVIDUAL SALES</p>
                                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                    <FiTrendingUp className="text-emerald-600 text-sm shrink-0" />
                                    <p className="text-[13.5px] sm:text-[14px] font-black text-emerald-600 truncate">
                                        {salesMemberships.length} Sales (₹{salesMemberships.reduce((sum, m) => sum + (Number(m.paidAmount) || Number(m.finalPrice) || 0), 0).toLocaleString()})
                                    </p>
                                </div>
                            </div>

                            {/* 3. ASSIGNED TRAINEES */}
                            <div className="p-3.5 sm:p-4 px-5">
                                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">ASSIGNED CLIENTS</p>
                                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                    <FiUsers className="text-indigo-600 text-sm shrink-0" />
                                    <p className="text-[13.5px] sm:text-[14px] font-black text-indigo-600 truncate">
                                        {trainerMemberships.length} Active Clients
                                    </p>
                                </div>
                            </div>

                            {/* 4. WALLET REWARDS */}
                            <div className="p-3.5 sm:p-4 px-5">
                                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">WALLET REWARDS</p>
                                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                    <FiTag className="text-amber-600 text-sm shrink-0" />
                                    <p className="text-[13.5px] sm:text-[14px] font-black text-emerald-600">
                                        ₹{walletBalance}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GRID DASHBOARD */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        {/* LEFT COLUMN: Personal Info & Address */}
                        <div className="space-y-5">
                            
                            {/* Personal Info Card */}
                            <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-rose-100/80">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#CA0410] border border-rose-200/60 flex items-center justify-center font-bold">
                                        <FiUser size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">Personal Information</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Contact & identity details</p>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                             <FiPhone className="text-indigo-500" /> Phone
                                        </span>
                                        <span className="text-xs font-black text-slate-800">{contactNumber}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                            <FiMail className="text-indigo-500" /> Email
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{email}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Gender</p>
                                            <p className="text-xs font-black text-slate-800 mt-0.5">{gender}</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Date of Birth</p>
                                            <p className="text-xs font-black text-slate-800 mt-0.5">
                                                {formatDate(dob, 'N/A')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address & Emergency Info Card */}
                            <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-rose-100/80">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center font-bold">
                                        <FiMapPin size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">Address & Emergency</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Location & contact safety</p>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Residential Address</p>
                                        <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                                            {address || 'Address not registered.'}
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Emergency Contact</p>
                                        <p className="text-xs font-black text-slate-800 mt-0.5">
                                            {emergencyContactName || 'N/A'}
                                        </p>
                                        {emergencyContactNumber && (
                                            <p className="text-xs font-bold text-rose-700 mt-0.5 flex items-center gap-1.5">
                                                <FiPhone size={12} /> {emergencyContactNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Professional Details, Individual Sales, Assigned Trainees, Referrals */}
                        <div className="lg:col-span-2 space-y-5">
                            
                            {/* Professional Details Card */}
                            <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-rose-100/80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold">
                                            <FiBriefcase size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-sm">Professional & Employment Details</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">Role, compensation and shift schedules</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Designation</p>
                                        <p className="text-sm font-black text-slate-800 mt-0.5">{staffRole}</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Shift Hours</p>
                                        <p className="text-sm font-black text-emerald-600 mt-0.5">{shiftStart && shiftEnd ? `${shiftStart} - ${shiftEnd}` : 'General Shift'}</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Experience</p>
                                        <p className="text-sm font-black text-slate-800 mt-0.5">{experienceYears ? `${experienceYears} Years` : 'N/A'}</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Salary / Compensation</p>
                                        <p className="text-sm font-black text-emerald-600 mt-0.5">{salary ? `₹${Number(salary).toLocaleString()}` : 'On Payroll'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sales Conversions & Individual Attributions (ALWAYS VISIBLE) */}
                            <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-rose-100/80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold">
                                            <FiTrendingUp size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-sm">Individual Sales Conversions & Attributions</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">Subscriptions & plans sold or closed by this staff member</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                                            {salesMemberships.length} Sales Closed
                                        </span>
                                        {salesMemberships.length > 0 && (
                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black">
                                                ₹{salesMemberships.reduce((sum, m) => sum + (Number(m.paidAmount) || Number(m.finalPrice) || 0), 0).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {salesMemberships.length === 0 ? (
                                    <div className="p-6 text-center bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
                                        <FiTrendingUp className="mx-auto text-slate-300 text-2xl mb-1.5" />
                                        <p className="text-xs font-bold text-slate-600">No individual sales recorded yet</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            When assigning a membership, selecting this staff under <span className="font-bold text-slate-600">"Sales Person"</span> will attribute the revenue and sale here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {salesMemberships.map(m => {
                                            const mem = m.memberId || {};
                                            return (
                                                <div 
                                                    key={m._id} 
                                                    onClick={() => mem._id && navigate(`/dashboard/owner/members/view/${mem._id}`, { state: { member: mem } })}
                                                    className="p-3.5 bg-emerald-50/30 hover:bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between transition-all cursor-pointer group"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-slate-900 text-xs truncate group-hover:text-emerald-700 transition-colors">
                                                                {mem.firstName} {mem.lastName || ''}
                                                            </p>
                                                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded">
                                                                {m.membershipStatus || 'Active'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                                            {m.membershipPlanId?.name || m.planName || 'Membership'}
                                                        </p>
                                                        {m.reference && (
                                                            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                                                Ref: {m.reference}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="font-black text-emerald-600 text-sm block">
                                                            ₹{Number(m.paidAmount || m.finalPrice || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[9.5px] text-slate-400 font-medium">
                                                            {formatDate(m.startDate || m.createdAt, '')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Assigned Trainees / Clients List */}
                            <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-rose-100/80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center font-bold">
                                            <FiUsers size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-sm">Assigned Trainees & Members</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">Members assigned for workout guidance or PT sessions</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
                                        {trainerMemberships.length} Clients
                                    </span>
                                </div>

                                {trainerMemberships.length === 0 ? (
                                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium">No trainees currently assigned to this staff member.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {trainerMemberships.map(m => {
                                            const mem = m.memberId || {};
                                            return (
                                                <div 
                                                    key={m._id} 
                                                    onClick={() => mem._id && navigate(`/dashboard/owner/members/view/${mem._id}`, { state: { member: mem } })}
                                                    className="p-3.5 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-center justify-between transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                                                            {(mem.firstName || 'M').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                                                {mem.firstName} {mem.lastName || ''}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                                                {m.membershipPlanId?.name || m.planName || 'Active Plan'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {m.isPTConversion && (
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9.5px] font-extrabold rounded-md border border-amber-300 shrink-0">
                                                            PT
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Referred Members List */}
                            {referredMembers.length > 0 && (
                                <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-rose-100/80">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center font-bold">
                                                <FiAward size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-slate-800 text-sm">Direct Member Referrals</h3>
                                                <p className="text-[11px] text-slate-400 font-medium">Members registered via this staff referral</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200/60">
                                            {referredMembers.length} Referred
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {referredMembers.map(refM => (
                                            <div 
                                                key={refM._id} 
                                                onClick={() => navigate(`/dashboard/owner/members/view/${refM._id}`, { state: { member: refM } })}
                                                className="p-3 bg-purple-50/40 hover:bg-purple-50/80 rounded-xl border border-purple-100 flex items-center gap-3 transition-all cursor-pointer group"
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                                                    {(refM.firstName || 'M').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 text-xs truncate group-hover:text-purple-600 transition-colors">
                                                        {refM.firstName} {refM.lastName || ''}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 truncate">{refM.contactNumber || 'N/A'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                    </div>

                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                confirmText={confirmModal.isDestructive ? 'Yes, Suspend' : 'Yes, Activate'}
                cancelText="Cancel"
            />
        </PageLayout>
    );
}
