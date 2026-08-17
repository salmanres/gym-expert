import React from 'react';
import { FiTag, FiX } from 'react-icons/fi';

export default function CouponModal({ showCouponModal, setShowCouponModal, newCoupon, setNewCoupon, handleAddCoupon }) {
    if (!showCouponModal) return null;

    return (
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
    );
}
