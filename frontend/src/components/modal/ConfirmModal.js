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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all scale-100 opacity-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                            <FiAlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                        <FiX size={20} />
                    </button>
                </div>
                
                <p className="text-slate-600 text-sm mb-6 ml-14">
                    {message}
                </p>

                <div className="flex justify-end gap-3 mt-8">
                    <Button variant="secondary" onClick={onClose} className="w-auto">
                        {cancelText}
                    </Button>
                    <Button 
                        variant={isDestructive ? "danger" : "primary"} 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="w-auto"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
