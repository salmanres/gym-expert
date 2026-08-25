import React from 'react';
import { FiX, FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiActivity, FiAward, FiBriefcase } from 'react-icons/fi';

export default function ViewProfileModal({ isOpen, onClose, data, type = 'member' }) {
    if (!isOpen || !data) return null;

    const renderField = (label, value, Icon) => {
        if (!value) return null;
        return (
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 text-emerald-600 font-bold">
                    {Icon && <Icon size={14} />}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
                </div>
            </div>
        );
    };

    const name = type === 'member' ? `${data.firstName || ''} ${data.lastName || ''}`.trim() : data.name || 'Staff';
    const firstChar = name.charAt(0).toUpperCase() || 'P';
    const status = data.status || 'Active';
    const subtitle = type === 'member' 
        ? `ID: ${data.memberId || 'MEM'} • Joined: ${data.joiningDate ? new Date(data.joiningDate).toLocaleDateString() : 'N/A'}`
        : `Role: ${data.role || 'Staff'} • Added: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                
                {/* Dark Premium Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-inner shrink-0 overflow-hidden">
                            {data.profilePhoto ? (
                                <img src={data.profilePhoto} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                firstChar
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-lg text-white">{name}</h3>
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                    status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'
                                }`}>
                                    {status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 font-medium">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderField('Phone Number', data.contactNumber || data.phone, FiPhone)}
                        {renderField('Email Address', data.email, FiMail)}
                        {renderField(type === 'member' ? 'Joining Date' : 'Added On', data.joiningDate ? new Date(data.joiningDate).toLocaleDateString() : (data.createdAt ? new Date(data.createdAt).toLocaleDateString() : ''), FiCalendar)}
                        
                        {type === 'member' && (
                            <>
                                {renderField('Date of Birth', data.dob ? new Date(data.dob).toLocaleDateString() : '', FiCalendar)}
                                {renderField('Gender', data.gender, FiUser)}
                                {renderField('Blood Group', data.bloodGroup, FiActivity)}
                                {renderField('Address', data.address, FiMapPin)}
                                {renderField('Emergency Contact', data.emergencyContactName ? `${data.emergencyContactName} (${data.emergencyContactNumber})` : '', FiPhone)}
                                {renderField('Wallet Balance', `₹${data.walletBalance || 0}`, FiAward)}
                            </>
                        )}

                        {type === 'staff' && (
                            <>
                                {renderField('Role', data.role, FiBriefcase)}
                                {renderField('Wallet (Rewards)', `₹${data.walletBalance || 0}`, FiAward)}
                            </>
                        )}
                    </div>

                    {type === 'member' && (data.height || data.weight || data.bmi) && (
                        <div>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Health Metrics</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {renderField('Height (cm)', data.height, FiActivity)}
                                {renderField('Weight (kg)', data.weight, FiActivity)}
                                {renderField('BMI', data.bmi, FiActivity)}
                                {renderField('Body Fat (%)', data.bodyFat, FiActivity)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                    >
                        Close Profile
                    </button>
                </div>

            </div>
        </div>
    );
}
