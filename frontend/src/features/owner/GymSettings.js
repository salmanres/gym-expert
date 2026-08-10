import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { FiSettings, FiMapPin, FiInfo, FiPrinter, FiGift, FiAward, FiPercent, FiCalendar, FiUsers, FiCheckCircle, FiCreditCard, FiTag, FiPlus, FiTrash2, FiEdit, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Tabs from '../../components/page/Tabs';

export default function GymSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('General'); // 'General' | 'Referral'
    const [referralHistory, setReferralHistory] = useState([]);
    
    const [settings, setSettings] = useState({
        name: '',
        contactEmail: '',
        contactPhone: '',
        latitude: '',
        longitude: '',
        qrAttendanceEnabled: false,
        qrAttendanceRange: 50,

        // Referral & Bonus / Wallet Settings
        referralProgramEnabled: true,
        referralRewardType: 'Both', // 'Bonus Days' | 'Wallet Cash' | 'Both'
        referrerBonusDays: 7,
        referrerWalletAmount: 200,
        referrerDiscountPercent: 10,
        refereeBonusDays: 5,
        refereeDiscountPercent: 10,
        minPlanDurationDays: 30,

        // Coupon Offers
        couponOffers: []
    });

    // New Coupon Modal Form State
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        title: '',
        discountType: 'Percentage',
        discountValue: '',
        bonusDays: '',
        minPlanDays: 30,
        isActive: true
    });

    useEffect(() => {
        const fetchGym = async () => {
            try {
                const [res, membersRes] = await Promise.all([
                    apiClient.get('/gyms/my-gym'),
                    apiClient.get('/members').catch(() => ({ data: [] }))
                ]);

                const membersList = membersRes.data || [];
                const computedReferrals = membersList
                    .filter(m => m.referredBy)
                    .map(m => {
                        const referrer = membersList.find(r => r._id === m.referredBy || r._id === m.referredBy._id);
                        return {
                            id: `REF-${m._id.toString().slice(-4).toUpperCase()}`,
                            referrer: referrer ? `${referrer.firstName} ${referrer.lastName || ''} (${referrer.memberId})`.trim() : 'Unknown Member',
                            referee: `${m.firstName} ${m.lastName || ''} (${m.memberId})`.trim(),
                            date: new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                            reward: m.referralBonusGranted ? 'Granted' : 'Pending',
                            status: m.referralBonusGranted ? 'Credited' : 'Pending'
                        };
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                setReferralHistory(computedReferrals);

                setSettings({
                    name: res.data.name || '',
                    contactEmail: res.data.contactEmail || '',
                    contactPhone: res.data.contactPhone || '',
                    latitude: res.data.latitude || '',
                    longitude: res.data.longitude || '',
                    qrAttendanceEnabled: res.data.qrAttendanceEnabled || false,
                    qrAttendanceRange: res.data.qrAttendanceRange || 50,
                    
                    referralProgramEnabled: res.data.referralProgramEnabled !== undefined ? res.data.referralProgramEnabled : true,
                    referralRewardType: res.data.referralRewardType || 'Both',
                    referrerBonusDays: res.data.referrerBonusDays || 7,
                    referrerWalletAmount: res.data.referrerWalletAmount || 200,
                    referrerDiscountPercent: res.data.referrerDiscountPercent || 10,
                    refereeBonusDays: res.data.refereeBonusDays || 5,
                    refereeDiscountPercent: res.data.refereeDiscountPercent || 10,
                    minPlanDurationDays: res.data.minPlanDurationDays || 30,

                    couponOffers: res.data.couponOffers && res.data.couponOffers.length > 0 ? res.data.couponOffers : []
                });
                setLoading(false);
            } catch (error) {
                console.error("Fetch gym error:", error);
                toast.error("Failed to load gym settings");
                setLoading(false);
            }
        };

        fetchGym();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setSettings(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                toast.success("Location updated successfully!");
            },
            (error) => {
                console.error("Error getting location", error);
                toast.error("Unable to retrieve your location");
            }
        );
    };

    // Add New Coupon Offer
    const handleAddCoupon = (e) => {
        e.preventDefault();
        if (!newCoupon.code || !newCoupon.title) {
            toast.error("Please provide a Coupon Code and Title");
            return;
        }
        if (!newCoupon.discountValue && !newCoupon.bonusDays) {
            toast.error("Please provide either a Discount Value or Bonus Days");
            return;
        }

        const formattedCode = newCoupon.code.trim().toUpperCase();
        if (settings.couponOffers.some(c => c.code === formattedCode)) {
            toast.error("A coupon with this code already exists!");
            return;
        }

        const updatedCoupons = [
            ...settings.couponOffers,
            {
                ...newCoupon,
                code: formattedCode,
                discountValue: Number(newCoupon.discountValue) || 0,
                bonusDays: Number(newCoupon.bonusDays) || 0
            }
        ];

        setSettings(prev => ({ ...prev, couponOffers: updatedCoupons }));
        setShowCouponModal(false);
        setNewCoupon({ code: '', title: '', discountType: 'Percentage', discountValue: '', bonusDays: '', minPlanDays: 30, isActive: true });
        toast.success(`Coupon "${formattedCode}" created successfully! Click 'Save Settings' to apply.`);
    };

    // Toggle Coupon Active Status
    const handleToggleCoupon = (code) => {
        const updated = settings.couponOffers.map(c => c.code === code ? { ...c, isActive: !c.isActive } : c);
        setSettings(prev => ({ ...prev, couponOffers: updated }));
    };

    // Delete Coupon
    const handleDeleteCoupon = (code) => {
        const updated = settings.couponOffers.filter(c => c.code !== code);
        setSettings(prev => ({ ...prev, couponOffers: updated }));
        toast.info(`Coupon "${code}" removed.`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.put('/gyms/my-gym', settings);
            toast.success("Settings & Coupon Offers saved successfully!");
        } catch (error) {
            console.error("Update gym error:", error);
            toast.error("Failed to update gym settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader text="Loading settings..." />;

    return (
        <PageLayout>
            <PageHeader 
                title="Gym Settings" 
                subtitle="Configure gym details, geofenced QR attendance, and referral bonus/wallet/coupon programs."
            />

            <Tabs 
                tabs={['General & Geofencing', 'Referral, Wallet & Coupon Offers']}
                activeTab={activeTab === 'General' ? 'General & Geofencing' : 'Referral, Wallet & Coupon Offers'}
                onTabChange={(tab) => {
                    setActiveTab(tab.includes('General') ? 'General' : 'Referral');
                }}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
                        
                        {/* TAB 1: GENERAL & GEOFENCING */}
                        {activeTab === 'General' && (
                            <div className="space-y-6">
                                <FormSection title="Gym Information" icon={<FiInfo />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    <Input label="Gym Name" name="name" value={settings.name || ''} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
                                    <Input label="Contact Email" name="contactEmail" value={settings.contactEmail || ''} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
                                    <Input label="Contact Phone" name="contactPhone" value={settings.contactPhone || ''} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
                                </FormSection>

                                <FormSection title="QR Geofencing Settings" icon={<FiSettings />} className="grid grid-cols-1 gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-2 mb-2">
                                        <p className="text-sm text-slate-500">Enable QR attendance and ensure members can only mark attendance within your gym's physical range.</p>
                                        <Link to="/dashboard/owner/settings/qr" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs rounded transition-colors w-max">
                                            <FiPrinter /> Print QR Code
                                        </Link>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="qrAttendanceEnabled" 
                                            name="qrAttendanceEnabled" 
                                            checked={settings.qrAttendanceEnabled} 
                                            onChange={handleChange}
                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                        />
                                        <label htmlFor="qrAttendanceEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                                            Enable Geofenced QR Attendance
                                        </label>
                                    </div>

                                    {settings.qrAttendanceEnabled && (
                                        <div className="mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input 
                                                    type="number" 
                                                    step="any"
                                                    label="Latitude"
                                                    name="latitude" 
                                                    value={settings.latitude || ''} 
                                                    onChange={handleChange}
                                                    placeholder="e.g. 28.7041"
                                                    required
                                                />
                                                <Input 
                                                    type="number" 
                                                    step="any"
                                                    label="Longitude"
                                                    name="longitude" 
                                                    value={settings.longitude || ''} 
                                                    onChange={handleChange}
                                                    placeholder="e.g. 77.1025"
                                                    required
                                                />
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={handleGetCurrentLocation} className="text-sm font-bold text-indigo-600 flex items-center gap-1.5 hover:text-indigo-700">
                                                    <FiMapPin /> Use My Current Location
                                                </button>
                                            </div>

                                            <div className="w-full md:w-1/2">
                                                <Input 
                                                    type="number" 
                                                    label="Allowed Range (in meters)"
                                                    name="qrAttendanceRange" 
                                                    value={settings.qrAttendanceRange || ''} 
                                                    onChange={handleChange}
                                                    min="10"
                                                    max="10000"
                                                    required
                                                />
                                                <p className="text-xs text-slate-500 mt-1">Members must be within this distance to mark attendance successfully.</p>
                                            </div>
                                        </div>
                                    )}
                                </FormSection>
                            </div>
                        )}

                        {/* TAB 2: REFERRAL, WALLET & COUPON OFFERS */}
                        {activeTab === 'Referral' && (
                            <div className="space-y-6">
                                {/* Top Banner */}
                                <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                                    <div className="space-y-1">
                                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                            <FiGift className="text-emerald-600 text-lg" /> Member Referral Reward, Wallet & Coupon System
                                        </h3>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-2xl">
                                            Configure referral rewards (Bonus Days / Wallet Cash) and create custom **Coupon Code Offers** for new joining members.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-emerald-200 shadow-xs">
                                        <input 
                                            type="checkbox" 
                                            id="referralProgramEnabled" 
                                            name="referralProgramEnabled" 
                                            checked={settings.referralProgramEnabled} 
                                            onChange={handleChange}
                                            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300 cursor-pointer"
                                        />
                                        <label htmlFor="referralProgramEnabled" className="text-xs font-extrabold text-slate-800 cursor-pointer">
                                            {settings.referralProgramEnabled ? 'Program Active' : 'Program Disabled'}
                                        </label>
                                    </div>
                                </div>

                                {settings.referralProgramEnabled ? (
                                    <>
                                        {/* Reward Type Selection Selector */}
                                        <FormSection title="1. Select Referrer Reward Mode" icon={<FiAward className="text-emerald-600" />} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="col-span-full">
                                                <label className="block text-xs font-bold text-slate-700 mb-2">How should the Referrer be rewarded?</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div 
                                                        onClick={() => setSettings(prev => ({ ...prev, referralRewardType: 'Bonus Days' }))}
                                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                                            settings.referralRewardType === 'Bonus Days'
                                                                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-sm'
                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <FiCalendar className="text-xl text-emerald-600 shrink-0" />
                                                        <div>
                                                            <div className="text-xs font-extrabold">Bonus Days Only</div>
                                                            <div className="text-[11px] text-slate-500 font-medium">Add extra days to membership</div>
                                                        </div>
                                                    </div>

                                                    <div 
                                                        onClick={() => setSettings(prev => ({ ...prev, referralRewardType: 'Wallet Cash' }))}
                                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                                            settings.referralRewardType === 'Wallet Cash'
                                                                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-sm'
                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <FiCreditCard className="text-xl text-indigo-600 shrink-0" />
                                                        <div>
                                                            <div className="text-xs font-extrabold">Wallet Cash Only</div>
                                                            <div className="text-[11px] text-slate-500 font-medium">Add cash credit to member wallet</div>
                                                        </div>
                                                    </div>

                                                    <div 
                                                        onClick={() => setSettings(prev => ({ ...prev, referralRewardType: 'Both' }))}
                                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                                            settings.referralRewardType === 'Both'
                                                                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-sm'
                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <FiGift className="text-xl text-amber-600 shrink-0" />
                                                        <div>
                                                            <div className="text-xs font-extrabold">Both (Days + Wallet Cash)</div>
                                                            <div className="text-[11px] text-slate-500 font-medium">Give both bonus days & cash</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {(settings.referralRewardType === 'Bonus Days' || settings.referralRewardType === 'Both') && (
                                                <Input 
                                                    type="number" 
                                                    label="Bonus Days Granted to Referrer"
                                                    name="referrerBonusDays" 
                                                    value={settings.referrerBonusDays || ''} 
                                                    onChange={handleChange}
                                                    placeholder="e.g. 7 Days"
                                                    min="0"
                                                    required
                                                />
                                            )}

                                            {(settings.referralRewardType === 'Wallet Cash' || settings.referralRewardType === 'Both') && (
                                                <Input 
                                                    type="number" 
                                                    label="Wallet Cash Credited to Referrer (₹)"
                                                    name="referrerWalletAmount" 
                                                    value={settings.referrerWalletAmount || ''} 
                                                    onChange={handleChange}
                                                    placeholder="e.g. 200"
                                                    min="0"
                                                    required
                                                />
                                            )}

                                            <Input 
                                                type="number" 
                                                label="Renewal Discount (%)"
                                                name="referrerDiscountPercent" 
                                                value={settings.referrerDiscountPercent || ''} 
                                                onChange={handleChange}
                                                placeholder="e.g. 10"
                                                min="0"
                                                max="100"
                                            />
                                        </FormSection>

                                        {/* SECTION 2: Referee Rewards */}
                                        <FormSection title="2. Referee Rewards (New Joining Member)" icon={<FiPercent className="text-indigo-600" />} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input 
                                                type="number" 
                                                label="Welcome Bonus Days for New Member"
                                                name="refereeBonusDays" 
                                                value={settings.refereeBonusDays || ''} 
                                                onChange={handleChange}
                                                placeholder="e.g. 5 Days"
                                                min="0"
                                            />
                                            <Input 
                                                type="number" 
                                                label="Joining Discount Percentage (%)"
                                                name="refereeDiscountPercent" 
                                                value={settings.refereeDiscountPercent || ''} 
                                                onChange={handleChange}
                                                placeholder="e.g. 10"
                                                min="0"
                                                max="100"
                                            />
                                            <Input 
                                                type="number" 
                                                label="Min Membership Plan (in Days)"
                                                name="minPlanDurationDays" 
                                                value={settings.minPlanDurationDays || ''} 
                                                onChange={handleChange}
                                                placeholder="e.g. 30 Days"
                                                min="1"
                                            />
                                        </FormSection>

                                        {/* SECTION 3: COUPON OFFERS MASTER SECTION */}
                                        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                                        <FiTag className="text-emerald-600" /> Active Coupon Offers & Discount Codes
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Create and manage coupon codes that staff can apply during member registration or payment.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCouponModal(true)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-colors shadow-xs"
                                                >
                                                    <FiPlus /> Create New Coupon Offer
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {settings.couponOffers.length > 0 ? settings.couponOffers.map((c, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3 relative group">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-mono font-black text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                                                    {c.code}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                                                    {c.isActive ? 'Active' : 'Disabled'}
                                                                </span>
                                                            </div>
                                                            <h5 className="text-xs font-extrabold text-slate-800 pt-1">{c.title}</h5>
                                                        </div>

                                                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                                            <span className="font-black text-emerald-700 text-sm flex flex-col gap-0.5">
                                                                {c.discountValue > 0 && <span>{c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}</span>}
                                                                {c.bonusDays > 0 && <span className="text-indigo-600">+{c.bonusDays} Free Days</span>}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleCoupon(c.code)}
                                                                    className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 underline"
                                                                >
                                                                    {c.isActive ? 'Disable' : 'Enable'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteCoupon(c.code)}
                                                                    className="text-slate-400 hover:text-rose-600 p-1"
                                                                >
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                        No coupon offers created yet. Click "Create New Coupon Offer" to get started!
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* SECTION 4: Referral Activity Log Table */}
                                        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                                    <FiUsers className="text-indigo-600" /> Recent Referral History & Wallet/Bonus Log
                                                </h4>
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                                    {referralHistory.length} Total Referrals
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50">
                                                            <th className="py-2.5 px-3">Referral ID</th>
                                                            <th className="py-2.5 px-3">Referrer Member</th>
                                                            <th className="py-2.5 px-3">New Member</th>
                                                            <th className="py-2.5 px-3">Date</th>
                                                            <th className="py-2.5 px-3">Granted Rewards</th>
                                                            <th className="py-2.5 px-3 text-right">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-xs">
                                                        {referralHistory.length > 0 ? referralHistory.map((ref, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{ref.id}</td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-800">{ref.referrer}</td>
                                                                <td className="py-2.5 px-3 font-semibold text-slate-700">{ref.referee}</td>
                                                                <td className="py-2.5 px-3 text-slate-500">{ref.date}</td>
                                                                <td className="py-2.5 px-3 font-extrabold text-emerald-700">{ref.reward}</td>
                                                                <td className="py-2.5 px-3 text-right">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${ref.status === 'Credited' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                        {ref.status === 'Credited' && <FiCheckCircle size={12} />} {ref.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr>
                                                                <td colSpan="6" className="py-4 text-center text-slate-500">No referral history found.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                                        <p className="text-sm font-bold text-slate-600">Referral Program is currently disabled for your gym.</p>
                                        <p className="text-xs text-slate-400">Toggle the switch above to activate member referral rewards & wallet cash system.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-6 pt-6 border-t border-slate-200">
                            <Button type="submit" loading={saving} className="w-full sm:w-auto px-8">
                                Save Settings
                            </Button>
                        </div>
                    </form>

                    {/* MODAL: CREATE NEW COUPON OFFER */}
                    {showCouponModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCouponModal(false)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
                                >
                                    <FiX size={20} />
                                </button>

                                <div className="space-y-1">
                                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                        <FiTag className="text-emerald-600" /> Create New Coupon Offer
                                    </h3>
                                    <p className="text-xs text-slate-500">Define a custom discount code for registration & renewals.</p>
                                </div>

                                <form onSubmit={handleAddCoupon} className="space-y-3 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code (Uppercase)</label>
                                        <input 
                                            type="text"
                                            value={newCoupon.code}
                                            onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                            placeholder="e.g. FESTIVE500, SUMMER20"
                                            required
                                            className="w-full h-10 px-3 text-xs font-mono font-bold uppercase text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Offer Title / Description</label>
                                        <input 
                                            type="text"
                                            value={newCoupon.title}
                                            onChange={(e) => setNewCoupon(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="e.g. Festive Special ₹500 Discount"
                                            required
                                            className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                                            <select
                                                value={newCoupon.discountType}
                                                onChange={(e) => setNewCoupon(prev => ({ ...prev, discountType: e.target.value }))}
                                                className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                                            >
                                                <option value="Percentage">Percentage (%)</option>
                                                <option value="Flat">Flat Amount (₹)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Discount Value (Optional)
                                            </label>
                                            <input 
                                                type="number"
                                                value={newCoupon.discountValue}
                                                onChange={(e) => setNewCoupon(prev => ({ ...prev, discountValue: e.target.value }))}
                                                placeholder={newCoupon.discountType === 'Percentage' ? 'e.g. 15' : 'e.g. 500'}
                                                min="0"
                                                className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Bonus / Free Days (Optional)</label>
                                        <input 
                                            type="number"
                                            value={newCoupon.bonusDays}
                                            onChange={(e) => setNewCoupon(prev => ({ ...prev, bonusDays: e.target.value }))}
                                            placeholder="e.g. 5 (Adds 5 free days to membership)"
                                            min="0"
                                            className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowCouponModal(false)}
                                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                                        >
                                            Add Coupon Offer
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
