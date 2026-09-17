import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils';
import Tabs from '../../components/page/Tabs';
import GeneralTab from './settings/GeneralTab';
import ReferralTab from './settings/ReferralTab';
import ScheduleTab from './settings/ScheduleTab';
import CouponModal from './settings/CouponModal';

export default function GymSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('General'); // 'General' | 'Referral' | 'Schedule'
    const [referralHistory, setReferralHistory] = useState([]);
    
    const [settings, setSettings] = useState({
        name: '',
        contactEmail: '',
        contactPhone: '',
        latitude: '',
        longitude: '',
        qrAttendanceEnabled: false,
        qrAttendanceRange: 50,

        // Schedule Settings
        weeklyOff: ['Sunday'],
        workingHours: { start: '06:00', end: '22:00' },
        holidays: [],

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
                            date: formatDate(m.createdAt),
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
                    
                    weeklyOff: res.data.weeklyOff || ['Sunday'],
                    workingHours: res.data.workingHours || { start: '06:00', end: '22:00' },
                    holidays: res.data.holidays || [],
                    
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

    const handleWeeklyOffChange = (day) => {
        setSettings(prev => {
            const isSelected = prev.weeklyOff.includes(day);
            return {
                ...prev,
                weeklyOff: isSelected 
                    ? prev.weeklyOff.filter(d => d !== day)
                    : [...prev.weeklyOff, day]
            };
        });
    };

    const handleWorkingHoursChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [name]: value
            }
        }));
    };

    const addHoliday = () => {
        setSettings(prev => ({
            ...prev,
            holidays: [...prev.holidays, { date: '', reason: '' }]
        }));
    };

    const updateHoliday = (index, field, value) => {
        setSettings(prev => {
            const newHolidays = [...prev.holidays];
            newHolidays[index][field] = value;
            return { ...prev, holidays: newHolidays };
        });
    };

    const removeHoliday = (index) => {
        setSettings(prev => ({
            ...prev,
            holidays: prev.holidays.filter((_, i) => i !== index)
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
                tabs={['General & Geofencing', 'Referral, Wallet & Coupon Offers', 'Attendance & Schedule']}
                activeTab={activeTab === 'General' ? 'General & Geofencing' : activeTab === 'Referral' ? 'Referral, Wallet & Coupon Offers' : 'Attendance & Schedule'}
                onTabChange={(tab) => {
                    if (tab.includes('General')) setActiveTab('General');
                    else if (tab.includes('Referral')) setActiveTab('Referral');
                    else setActiveTab('Schedule');
                }}
            />

            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-4 bg-[#FAEEEF]">
                <div className="w-full max-w-7xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
                        
                        {/* TAB 1: GENERAL & GEOFENCING */}
                        {activeTab === 'General' && (
                            <GeneralTab 
                                settings={settings}
                                handleChange={handleChange}
                                handleGetCurrentLocation={handleGetCurrentLocation}
                            />
                        )}

                        {/* TAB 2: REFERRAL, WALLET & COUPON OFFERS */}
                        {activeTab === 'Referral' && (
                            <ReferralTab 
                                settings={settings}
                                setSettings={setSettings}
                                handleChange={handleChange}
                                referralHistory={referralHistory}
                                setShowCouponModal={setShowCouponModal}
                                handleToggleCoupon={handleToggleCoupon}
                                handleDeleteCoupon={handleDeleteCoupon}
                            />
                        )}

                        {/* TAB 3: ATTENDANCE & SCHEDULE */}
                        {activeTab === 'Schedule' && (
                            <ScheduleTab 
                                settings={settings}
                                handleWeeklyOffChange={handleWeeklyOffChange}
                                handleWorkingHoursChange={handleWorkingHoursChange}
                                addHoliday={addHoliday}
                                updateHoliday={updateHoliday}
                                removeHoliday={removeHoliday}
                            />
                        )}

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-6 pt-4 border-t border-rose-200/60">
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="w-full sm:w-auto px-8 py-2.5 bg-[#CA0410] hover:bg-[#a8030d] text-white font-bold text-sm rounded-xl transition-all shadow-2xs hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? 'Saving Settings...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>

                    {/* MODAL: CREATE NEW COUPON OFFER */}
                    <CouponModal 
                        showCouponModal={showCouponModal}
                        setShowCouponModal={setShowCouponModal}
                        newCoupon={newCoupon}
                        setNewCoupon={setNewCoupon}
                        handleAddCoupon={handleAddCoupon}
                    />
                </div>
            </div>
        </PageLayout>
    );
}
