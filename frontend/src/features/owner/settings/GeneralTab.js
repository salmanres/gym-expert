import React from 'react';
import { Link } from 'react-router-dom';
import { FiInfo, FiSettings, FiPrinter, FiMapPin } from 'react-icons/fi';
import Input from '../../../components/form/Input';

export default function GeneralTab({ settings, handleChange, handleGetCurrentLocation }) {
    return (
        <div className="space-y-6">
            {/* 1. GYM INFORMATION CARD */}
            <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center font-bold text-sm shadow-2xs">
                        <FiInfo size={15} />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 leading-none">Gym Information</h3>
                        <p className="text-[11.5px] text-slate-500 font-normal mt-1 leading-none">Basic branch identity and contact channels</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                        label="Gym Name" 
                        name="name" 
                        value={settings.name || ''} 
                        readOnly 
                        className="bg-slate-50/80 text-slate-700 cursor-not-allowed font-semibold border-slate-200" 
                    />
                    <Input 
                        label="Contact Email" 
                        name="contactEmail" 
                        value={settings.contactEmail || ''} 
                        readOnly 
                        className="bg-slate-50/80 text-slate-700 cursor-not-allowed font-semibold border-slate-200" 
                    />
                    <Input 
                        label="Contact Phone" 
                        name="contactPhone" 
                        value={settings.contactPhone || ''} 
                        readOnly 
                        className="bg-slate-50/80 text-slate-700 cursor-not-allowed font-semibold border-slate-200" 
                    />
                </div>
            </div>

            {/* 2. QR GEOFENCING SETTINGS CARD */}
            <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center font-bold text-sm shadow-2xs">
                            <FiSettings size={15} />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 leading-none">QR Geofencing Settings</h3>
                            <p className="text-[11.5px] text-slate-500 font-normal mt-1 leading-none">Limit QR attendance scanning within physical gym boundaries</p>
                        </div>
                    </div>

                    <Link 
                        to="/dashboard/owner/settings/qr" 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#CA0410] border border-rose-200 font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 w-max"
                    >
                        <FiPrinter size={13} /> Print QR Code
                    </Link>
                </div>

                {/* Red iOS-Style Toggle Switch */}
                <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                    <div className="relative inline-flex items-center">
                        <input 
                            type="checkbox" 
                            id="qrAttendanceEnabled" 
                            name="qrAttendanceEnabled" 
                            checked={settings.qrAttendanceEnabled} 
                            onChange={handleChange}
                            className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${settings.qrAttendanceEnabled ? 'bg-[#CA0410]' : 'bg-slate-200'}`}></div>
                        <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 ease-in-out shadow-sm ${settings.qrAttendanceEnabled ? 'transform translate-x-5' : ''}`}></div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                        Enable Geofenced QR Attendance
                    </span>
                </label>

                {settings.qrAttendanceEnabled && (
                    <div className="p-5 bg-rose-50/40 border border-rose-200/80 rounded-2xl space-y-4 transition-all">
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                <FiMapPin className="text-[#CA0410]" /> Location Coordinates
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input 
                                    type="number" 
                                    step="any"
                                    label="Latitude"
                                    name="latitude" 
                                    value={settings.latitude || ''} 
                                    onChange={handleChange}
                                    placeholder="e.g. 28.7041"
                                    required
                                />
                                <Input 
                                    type="number" 
                                    step="any"
                                    label="Longitude"
                                    name="longitude" 
                                    value={settings.longitude || ''} 
                                    onChange={handleChange}
                                    placeholder="e.g. 77.1025"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center">
                            <button 
                                type="button" 
                                onClick={handleGetCurrentLocation} 
                                className="text-xs font-bold text-[#CA0410] hover:text-[#9e030c] flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-rose-200 shadow-2xs hover:bg-rose-50 transition-all cursor-pointer active:scale-95"
                            >
                                <FiMapPin /> Use My Current Location
                            </button>
                        </div>

                        <div className="w-full md:w-1/2 pt-2">
                            <Input 
                                type="number" 
                                label="Allowed Range (in meters)"
                                name="qrAttendanceRange" 
                                value={settings.qrAttendanceRange || ''} 
                                onChange={handleChange}
                                min="10"
                                max="10000"
                                placeholder="50"
                                required
                            />
                            <p className="text-[11.5px] text-slate-500 font-normal mt-1 leading-tight">
                                Members must be within this distance from the gym to mark attendance successfully.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
