import React from 'react';
import { FiGift, FiAward, FiPercent, FiCalendar, FiCreditCard, FiTag, FiPlus, FiTrash2, FiUsers, FiCheckCircle } from 'react-icons/fi';
import FormSection from '../../../components/form/FormSection';
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
    );
}
