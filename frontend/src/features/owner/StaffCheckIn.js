import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { FiCamera } from 'react-icons/fi';
import Modal from '../../components/modal/Modal';

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

                if (!user || !user.gym || (user.gym !== scannedGymId && user.gym._id !== scannedGymId)) {
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
            // Ignore scan failures
        };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [scanned, onClose, onSuccess]);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Scan QR to Check In"
            subtitle="Point your camera at the gym's attendance QR code"
            icon={FiCamera}
            maxWidth="max-w-md"
        >
            <div className="flex flex-col items-center justify-center p-2 min-h-[280px]">
                <div id="staff-qr-reader" className="w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-rose-100 shadow-inner"></div>
                
                <div className="mt-4 text-center">
                    <p className={`font-bold text-xs ${
                        status.startsWith('Error') 
                            ? 'text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200' 
                            : status.startsWith('Success') 
                                ? 'text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200' 
                                : 'text-slate-600'
                    }`}>
                        {status}
                    </p>
                </div>
            </div>
        </Modal>
    );
}
