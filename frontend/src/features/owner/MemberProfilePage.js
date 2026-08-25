import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiActivity, FiAward, 
    FiEdit2, FiUsers, FiCreditCard, FiClock, FiCheckCircle, FiXCircle, 
    FiShield, FiHeart, FiZap, FiPlusCircle, FiArrowLeft, FiTag, FiFileText, FiShare2
} from 'react-icons/fi';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import apiClient from '../../api/apiClient';

export default function MemberProfilePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const rawMember = location.state?.member;

    const member = rawMember?.memberId && typeof rawMember.memberId === 'object' 
        ? { ...rawMember.memberId, ...rawMember, memberIdObj: rawMember.memberId } 
        : rawMember;

    const [referredMembers, setReferredMembers] = useState([]);
    const [activeMembership, setActiveMembership] = useState(rawMember?.activeMembership || (rawMember?.membershipPlanId ? rawMember : null));
    const [transactions, setTransactions] = useState([]);
    
    const memberIdVal = member?._id || rawMember?._id;

    useEffect(() => {
        if (memberIdVal) {
            apiClient.get('/members')
                .then(res => {
                    const referred = (res.data || []).filter(m => m.referredBy?._id === memberIdVal || m.referredBy === memberIdVal);
                    setReferredMembers(referred);
                })
                .catch(err => console.error("Failed to fetch referred members", err));
            
            if (!activeMembership) {
                apiClient.get('/member-memberships/latest')
                    .then(res => {
                        const m = (res.data || []).find(x => (x.memberId?._id || x.memberId) === memberIdVal);
                        if (m) setActiveMembership(m);
                    })
                    .catch(err => console.error("Failed to fetch membership", err));
            }
            
            apiClient.get('/members/transactions/all')
                .then(res => {
                    const memberTxs = (res.data || []).filter(t => (t.memberId?._id || t.memberId) === memberIdVal);
                    setTransactions(memberTxs);
                })
                .catch(err => console.error("Failed to fetch transactions", err));
        }
    }, [memberIdVal, activeMembership]);

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
                title="Member Profile" 
                subtitle={`Executive profile view for ${firstName}`}
                showBack={true}
                onBack={() => navigate('/dashboard/owner/members')}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
                
                {/* HERO HEADER CARD */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                    <div className="h-32 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 relative">
                        <div className="absolute inset-0 bg-[radial-gradient(#opacity_0.15)] bg-[size:16px_16px] opacity-20"></div>
                    </div>
                    
                    <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14 sm:-mt-16">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-100 shrink-0">
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-3xl shadow-inner">
                                        {firstName.charAt(0).toUpperCase()}{lastName ? lastName.charAt(0).toUpperCase() : ''}
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                        {fullName}
                                    </h2>
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs ${
                                        status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                        status === 'Frozen' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                        'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        {status}
                                    </span>
                                </div>
                                
                                <p className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        ID: {customMemberId}
                                    </span>
                                    <span>•</span>
                                    <span>Joined {joiningDate ? new Date(joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap self-start md:self-end">
                            <button 
                                onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member } })}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
                            >
                                <FiPlusCircle size={15} /> Assign / Renew Plan
                            </button>
                            <button 
                                onClick={() => navigate(`/dashboard/owner/members/edit/${member._id || memberIdVal}`, { state: { member } })}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border border-slate-200 active:scale-95"
                            >
                                <FiEdit2 size={15} /> Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* KEY STATS HIGHLIGHT BAR */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50/50">
                        <div className="p-4 px-6">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Plan</p>
                            <p className="text-base font-black text-slate-800 mt-0.5 truncate">{planName}</p>
                        </div>
                        <div className="p-4 px-6">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plan Expiry</p>
                            <p className={`text-base font-black mt-0.5 ${isPlanExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {planEnd ? planEnd.toLocaleDateString() : 'No Active Expiry'}
                            </p>
                        </div>
                        <div className="p-4 px-6">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Days Remaining</p>
                            <p className={`text-base font-black mt-0.5 ${daysLeft === null ? 'text-slate-400' : daysLeft <= 0 ? 'text-rose-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-indigo-600'}`}>
                                {daysLeft === null ? '--' : daysLeft <= 0 ? 'Expired' : `${daysLeft} Days`}
                            </p>
                        </div>
                        <div className="p-4 px-6">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Wallet Rewards</p>
                            <p className="text-base font-black text-emerald-600 mt-0.5">₹{walletBalance}</p>
                        </div>
                    </div>
                </div>

                {/* GRID DASHBOARD */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN: Personal Info & Referral Source */}
                    <div className="space-y-6">
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
                                        {dob ? new Date(dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
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
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* ACTIVE MEMBERSHIP DETAILS CARD */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                        <FiShield size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">Subscription & Membership</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Current plan status and billing breakdown</p>
                                    </div>
                                </div>

                                {activeMembership && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                                        activeMembership.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        Payment: {activeMembership.paymentStatus || 'Pending'}
                                    </span>
                                )}
                            </div>

                            {activeMembership ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Active Package</span>
                                            <h4 className="text-xl font-black text-white mt-0.5">{planName}</h4>
                                            <p className="text-xs text-indigo-200 mt-1 font-medium">
                                                {activeMembership.startDate ? new Date(activeMembership.startDate).toLocaleDateString() : 'N/A'} to {planEnd ? planEnd.toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        {activeMembership.bonusDays > 0 && (
                                            <span className="px-3 py-1 bg-amber-400 text-slate-900 rounded-lg text-xs font-black self-start sm:self-center shadow-sm">
                                                +{activeMembership.bonusDays} Bonus Days Added
                                            </span>
                                        )}
                                    </div>

                                    {/* Pricing & Billing Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Fee</p>
                                            <p className="text-sm sm:text-base font-black text-slate-800 mt-0.5">
                                                ₹{activeMembership.finalPrice || activeMembership.totalAmount || activeMembership.originalPrice || 0}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase">Amount Paid</p>
                                            <p className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                                                ₹{activeMembership.paidAmount || 0}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-center">
                                            <p className="text-[10px] font-bold text-rose-600 uppercase">Balance Due</p>
                                            <p className="text-sm sm:text-base font-black text-rose-700 mt-0.5">
                                                ₹{activeMembership.balanceAmount || activeMembership.remainingBalance || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-500 font-medium">No membership plan assigned yet.</p>
                                    <button 
                                        onClick={() => navigate('/dashboard/owner/membership/assign', { state: { member } })}
                                        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm"
                                    >
                                        Assign First Plan
                                    </button>
                                </div>
                            )}
                        </div>

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
                                                        {new Date(tx.paymentDate || tx.createdAt).toLocaleDateString()}
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
        </PageLayout>
    );
}
