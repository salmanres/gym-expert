import React from 'react';
import { FiAlertCircle, FiX } from 'react-icons/fi';
import Button from '../form/Button';

export default function ConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Confirm Action", 
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false 
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100">
                
                {/* Dark Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center shadow-inner shrink-0 ${
                            isDestructive ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                            <FiAlertCircle className="text-xl" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg text-white">{title}</h3>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">Confirmation required</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 bg-slate-50/50 space-y-6">
                    <p className="text-slate-700 text-sm font-medium leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
                        {message}
                    </p>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={onClose} className="w-auto px-4 py-2 text-xs">
                            {cancelText}
                        </Button>
                        <Button 
                            variant={isDestructive ? "danger" : "primary"} 
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="w-auto px-5 py-2 text-xs font-bold"
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
