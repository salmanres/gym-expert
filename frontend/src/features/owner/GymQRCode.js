import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import { FiPrinter, FiMapPin, FiSettings } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import Loader from '../../components/page/Loader';

export default function GymQRCode() {
    const [gym, setGym] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGym = async () => {
            try {
                const res = await apiClient.get('/gyms/my-gym');
                setGym(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchGym();
    }, []);

    const checkInUrl = `${window.location.origin}/checkin/${gym?._id}`;

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Loader />;

    return (
        <PageLayout>
            <PageHeader 
                title="Gym QR Code" 
                subtitle="Print and display this QR Code at your reception for self check-in."
                action={
                    <button onClick={handlePrint} className="print:hidden flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors">
                        <FiPrinter /> Print QR Code
                    </button>
                }
            />

            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto print:p-0 print:overflow-visible flex flex-col items-center justify-center">
                
                {!gym?.qrAttendanceEnabled && (
                    <div className="print:hidden w-full max-w-xl mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm">
                        <FiSettings className="shrink-0 mt-0.5 text-lg" />
                        <div>
                            <p className="font-bold text-sm">QR Attendance is Disabled!</p>
                            <p className="text-xs mt-1">Members cannot check in right now. Please enable it in your Gym Settings.</p>
                            <Link to="/dashboard/owner/settings" className="mt-2 inline-block text-xs font-bold bg-white text-rose-700 border border-rose-200 px-3 py-1.5 rounded hover:bg-rose-100 transition-colors">Go to Settings</Link>
                        </div>
                    </div>
                )}

                <div className="bg-white border-2 border-slate-200 p-12 rounded-2xl shadow-xl flex flex-col items-center text-center print:border-none print:shadow-none print:w-full">
                    <div className="w-24 h-24 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <span className="font-black text-3xl tracking-tighter">GYM</span>
                    </div>
                    
                    <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">{gym?.name}</h2>
                    <p className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-sm">Self Check-In Station</p>

                    <div className="p-4 bg-white border-4 border-slate-900 rounded-xl shadow-lg relative">
                        <QRCodeSVG 
                            value={checkInUrl} 
                            size={256} 
                            bgColor={"#ffffff"}
                            fgColor={"#0f172a"}
                            level={"H"}
                        />
                    </div>

                    <div className="mt-8 mb-4 max-w-xs mx-auto">
                        <p className="font-bold text-slate-800 text-xl mb-2">How to check in?</p>
                        <ol className="text-sm font-medium text-slate-600 text-left space-y-2 list-decimal list-inside">
                            <li>Open your phone's Camera</li>
                            <li>Scan this QR Code</li>
                            <li>Allow Location access</li>
                            <li>Tap "Check In"</li>
                        </ol>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                        <FiMapPin className="text-sm" />
                        <span>GPS Verification Active</span>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    nav, header, .print\\:hidden { display: none !important; }
                }
            `}</style>
        </PageLayout>
    );
}
