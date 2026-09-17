import React from 'react';
import { FiTag } from 'react-icons/fi';
import Modal from '../../../components/modal/Modal';

export default function CouponModal({ showCouponModal, setShowCouponModal, newCoupon, setNewCoupon, handleAddCoupon }) {
    if (!showCouponModal) return null;

    return (
        <Modal
            isOpen={showCouponModal}
            onClose={() => setShowCouponModal(false)}
            title="Create New Offer"
            subtitle="Custom discount codes & promotional offers"
            icon={FiTag}
            maxWidth="max-w-md"
            footer={
                <>
                    <button
                        type="button"
                        onClick={() => setShowCouponModal(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="couponForm"
                        className="px-5 py-2 text-xs font-extrabold text-white bg-[#CA0410] hover:bg-[#b0030e] rounded-xl transition-colors shadow-xs cursor-pointer"
                    >
                        Add Coupon Offer
                    </button>
                </>
            }
        >
            <form id="couponForm" onSubmit={handleAddCoupon} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code (Uppercase)</label>
                    <input 
                        type="text"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. FESTIVE500, SUMMER20"
                        required
                        className="w-full h-10 px-3 text-xs font-mono font-bold uppercase text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#CA0410] focus:ring-1 focus:ring-[#CA0410]/20"
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
                        className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#CA0410] focus:ring-1 focus:ring-[#CA0410]/20"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                        <select
                            value={newCoupon.discountType}
                            onChange={(e) => setNewCoupon(prev => ({ ...prev, discountType: e.target.value }))}
                            className="w-full h-10 px-3 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-[#CA0410] bg-white"
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
                            className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#CA0410]"
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
                        className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#CA0410]"
                    />
                </div>
            </form>
        </Modal>
    );
}
