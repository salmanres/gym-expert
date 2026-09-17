import React from 'react';
import { 
    FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, 
    FiActivity, FiAward, FiBriefcase 
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Modal from './Modal';
import { formatDate } from '../../utils/dateUtils';

export default function ViewProfileModal({ isOpen, onClose, data, type = 'member' }) {
    if (!isOpen || !data) return null;

    const renderField = (label, value, Icon) => {
        if (!value && value !== 0) return null;
        return (
            <div className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200 text-[#CA0410] font-bold shadow-2xs">
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
        ? `ID: ${data.memberId || 'MEM'} • Joined: ${formatDate(data.joiningDate, 'N/A')}`
        : `Role: ${data.role || 'Staff'} • Added: ${formatDate(data.createdAt, 'N/A')}`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={name}
            subtitle={subtitle}
            avatarText={data.profilePhoto ? null : firstChar}
            avatarBg="bg-[#CA0410]"
            badge={
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    status === 'Active' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : status === 'Frozen'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                }`}>
                    {status}
                </span>
            }
            maxWidth="max-w-2xl"
            bodyClassName="space-y-6 bg-slate-50/50 p-6"
            footer={
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                    Close Profile
                </button>
            }
        >
            {/* Quick Action Contact Banner */}
            {cleanPhone && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Contact directly:</span>
                        <span className="text-xs font-black text-slate-900">{phone}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href={`tel:${cleanPhone}`}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 text-xs font-bold shadow-2xs"
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
                </div>
            )}

            {/* Basic Info Section */}
            <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FiUser className="text-[#CA0410]" /> Basic Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderField('Phone Number', phone, FiPhone)}
                    {renderField('Email Address', data.email, FiMail)}
                    {renderField(type === 'member' ? 'Joining Date' : 'Added On', formatDate(data.joiningDate || data.createdAt), FiCalendar)}
                    
                    {type === 'member' && (
                        <>
                            {renderField('Date of Birth', formatDate(data.dob), FiCalendar)}
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
                        <FiActivity className="text-[#CA0410]" /> Health & Fitness Metrics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {renderField('Height', data.height ? `${data.height} cm` : '', FiActivity)}
                        {renderField('Weight', data.weight ? `${data.weight} kg` : '', FiActivity)}
                        {renderField('BMI', data.bmi, FiActivity)}
                        {renderField('Body Fat', data.bodyFat ? `${data.bodyFat}%` : '', FiActivity)}
                    </div>
                </div>
            )}
        </Modal>
    );
}
