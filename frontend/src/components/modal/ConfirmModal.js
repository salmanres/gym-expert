import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import AppModal from '../form/AppModal';
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
    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            subtitle="Confirmation required"
            icon={FiAlertCircle}
            maxWidth="sm:max-w-md"
            headerBg="bg-slate-900"
            headerTextColor="text-white"
        >
            <div className="space-y-6">
                <p className="text-slate-700 text-sm font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
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
        </AppModal>
    );
}
