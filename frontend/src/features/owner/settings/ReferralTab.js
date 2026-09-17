import React from 'react';
import { FiGift, FiAward, FiPercent, FiCalendar, FiCreditCard, FiTag, FiPlus, FiTrash2, FiUsers, FiCheckCircle } from 'react-icons/fi';
import Input from '../../../components/form/Input';

export default function ReferralTab({
    settings,
    setSettings,
    handleChange,
    referralHistory,
    setShowCouponModal,
    handleToggleCoupon,
    handleDeleteCoupon
}) {
    return (
        <div className="space-y-6">
            {/* 1. MEMBER REFERRAL REWARD, WALLET & COUPON SYSTEM CARD */}
            <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs space-y-6">
                {/* Card Header & Program Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                            <FiGift size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-[14px] font-bold text-slate-900 leading-none">Member Referral Reward, Wallet & Coupon System</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${settings.referralProgramEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {settings.referralProgramEnabled ? 'Program Active' : 'Program Disabled'}
                                </span>
                            </div>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-1 leading-none">
                                Configure referral rewards for existing members & welcome discount coupons for new joining members.
                            </p>
                        </div>
                    </div>

                    {/* Red iOS-Style Toggle Switch */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none shrink-0">
                        <div className="relative inline-flex items-center">
                            <input 
                                type="checkbox" 
                                id="referralProgramEnabled" 
                                name="referralProgramEnabled" 
                                checked={settings.referralProgramEnabled} 
                                onChange={handleChange}
                                className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${settings.referralProgramEnabled ? 'bg-[#CA0410]' : 'bg-slate-200'}`}></div>
                            <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 ease-in-out shadow-sm ${settings.referralProgramEnabled ? 'transform translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                </div>

                {settings.referralProgramEnabled ? (
                    <div className="space-y-6">
                        {/* SUB-SECTION 1: SELECT REFERRER REWARD MODE */}
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <FiAward className="text-[#CA0410]" /> Select Referrer Reward Mode
                                </h4>
                                <p className="text-[11.5px] text-slate-500 font-normal mt-0.5">How should the referrer be rewarded?</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Option 1: Bonus Days */}
                                <div 
                                    onClick={() => setSettings(prev => ({ ...prev, referralRewardType: 'Bonus Days' }))}
                                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 select-none ${
                                        settings.referralRewardType === 'Bonus Days'
                                            ? 'border-[#CA0410] bg-rose-50/40 text-slate-900 shadow-2xs'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${settings.referralRewardType === 'Bonus Days' ? 'bg-[#CA0410] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <FiCalendar />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold leading-tight">Bonus Days Only</div>
                                        <div className="text-[10.5px] text-slate-500 font-normal mt-0.5 truncate">Add extra days to membership</div>
                                    </div>
                                </div>

                                {/* Option 2: Wallet Cash */}
                                <div 
                                    onClick={() => setSettings(prev => ({ ...prev, referralRewardType: 'Wallet Cash' }))}
                                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 select-none ${
                                        settings.referralRewardType === 'Wallet Cash'
                                            ? 'border-[#CA0410] bg-rose-50/40 text-slate-900 shadow-2xs'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${settings.referralRewardType === 'Wallet Cash' ? 'bg-[#CA0410] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <FiCreditCard />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold leading-tight">Wallet Cash Only</div>
                                        <div className="text-[10.5px] text-slate-500 font-normal mt-0.5 truncate">Add cash credit to member wallet</div>
                                    </div>
                                </div>

                                {/* Option 3: Both */}
                                <div 
                                    onClick={() => setSettings(prev => ({ ...prev, referralRewardType: 'Both' }))}
                                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 select-none ${
                                        settings.referralRewardType === 'Both'
                                            ? 'border-[#CA0410] bg-rose-50/40 text-slate-900 shadow-2xs'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${settings.referralRewardType === 'Both' ? 'bg-[#CA0410] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <FiGift />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold leading-tight">Both (Days & Coupon Code)</div>
                                        <div className="text-[10.5px] text-slate-500 font-normal mt-0.5 truncate">Give both bonus days & coupon</div>
                                    </div>
                                </div>
                            </div>

                            {/* Referrer Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                {(settings.referralRewardType === 'Bonus Days' || settings.referralRewardType === 'Both') && (
                                    <Input 
                                        type="number" 
                                        label="Bonus Days Granted to Referrer"
                                        name="referrerBonusDays" 
                                        value={settings.referrerBonusDays || ''} 
                                        onChange={handleChange}
                                        placeholder="e.g. 7"
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
                            </div>
                        </div>

                        {/* SUB-SECTION 2: REFEREE REWARD (NEW JOINING MEMBER) */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div>
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <FiPercent className="text-[#CA0410]" /> Referee Reward (New Joining Member)
                                </h4>
                                <p className="text-[11.5px] text-slate-500 font-normal mt-0.5">Welcome incentives automatically provided on first membership enrollment</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center bg-rose-50/30 rounded-xl border border-dashed border-rose-200 space-y-1">
                        <p className="text-xs font-bold text-slate-700">Referral Program is currently disabled</p>
                        <p className="text-[11px] text-slate-400">Toggle the switch above to activate member referral rewards & wallet cash system.</p>
                    </div>
                )}
            </div>

            {/* 2. COUPON OFFERS MASTER SECTION */}
            {settings.referralProgramEnabled && (
                <>
                    <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h4 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                                    <FiTag className="text-[#CA0410]" /> Active Coupon Offers & Discount Codes
                                </h4>
                                <p className="text-[11.5px] text-slate-500 font-normal mt-0.5">
                                    Create and manage coupon codes that staff can apply during member registration or payment.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCouponModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#CA0410] hover:bg-[#a8030d] text-white font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                            >
                                <FiPlus /> Create New Coupon Offer
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {settings.couponOffers.length > 0 ? settings.couponOffers.map((c, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 hover:bg-white hover:border-[#CA0410]/50 transition-all flex flex-col justify-between space-y-3 relative group shadow-2xs">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-black text-xs text-[#CA0410] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                {c.code}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {c.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                        <h5 className="text-xs font-bold text-slate-800 pt-1">{c.title}</h5>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-900 text-xs flex flex-col gap-0.5">
                                            {c.discountValue > 0 && <span className="text-emerald-700">{c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}</span>}
                                            {c.bonusDays > 0 && <span className="text-indigo-600">+{c.bonusDays} Free Days</span>}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCoupon(c.code)}
                                                className="text-[11px] font-bold text-slate-500 hover:text-[#CA0410] underline cursor-pointer"
                                            >
                                                {c.isActive ? 'Disable' : 'Enable'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCoupon(c.code)}
                                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                                title="Delete Coupon"
                                            >
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs font-medium">
                                    No coupon offers created yet. Click "Create New Coupon Offer" to get started!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. REFERRAL ACTIVITY LOG TABLE */}
                    <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                                <h4 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                                    <FiUsers className="text-[#CA0410]" /> Recent Referral History & Wallet/Bonus Log
                                </h4>
                                <p className="text-[11.5px] text-slate-500 font-normal mt-0.5">Track awarded bonus days and wallet credits for referrals</p>
                            </div>
                            <span className="text-xs font-bold text-[#CA0410] bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                {referralHistory.length} Referrals
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
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
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-2.5 px-3 font-mono font-bold text-[#CA0410]">{ref.id}</td>
                                            <td className="py-2.5 px-3 font-bold text-slate-800">{ref.referrer}</td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-700">{ref.referee}</td>
                                            <td className="py-2.5 px-3 text-slate-500 font-normal">{ref.date}</td>
                                            <td className="py-2.5 px-3 font-bold text-emerald-700">{ref.reward}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold border ${ref.status === 'Credited' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {ref.status === 'Credited' && <FiCheckCircle size={11} />} {ref.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="py-4 text-center text-slate-400 italic font-medium">No referral history found yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
