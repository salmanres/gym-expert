import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { FiX, FiMaximize, FiCamera } from 'react-icons/fi';

export default function StaffCheckIn({ onClose, onSuccess }) {
    const [status, setStatus] = useState('Scanning...');
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "staff-qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        const onScanSuccess = async (decodedText, decodedResult) => {
            if (scanned) return; // Prevent multiple scans
            
          
            if (decodedText.includes('/checkin/')) {
                setScanned(true);
                scanner.clear();
                setStatus('Verifying Location & Checking In...');

                const parts = decodedText.split('/checkin/');
                const scannedGymId = parts[1];

                const userStr = localStorage.getItem('user');
                const user = userStr ? JSON.parse(userStr) : null;

                if (!user || !user.gym || user.gym !== scannedGymId && user.gym._id !== scannedGymId) {
                    setStatus('Error: QR Code does not match your assigned gym.');
                    toast.error('Invalid QR Code for your gym.');
                    return;
                }

                if (!navigator.geolocation) {
                    setStatus('Error: Geolocation not supported.');
                    toast.error('Geolocation is not supported by your browser.');
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            const res = await apiClient.post('/attendance/mark', {
                                source: 'QR',
                                latitude,
                                longitude
                            });
                            setStatus(`Success: ${res.data.message}`);
                            toast.success(res.data.message);
                            setTimeout(() => {
                                if (onSuccess) onSuccess();
                                onClose();
                            }, 1500);
                        } catch (error) {
                            setStatus('Error: ' + (error.response?.data?.message || 'Check-in failed.'));
                            toast.error(error.response?.data?.message || 'Check-in failed.');
                            // Allow rescanning after error
                            setTimeout(() => setScanned(false), 3000);
                        }
                    },
                    (err) => {
                        setStatus('Error: Location access denied or unavailable.');
                        toast.error('Location permission is required for QR Check-In.');
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                toast.warning('Invalid QR code scanned.');
            }
        };

        const onScanFailure = (error) => {
            // Ignore scan failures (happens constantly while waiting for a valid QR)
        };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [scanned, onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col">
                <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FiCamera className="text-xl" />
                        <h3 className="font-bold text-lg">Staff Check-In</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
                        <FiX className="text-xl" />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                    {!scanned && (
                        <div className="mb-4 text-center">
                            <p className="text-sm text-slate-500 font-medium">Point your camera at the Gym's Check-In QR Code</p>
                        </div>
                    )}
                    
                    <div id="staff-qr-reader" className="w-full max-w-[300px] overflow-hidden rounded-xl border-2 border-slate-100 shadow-inner"></div>
                    
                    <div className="mt-6 text-center">
                        <p className={`font-bold text-sm ${status.startsWith('Error') ? 'text-rose-500' : status.startsWith('Success') ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {status}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
