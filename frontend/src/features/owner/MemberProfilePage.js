import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
    FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiActivity, FiAward, 
    FiEdit2, FiUsers, FiCreditCard, FiClock, FiCheckCircle, FiXCircle, 
    FiShield, FiHeart, FiZap, FiPlusCircle, FiArrowLeft, FiTag, FiFileText, FiShare2
} from 'react-icons/fi';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils';

export default function MemberProfilePage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [fetchedMember, setFetchedMember] = useState(null);
    const [loadingMember, setLoadingMember] = useState(!location.state?.member && !!id);

    const rawMember = fetchedMember || location.state?.member;

    const member = rawMember?.memberId && typeof rawMember.memberId === 'object' 
        ? { ...rawMember.memberId, ...rawMember, memberIdObj: rawMember.memberId } 
        : rawMember;

    const [referredMembers, setReferredMembers] = useState([]);
    const [allMemberships, setAllMemberships] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [collectModal, setCollectModal] = useState({
        open: false,
        membership: null,
        amount: '',
        paymentMode: 'Cash',
        useWallet: false,
        walletUsed: 0,
        submitting: false
    });
    
    const memberIdVal = member?._id || rawMember?._id || id;

    useEffect(() => {
        if (!location.state?.member && id) {
            setLoadingMember(true);
            apiClient.get(`/members/${id}`)
                .then(res => {
                    setFetchedMember(res.data);
                })
                .catch(err => {
                    console.error("Failed to fetch member by ID", err);
                })
                .finally(() => {
                    setLoadingMember(false);
                });
        }
    }, [id, location.state]);

    const fetchMembershipData = () => {
        if (memberIdVal) {
            apiClient.get(`/member-memberships/member/${memberIdVal}`)
                .then(res => setAllMemberships(res.data || []))
                .catch(err => console.error("Failed to fetch membership history", err));
        }
    };

    useEffect(() => {
        if (memberIdVal) {
            apiClient.get('/members')
                .then(res => {
                    const referred = (res.data || []).filter(m => m.referredBy?._id === memberIdVal || m.referredBy === memberIdVal);
                    setReferredMembers(referred);
                })
                .catch(err => console.error("Failed to fetch referred members", err));
            
            fetchMembershipData();
            
            apiClient.get('/members/transactions/all')
                .then(res => {
                    const memberTxs = (res.data || []).filter(t => (t.memberId?._id || t.memberId) === memberIdVal);
                    setTransactions(memberTxs);
                })
                .catch(err => console.error("Failed to fetch transactions", err));
        }
    }, [memberIdVal]);

    const handleLogPTSession = async (membershipId) => {
        try {
            const res = await apiClient.post(`/member-memberships/${membershipId}/use-session`, { notes: 'PT Session completed with trainer' });
            toast.success(res.data.message || "PT Session logged successfully!");
            fetchMembershipData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to log PT session");
        }
    };

    const handleToggleFreeze = async (membershipId, currentStatus) => {
        const action = currentStatus === 'Frozen' ? 'Unfreeze' : 'Freeze';
        const reason = window.prompt(`Enter reason to ${action} membership:`, currentStatus === 'Frozen' ? 'Resuming workouts' : 'Medical leave / Travel');
        if (reason === null) return; // User cancelled

        try {
            const res = await apiClient.post(`/member-memberships/${membershipId}/freeze`, { reason });
            toast.success(res.data.message || `Membership ${action}d successfully!`);
            fetchMembershipData();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${action} membership`);
        }
    };

    const handleSubmitCollectFee = async (e) => {
        e.preventDefault();
        if (!collectModal.membership) return;
        const amt = Number(collectModal.amount) || 0;
        const wal = collectModal.useWallet ? (Number(collectModal.walletUsed) || 0) : 0;
        if (amt <= 0 && wal <= 0) {
            toast.error("Please enter a valid payment amount");
            return;
        }

        setCollectModal(prev => ({ ...prev, submitting: true }));
        try {
            const res = await apiClient.post(`/member-memberships/${collectModal.membership._id}/payment`, {
                amountPaid: amt,
                walletUsed: wal,
                paymentMode: collectModal.paymentMode,
                paymentDate: new Date()
            });
            toast.success(res.data?.message || "Payment recorded successfully!");
            setCollectModal({ open: false, membership: null, amount: '', paymentMode: 'Cash', useWallet: false, walletUsed: 0, submitting: false });
            fetchMembershipData();
            if (id) {
                apiClient.get(`/members/${id}`).then(r => setFetchedMember(r.data)).catch(console.error);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to record payment");
            setCollectModal(prev => ({ ...prev, submitting: false }));
        }
    };

    if (loadingMember) {
        return <Loader text="Loading member profile..." />;
    }

    if (!member) {
        return (
            <PageLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-slate-500 mb-4 font-medium">Member data not found.</p>
                    <button onClick={() => navigate('/dashboard/owner/members')} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all">
                        Go Back
                    </button>
                </div>
            </PageLayout>
        );
    }

    const firstName = member.firstName || member.memberName?.split(' ')[0] || member.name?.split(' ')[0] || 'Member';
    const lastName = member.lastName || (member.memberName ? member.memberName.split(' ').slice(1).join(' ') : '') || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const contactNumber = member.contactNumber || member.phone || member.mobile || 'N/A';
    const email = member.email || 'Not Provided';
    const customMemberId = member.memberIdObj?.memberId || member.memberId || 'MEM-001';
    const joiningDate = member.joiningDate || member.createdAt;
    const gender = member.gender || 'N/A';
    const bloodGroup = member.bloodGroup || 'N/A';
    const dob = member.dob;
    const profilePhoto = member.profilePhoto;
    const status = member.status || rawMember?.membershipStatus || 'Active';
    const walletBalance = member.walletBalance || 0;
    const address = member.address;
    const emergencyContactName = member.emergencyContactName;
    const emergencyContactNumber = member.emergencyContactNumber;

    const height = member.height;
    const weight = member.weight;
    const bmi = member.bmi;
    const bodyFat = member.bodyFat;
    const dietPreference = member.dietPreference;
    const medicalConditions = member.medicalConditions;

    const source = member.source || 'Direct / Walk-In';
    const attendedBy = member.attendedBy;

    const today = new Date();
    today.setHours(0,0,0,0);

    const activeMem = allMemberships.find(m => m.membershipStatus === 'Active' || (new Date(m.startDate) <= today && new Date(m.endDate) >= today));
    const scheduledMembership = allMemberships.find(m => m.membershipStatus === 'Scheduled' || new Date(m.startDate) > today);
    const activeMembership = activeMem || rawMember?.activeMembership || (rawMember?.membershipPlanId ? rawMember : null);

    const planEnd = activeMembership?.paidUntilDate ? new Date(activeMembership.paidUntilDate) : activeMembership?.endDate ? new Date(activeMembership.endDate) : (rawMember?.endDate ? new Date(rawMember.endDate) : null);
    const isPlanExpired = planEnd && planEnd < today;
    const daysLeft = planEnd ? Math.ceil((planEnd - today) / (1000 * 60 * 60 * 24)) : null;

    const planName = activeMembership?.membershipPlanId?.name || activeMembership?.planName || rawMember?.planName || 'No Plan';

    const referredByName = member.referredByStaff?.name 
        ? `${member.referredByStaff.name} (Staff)`
        : member.referredBy?.firstName 
            ? `${member.referredBy.firstName} ${member.referredBy.lastName || ''}`.trim()
            : (typeof member.referredBy === 'string' ? member.referredBy : null) || 'Direct Registration';

    return (
        <PageLayout>
            <PageHeader 
                title="Members & Profile" 
                subtitle={`Manage and track your member details`}
                showBack={true}
                onBack={() => navigate('/dashboard/owner/members')}
            />

            <div className="flex-1 overflow-y-auto p-5 bg-[#FAEEEF]">
                <div className="max-w-7xl mx-auto space-y-5">
                
                {/* FIGMA RED HERO HEADER BANNER */}
                <div 
                    className="rounded-2xl p-4 sm:p-5 shadow-sm text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#CA0410]/40 overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, #2D090E 0%, #6E0A12 22%, #A2040E 52%, #CA0410 80%, #DB0E1B 100%)' }}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/25 border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                            {profilePhoto ? (
                                <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <span className="text-white font-black text-2xl sm:text-3xl leading-none select-none">
                                    {firstName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        
                        {/* Member Name & Status */}
                        <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                                    {fullName}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide leading-tight shadow-2xs ${
                                    status === 'Active' ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]' : 
                                    status === 'Frozen' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                                    'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                    {status}
                                </span>
                            </div>
                            
                            <p className="text-xs text-rose-100/90 font-medium flex items-center gap-1.5 leading-normal">
                                <span>ID: {customMemberId}</span>
                                <span>•</span>
                                <span>Joined {formatDate(joiningDate, 'N/A')}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap self-start sm:self-center">
                        <button 
                            onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member, isRenew: true } })}
                            className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        >
                            <FiPlusCircle size={14} /> Assign / Renew Plan
                        </button>
                        <button 
                            onClick={() => navigate(`/dashboard/owner/members/edit/${member._id || memberIdVal}`, { state: { member } })}
                            className="px-4 py-2 bg-white hover:bg-rose-50 text-slate-900 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                            <FiEdit2 size={13} className="text-[#CA0410]" /> Edit Profile
                        </button>
                    </div>
                </div>

                {/* KEY STATS HIGHLIGHT BAR */}
                <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-rose-100/80">
                        {/* 1. ACTIVE PLAN */}
                        <div className="p-3.5 sm:p-4 px-5">
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE PLAN</p>
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <FiAward className="text-[#CA0410] text-sm shrink-0" />
                                <p className="text-[13.5px] sm:text-[14px] font-black text-slate-900 truncate" title={planName}>
                                    {planName}
                                </p>
                            </div>
                        </div>

                        {/* 2. PLAN EXPIRY */}
                        <div className="p-3.5 sm:p-4 px-5">
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">PLAN EXPIRY</p>
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <FiCalendar className="text-emerald-600 text-sm shrink-0" />
                                <p className={`text-[13.5px] sm:text-[14px] font-black ${isPlanExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {planEnd ? formatDate(planEnd) : 'No Active Expiry'}
                                </p>
                            </div>
                        </div>

                        {/* 3. DAYS REMAINING */}
                        <div className="p-3.5 sm:p-4 px-5">
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">DAYS REMAINING</p>
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <FiClock className="text-indigo-600 text-sm shrink-0" />
                                <p className={`text-[13.5px] sm:text-[14px] font-black ${daysLeft === null ? 'text-slate-400' : daysLeft <= 0 ? 'text-rose-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-indigo-600'}`}>
                                    {daysLeft === null ? '--' : daysLeft <= 0 ? 'Expired' : `${daysLeft} Days`}
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
                    
                    {/* LEFT COLUMN: Personal Info & Referral Source */}
                    <div className="space-y-5">
                        {/* Contact & Personal Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <FiUser size={18} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">Personal Information</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Contact & identity details</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                    <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                        <FiPhone className="text-indigo-500" /> Phone
                                    </span>
                                    <span className="text-xs font-black text-slate-800">{contactNumber}</span>
                                </div>

                                {member.altContact && (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                            <FiPhone className="text-indigo-400" /> Alt Phone
                                        </span>
                                        <span className="text-xs font-bold text-slate-700">{member.altContact}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                    <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                        <FiMail className="text-indigo-500" /> Email
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{email}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Gender</p>
                                        <p className="text-xs font-black text-slate-800 mt-0.5">{gender}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Blood Group</p>
                                        <p className="text-xs font-black text-rose-600 mt-0.5">{bloodGroup}</p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Date of Birth</p>
                                    <p className="text-xs font-black text-slate-800 mt-0.5">
                                        {formatDate(dob, 'N/A')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* REFERRAL & ACQUISITION SOURCE CARD */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                    <FiTag size={18} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">Source & Referral Info</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Acquisition channel and referrer origin</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Registration Source</p>
                                        <p className="text-xs font-black text-slate-800 mt-0.5">{source}</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded-lg border border-purple-200">
                                        Channel
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Referred By</p>
                                    <p className="text-xs font-black text-slate-800">
                                        {referredByName}
                                    </p>
                                    {member.referredBy?.contactNumber && (
                                        <p className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                                            <FiPhone size={11} /> {member.referredBy.contactNumber} {member.referredBy.memberId ? `(${member.referredBy.memberId})` : ''}
                                        </p>
                                    )}
                                </div>

                                {attendedBy && (
                                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Attended By Staff</p>
                                        <p className="text-xs font-bold text-slate-800 mt-0.5">{attendedBy}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Address & Emergency Info Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                                    <FiMapPin size={18} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">Address & Emergency</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Location & contact safety</p>
                                </div>
                            </div>

                            <div className="space-y-3">
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

                    {/* MIDDLE & RIGHT COLUMNS: Membership Details, Body Metrics & Payments */}
                    <div className="lg:col-span-2 space-y-5">
                        
                        {/* ACTIVE MEMBERSHIP DETAILS CARD */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                        <FiShield size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">Active Subscriptions & Packages</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">All active memberships, PT packages and session trackers</p>
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const activeList = allMemberships.filter(m => m.membershipStatus === 'Active' || m.membershipStatus === 'Frozen');
                                const listToRender = activeList.length > 0 ? activeList : (activeMembership ? [activeMembership] : []);

                                if (listToRender.length === 0) {
                                    return (
                                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-500 font-medium">No membership plan assigned yet.</p>
                                            <button 
                                                onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member } })}
                                                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm"
                                            >
                                                Assign First Plan
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-6">
                                        {listToRender.map((m, idx) => {
                                            const isFrozen = m.membershipStatus === 'Frozen';
                                            const pNameRaw = String(m.membershipPlanId?.name || m.planName || '').toLowerCase();
                                            const pTypeRaw = Array.isArray(m.membershipPlanId?.planType) 
                                                ? m.membershipPlanId.planType.join(' ').toLowerCase()
                                                : Array.isArray(m.planType) 
                                                    ? m.planType.join(' ').toLowerCase() 
                                                    : String(m.membershipPlanId?.planType || m.planType || '').toLowerCase();
                                            const isExplicitPT = pTypeRaw.includes('personal training') || pTypeRaw.includes('pt') || pNameRaw.includes('personal training') || pNameRaw.includes('pt package');
                                            const isPT = Boolean(m.isPTConversion) || isExplicitPT;
                                            const pName = m.membershipPlanId?.name || m.planName || 'Active Package';
                                            const mStart = formatDate(m.startDate, 'N/A');
                                            const mEnd = formatDate(m.endDate, 'N/A');

                                            return (
                                                <div key={m._id || idx} className={`p-4 rounded-xl border transition-all ${isFrozen ? 'bg-cyan-50/60 border-cyan-200' : isPT ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-indigo-900 shadow-md' : 'bg-slate-900 text-white border-slate-800 shadow-md'}`}>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded ${isFrozen ? 'bg-cyan-200 text-cyan-900' : isPT ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'}`}>
                                                                    {isFrozen ? 'FROZEN / PAUSED' : isPT ? 'PERSONAL TRAINING' : 'GYM MEMBERSHIP'}
                                                                </span>
                                                                {m.trainerId?.name && (
                                                                    <span className="text-[11px] font-bold text-indigo-300">
                                                                        Trainer: {m.trainerId.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h4 className={`text-xl font-black mt-1 ${isFrozen ? 'text-slate-800' : 'text-white'}`}>{pName}</h4>
                                                            <p className={`text-xs mt-1 font-medium ${isFrozen ? 'text-slate-600' : 'text-slate-300'}`}>
                                                                {mStart} to {mEnd} {m.bonusDays > 0 ? `(+${m.bonusDays} bonus days)` : ''}
                                                            </p>
                                                        </div>

                                                        {/* Freeze & Unfreeze Toggle Button */}
                                                        <div className="flex items-center gap-2 self-start sm:self-center">
                                                            <button 
                                                                onClick={() => handleToggleFreeze(m._id, m.membershipStatus)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                                                    isFrozen 
                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                                                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                                                                }`}
                                                            >
                                                                {isFrozen ? '▶️ Unfreeze & Extend' : '❄️ Freeze / Pause'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* PT SESSION TRACKER UI */}
                                                    {isPT && (
                                                        <div className={`mt-4 pt-4 border-t ${isFrozen ? 'border-cyan-200' : 'border-white/10'} space-y-2`}>
                                                            <div className="flex items-center justify-between text-xs font-bold">
                                                                <span className={isFrozen ? 'text-cyan-900' : 'text-indigo-200'}>
                                                                    🏋️ PT Sessions Progress
                                                                </span>
                                                                <span className={isFrozen ? 'text-slate-800 font-extrabold' : 'text-amber-400 font-black'}>
                                                                    {m.usedSessions || 0} / {m.totalSessions > 0 ? m.totalSessions : '∞'} Sessions Used
                                                                </span>
                                                            </div>

                                                            {/* Progress Bar */}
                                                            {m.totalSessions > 0 && (
                                                                <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
                                                                    <div 
                                                                        className="bg-amber-400 h-full transition-all duration-300"
                                                                        style={{ width: `${Math.min(100, Math.round(((m.usedSessions || 0) / m.totalSessions) * 100))}%` }}
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="flex justify-end pt-1">
                                                                <button
                                                                    onClick={() => handleLogPTSession(m._id)}
                                                                    className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
                                                                >
                                                                    + Log Completed PT Session (+1)
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className={`grid grid-cols-3 gap-3 mt-4 pt-3 border-t ${isFrozen ? 'border-cyan-200 text-slate-800' : 'border-white/10 text-white'}`}>
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-bold opacity-70 uppercase">Fee</p>
                                                            <p className="text-xs sm:text-sm font-black">₹{m.finalPrice || m.originalPrice || 0}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-bold opacity-70 uppercase">Paid</p>
                                                            <div className="flex flex-col items-center justify-center">
                                                                <p className="text-xs sm:text-sm font-black text-emerald-400">₹{(m.totalCollected || m.paidAmount) > (m.paidAmount || 0) ? m.totalCollected : (m.paidAmount || 0)}</p>
                                                                {(m.totalCollected || m.paidAmount) > (m.paidAmount || 0) && (
                                                                    <p className="text-[9px] font-medium text-emerald-200/80 leading-tight mt-0.5 whitespace-nowrap">
                                                                        Fee: ₹{m.paidAmount} | Wallet: ₹{Number((m.totalCollected - m.paidAmount).toFixed(2))}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-bold opacity-70 uppercase">Due</p>
                                                            <p className="text-xs sm:text-sm font-black text-rose-400">₹{m.balanceAmount || 0}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* SCHEDULED / UPCOMING MEMBERSHIP CARD */}
                        {scheduledMembership && (
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 shadow-sm space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-indigo-200/60">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                                            <FiCalendar size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-indigo-950 text-sm">Upcoming / Scheduled Plan</h3>
                                            <p className="text-[11px] text-indigo-600 font-semibold">Future plan starting after current plan ends</p>
                                        </div>
                                    </div>

                                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                                        Scheduled
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-indigo-900 text-white shadow-sm space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Scheduled Package</span>
                                                <h4 className="text-xl font-black text-white mt-0.5">{scheduledMembership.membershipPlanId?.name || scheduledMembership.planName}</h4>
                                                <p className="text-xs text-indigo-200 mt-1 font-medium">
                                                    Starts: <strong>{formatDate(scheduledMembership.startDate)}</strong> to {formatDate(scheduledMembership.endDate)}
                                                </p>
                                                {scheduledMembership.paymentStatus === 'Partial' && scheduledMembership.paidUntilDate && (
                                                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded inline-block mt-1.5">
                                                        Paid till {formatDate(scheduledMembership.paidUntilDate)} (₹{scheduledMembership.paidAmount || 0} / ₹{scheduledMembership.finalPrice || 0})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-indigo-800 text-white">
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-indigo-300 uppercase">Fee</p>
                                                <p className="text-xs sm:text-sm font-black">₹{scheduledMembership.finalPrice || scheduledMembership.originalPrice || 0}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-indigo-300 uppercase">Paid</p>
                                                <div className="flex flex-col items-center justify-center">
                                                    <p className="text-xs sm:text-sm font-black text-emerald-400">₹{(scheduledMembership.totalCollected || scheduledMembership.paidAmount) > (scheduledMembership.paidAmount || 0) ? scheduledMembership.totalCollected : (scheduledMembership.paidAmount || 0)}</p>
                                                    {(scheduledMembership.totalCollected || scheduledMembership.paidAmount) > (scheduledMembership.paidAmount || 0) && (
                                                        <p className="text-[9px] font-medium text-emerald-200/80 leading-tight mt-0.5 whitespace-nowrap">
                                                            Fee: ₹{scheduledMembership.paidAmount} | Wallet: ₹{Number((scheduledMembership.totalCollected - scheduledMembership.paidAmount).toFixed(2))}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-indigo-300 uppercase">Due</p>
                                                <p className="text-xs sm:text-sm font-black text-rose-300">₹{scheduledMembership.balanceAmount || 0}</p>
                                            </div>
                                        </div>

                                        {scheduledMembership.balanceAmount > 0 && (
                                            <div className="pt-2 flex justify-end">
                                                <button 
                                                    onClick={() => navigate('/dashboard/owner/finance/collect', {
                                                        state: {
                                                            autoOpenMember: member,
                                                            targetMembership: scheduledMembership
                                                        }
                                                    })}
                                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                                >
                                                    <FiCreditCard className="text-xs" /> Collect Remaining Due (₹{scheduledMembership.balanceAmount})
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* HEALTH & BODY METRICS TILES (ALWAYS SHOWN) */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                                        <FiActivity size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">Health & Body Metrics</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Physical stats and fitness profile</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/dashboard/owner/members/edit/${member._id || memberIdVal}`, { state: { member } })}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all hover:bg-indigo-100"
                                >
                                    <FiEdit2 size={13} /> Update Stats
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Height</span>
                                    <p className="text-sm font-black text-slate-800 mt-0.5">{height ? `${height} cm` : '--'}</p>
                                </div>
                                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Weight</span>
                                    <p className="text-sm font-black text-slate-800 mt-0.5">{weight ? `${weight} kg` : '--'}</p>
                                </div>
                                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">BMI</span>
                                    <p className="text-sm font-black text-indigo-600 mt-0.5">{bmi || '--'}</p>
                                </div>
                                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Body Fat</span>
                                    <p className="text-sm font-black text-slate-800 mt-0.5">{bodyFat ? `${bodyFat} %` : '--'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Diet Preference</p>
                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{dietPreference || 'Not Specified'}</p>
                                </div>
                                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase">Medical Conditions</p>
                                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{medicalConditions || 'None Reported'}</p>
                                </div>
                            </div>
                        </div>

                        {/* PAYMENT HISTORY TABLE */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                        <FiCreditCard size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">Payment History</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Recent payment transactions</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400">{transactions.length} Records</span>
                            </div>

                            {transactions.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-slate-100">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Plan</th>
                                                <th className="px-4 py-3">Amount Paid</th>
                                                <th className="px-4 py-3">Mode</th>
                                                <th className="px-4 py-3">Txn ID</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                                            {transactions.map(tx => (
                                                <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-slate-800">
                                                        {formatDate(tx.paymentDate || tx.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3 text-indigo-600 font-bold">
                                                        {tx.planName || tx.planId?.name || 'Membership Plan'}
                                                    </td>
                                                    <td className="px-4 py-3 font-black text-emerald-600">
                                                        ₹{tx.amountPaid}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                            {tx.paymentMode || 'Cash'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">
                                                        {tx.transactionId || tx._id?.toString().slice(-6)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-400 font-medium">No payment history recorded yet.</p>
                                </div>
                            )}
                        </div>

                        {/* REFERRED MEMBERS CARD */}
                        {referredMembers.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                        <FiUsers size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">Referred Network</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Members referred by {firstName}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {referredMembers.map(refM => {
                                        const refFirstName = refM?.firstName || refM?.memberName?.split(' ')[0] || 'Member';
                                        const refLastName = refM?.lastName || '';
                                        return (
                                            <div key={refM._id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                                                    {refFirstName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-slate-800 text-xs truncate">{refFirstName} {refLastName}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium truncate">{refM.contactNumber || 'N/A'} • {refM.memberId || 'MEM'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
                </div>
            </div>

            {/* COLLECT FEE MODAL */}
            {collectModal.open && collectModal.membership && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-lg">Collect Fee</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {collectModal.membership.membershipPlanId?.name || collectModal.membership.planName}
                                </p>
                            </div>
                            <button onClick={() => setCollectModal({ open: false, membership: null })} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Fee</span>
                                <span className="font-black text-slate-800">₹{collectModal.membership.finalPrice}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Paid So Far</span>
                                <span className="font-black text-emerald-600">₹{collectModal.membership.paidAmount}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">Balance Due</span>
                                <span className="font-black text-rose-600">₹{collectModal.membership.balanceAmount}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitCollectFee} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Amount to Pay (₹)</label>
                                <input 
                                    type="number" 
                                    className="w-full px-3 py-2 rounded-xl border border-rose-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-bold text-slate-900 bg-rose-50/30"
                                    value={collectModal.amount} 
                                    onChange={(e) => setCollectModal(prev => ({ ...prev, amount: e.target.value }))} 
                                    placeholder="Enter amount"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                                <select 
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#CA0410] focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-medium bg-white cursor-pointer"
                                    value={collectModal.paymentMode} 
                                    onChange={(e) => setCollectModal(prev => ({ ...prev, paymentMode: e.target.value }))}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                            </div>

                            {(member?.walletBalance || 0) > 0 && (
                                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={collectModal.useWallet} 
                                            onChange={(e) => setCollectModal(prev => ({ 
                                                ...prev, 
                                                useWallet: e.target.checked, 
                                                walletUsed: e.target.checked ? Math.min(member.walletBalance, collectModal.membership.balanceAmount) : 0 
                                            }))} 
                                            className="w-4 h-4 text-[#CA0410] rounded focus:ring-[#CA0410]"
                                        />
                                        Use Wallet (Available: <span className="text-[#CA0410] font-bold">₹{member.walletBalance}</span>)
                                    </label>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setCollectModal({ open: false, membership: null })} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
                                <button type="submit" disabled={collectModal.submitting} className="px-4 py-2 text-xs font-bold text-white bg-[#CA0410] hover:bg-[#a8030d] rounded-xl shadow-2xs cursor-pointer">
                                    {collectModal.submitting ? 'Recording...' : 'Submit Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
