import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import Loader from '../../components/page/Loader';
import FormSection from '../../components/form/FormSection';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { FiSettings, FiMapPin, FiInfo, FiPrinter } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function GymSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [settings, setSettings] = useState({
        name: '',
        contactEmail: '',
        contactPhone: '',
        latitude: '',
        longitude: '',
        qrAttendanceEnabled: false,
        qrAttendanceRange: 50
    });

    useEffect(() => {
        const fetchGym = async () => {
            try {
                const res = await apiClient.get('/gyms/my-gym');
                setSettings({
                    name: res.data.name || '',
                    contactEmail: res.data.contactEmail || '',
                    contactPhone: res.data.contactPhone || '',
                    latitude: res.data.latitude || '',
                    longitude: res.data.longitude || '',
                    qrAttendanceEnabled: res.data.qrAttendanceEnabled || false,
                    qrAttendanceRange: res.data.qrAttendanceRange || 50
                });
                setLoading(false);
            } catch (error) {
                console.error("Fetch gym error:", error);
                toast.error("Failed to load gym settings");
                setLoading(false);
            }
        };

        fetchGym();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setSettings(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                toast.success("Location updated successfully!");
            },
            (error) => {
                console.error("Error getting location", error);
                toast.error("Unable to retrieve your location");
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.put('/gyms/my-gym', {
                latitude: settings.latitude,
                longitude: settings.longitude,
                qrAttendanceEnabled: settings.qrAttendanceEnabled,
                qrAttendanceRange: settings.qrAttendanceRange
            });
            toast.success("Settings saved successfully!");
        } catch (error) {
            console.error("Update gym error:", error);
            toast.error("Failed to update gym settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader text="Loading settings..." />;

    return (
        <PageLayout>
            <PageHeader 
                title="Gym Settings" 
                subtitle="Manage your gym's configuration and QR attendance settings."
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
                        <FormSection title="Gym Information" icon={<FiInfo />} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <Input label="Gym Name" name="name" value={settings.name || ''} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed font-medium" />
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

                        <div className="flex flex-col sm:flex-row justify-end items-center w-full gap-3 mt-4 pt-6 border-t border-slate-200">
                            <Button type="submit" loading={saving} className="w-full sm:w-auto px-8">
                                Save Settings
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PageLayout>
    );
}
