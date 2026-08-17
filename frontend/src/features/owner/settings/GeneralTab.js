import React from 'react';
import { Link } from 'react-router-dom';
import { FiInfo, FiSettings, FiPrinter, FiMapPin } from 'react-icons/fi';
import FormSection from '../../../components/form/FormSection';
import Input from '../../../components/form/Input';

export default function GeneralTab({ settings, handleChange, handleGetCurrentLocation }) {
    return (
        <div className="space-y-6">
            <FormSection title="Gym Information" icon={<FiInfo />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Input label="Gym Name" name="name" value={settings.name || ''} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
                <Input label="Contact Email" name="contactEmail" value={settings.contactEmail || ''} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
                <Input label="Contact Phone" name="contactPhone" value={settings.contactPhone || ''} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
            </FormSection>

            <FormSection title="QR Geofencing Settings" icon={<FiSettings />} className="grid grid-cols-1 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-2 mb-2">
                    <p className="text-sm text-slate-500">Enable QR attendance and ensure members can only mark attendance within your gym's physical range.</p>
                    <Link to="/dashboard/owner/settings/qr" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs rounded transition-colors w-max">
                        <FiPrinter /> Print QR Code
                    </Link>
                </div>
                
                <div className="flex items-center gap-3">
                    <input 
                        type="checkbox" 
                        id="qrAttendanceEnabled" 
                        name="qrAttendanceEnabled" 
                        checked={settings.qrAttendanceEnabled} 
                        onChange={handleChange}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="qrAttendanceEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Enable Geofenced QR Attendance
                    </label>
                </div>

                {settings.qrAttendanceEnabled && (
                    <div className="mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-5">
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
                        
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={handleGetCurrentLocation} className="text-sm font-bold text-indigo-600 flex items-center gap-1.5 hover:text-indigo-700">
                                <FiMapPin /> Use My Current Location
                            </button>
                        </div>

                        <div className="w-full md:w-1/2">
                            <Input 
                                type="number" 
                                label="Allowed Range (in meters)"
                                name="qrAttendanceRange" 
                                value={settings.qrAttendanceRange || ''} 
                                onChange={handleChange}
                                min="10"
                                max="10000"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">Members must be within this distance to mark attendance successfully.</p>
                        </div>
                    </div>
                )}
            </FormSection>
        </div>
    );
}
