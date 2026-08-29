import React from 'react';
import { 
    FiX, FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, 
    FiActivity, FiAward, FiBriefcase 
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export default function ViewProfileModal({ isOpen, onClose, data, type = 'member' }) {
    if (!isOpen || !data) return null;

    const renderField = (label, value, Icon) => {
        if (!value && value !== 0) return null;
        return (
            <div className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 text-emerald-600 font-bold shadow-2xs">
                    {Icon && <Icon size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{value}</p>
                </div>
            </div>
        );
    };

    const name = type === 'member' 
        ? `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Member'
        : data.name || 'Staff';
    const firstChar = name.charAt(0).toUpperCase() || 'P';
    const status = data.status || 'Active';
    const phone = data.contactNumber || data.phone;
    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';

    const subtitle = type === 'member' 
        ? `ID: ${data.memberId || 'MEM'} • Joined: ${data.joiningDate ? new Date(data.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`
        : `Role: ${data.role || 'Staff'} • Added: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200">
                
                {/* Clean Theme Header */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <FiUser size={18} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                                {type === 'member' ? 'Member Profile' : 'Staff Profile'}
                            </h3>
                            <p className="text-[11px] font-medium text-slate-400">Detailed account overview & information</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors border border-slate-200"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50 custom-scrollbar">
                    
                    {/* User Profile Banner */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 text-center sm:text-left">
                            <div className="relative w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 overflow-hidden ring-4 ring-emerald-50">
                                {data.profilePhoto ? (
                                    <img src={data.profilePhoto} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    firstChar
                                )}
                            </div>
                            <div>
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    <h4 className="font-black text-lg text-slate-900">{name}</h4>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                                        status === 'Active' 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : status === 'Frozen'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                        {status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-semibold mt-1">
                                    {subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Quick Contact Action Buttons */}
                        {cleanPhone && (
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={`tel:${cleanPhone}`}
                                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all border border-emerald-200 flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                                    title="Call Member"
                                >
                                    <FiPhone size={14} />
                                    <span>Call</span>
                                </a>
                                <a
                                    href={`https://wa.me/91${cleanPhone}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 text-xs font-bold"
                                    title="WhatsApp Member"
                                >
                                    <FaWhatsapp size={14} />
                                    <span>WhatsApp</span>
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Basic Info Section */}
                    <div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <FiUser className="text-emerald-500" /> Basic Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {renderField('Phone Number', phone, FiPhone)}
                            {renderField('Email Address', data.email, FiMail)}
                            {renderField(type === 'member' ? 'Joining Date' : 'Added On', data.joiningDate ? new Date(data.joiningDate).toLocaleDateString('en-IN') : (data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN') : ''), FiCalendar)}
                            
                            {type === 'member' && (
                                <>
                                    {renderField('Date of Birth', data.dob ? new Date(data.dob).toLocaleDateString('en-IN') : '', FiCalendar)}
                                    {renderField('Gender', data.gender, FiUser)}
                                    {renderField('Blood Group', data.bloodGroup, FiActivity)}
                                    {renderField('Address', data.address, FiMapPin)}
                                    {renderField('Emergency Contact', data.emergencyContactName ? `${data.emergencyContactName} (${data.emergencyContactNumber || ''})` : '', FiPhone)}
                                    {renderField('Wallet Balance', `₹${data.walletBalance || 0}`, FiAward)}
                                </>
                            )}

                            {type === 'staff' && (
                                <>
                                    {renderField('Role', data.role, FiBriefcase)}
                                    {renderField('Wallet Balance', `₹${data.walletBalance || 0}`, FiAward)}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Health Metrics Section for Members */}
                    {type === 'member' && (data.height || data.weight || data.bmi || data.bodyFat) && (
                        <div>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <FiActivity className="text-emerald-500" /> Health & Fitness Metrics
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {renderField('Height', data.height ? `${data.height} cm` : '', FiActivity)}
                                {renderField('Weight', data.weight ? `${data.weight} kg` : '', FiActivity)}
                                {renderField('BMI', data.bmi, FiActivity)}
                                {renderField('Body Fat', data.bodyFat ? `${data.bodyFat}%` : '', FiActivity)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                    >
                        Close Profile
                    </button>
                </div>

            </div>
        </div>
    );
}
