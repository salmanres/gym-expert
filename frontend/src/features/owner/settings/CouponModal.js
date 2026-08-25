import React from 'react';
import { FiTag, FiX } from 'react-icons/fi';

export default function CouponModal({ showCouponModal, setShowCouponModal, newCoupon, setNewCoupon, handleAddCoupon }) {
    if (!showCouponModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100">
                
                {/* Dark Premium Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-inner shrink-0">
                            <FiTag className="text-xl" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-lg text-white">Create New Offer</h3>
                            </div>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">
                                Custom discount codes & promotional offers
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setShowCouponModal(false)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleAddCoupon} className="p-6 space-y-4 bg-slate-50/50">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code (Uppercase)</label>
                        <input 
                            type="text"
                            value={newCoupon.code}
                            onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="e.g. FESTIVE500, SUMMER20"
                            required
                            className="w-full h-10 px-3 text-xs font-mono font-bold uppercase text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                            className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                            <select
                                value={newCoupon.discountType}
                                onChange={(e) => setNewCoupon(prev => ({ ...prev, discountType: e.target.value }))}
                                className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
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
                                className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
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
                            className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setShowCouponModal(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                        >
                            Add Coupon Offer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
