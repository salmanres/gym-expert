import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';
import { FiPrinter, FiMapPin, FiSettings, FiCamera, FiSmartphone, FiCheckCircle, FiShield, FiArrowRight } from 'react-icons/fi';
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
                console.error("Failed to fetch gym data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGym();
    }, []);

    const checkInUrl = gym?._id ? `${window.location.origin}/checkin/${gym._id}` : `${window.location.origin}`;

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Loader text="Loading QR Code..." />;

    return (
        <PageLayout>
            <PageHeader 
                title="Gym Check-In QR" 
                subtitle="Print and display this QR Code at your reception desk for instant member & staff self check-in."
                action={
                    <button 
                        onClick={handlePrint} 
                        className="print:hidden flex items-center gap-2 bg-[#CA0410] hover:bg-[#b0030e] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all hover:shadow-lg active:scale-95 cursor-pointer"
                    >
                        <FiPrinter className="text-base" /> Print QR Standee
                    </button>
                }
            />

            <div className="relative flex-1 overflow-y-auto print:p-0 print:bg-white print:overflow-visible bg-[#FAEEEF] flex flex-col items-center justify-start print:justify-center p-4 sm:p-8">
                
                {/* Geofence Disabled Warning Alert */}
                {!gym?.qrAttendanceEnabled && (
                    <div className="print:hidden w-full max-w-lg mb-6 bg-white border border-rose-200 text-slate-800 p-4 rounded-2xl flex items-start gap-3.5 shadow-2xs">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#CA0410] flex items-center justify-center shrink-0 border border-rose-200/60 shadow-2xs">
                            <FiSettings size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm text-[#CA0410]">QR Attendance is Currently Disabled</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Members and staff cannot check in via QR code until geofencing is enabled.</p>
                            <Link 
                                to="/dashboard/owner/settings" 
                                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold bg-[#CA0410] text-white px-3.5 py-1.5 rounded-lg shadow-2xs hover:bg-[#b0030e] transition-all cursor-pointer"
                            >
                                Enable in Gym Settings <FiArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                )}

                {/* THEMED QR STANDEE POSTER CARD */}
                <div className="w-full max-w-md bg-white border border-rose-200/90 rounded-[28px] shadow-xl overflow-hidden flex flex-col items-center text-center print:border-none print:shadow-none print:w-full print:max-w-none print:p-0">
                    
                    {/* Standee Header with Gradient Theme */}
                    <div 
                        className="w-full px-6 py-6 text-white flex flex-col items-center justify-center relative overflow-hidden select-none"
                        style={{ background: 'linear-gradient(135deg, #07101A 0%, #1c0b11 50%, #A5151B 100%)' }}
                    >
                        {/* Gym Logo / Avatar */}
                        {gym?.logo ? (
                            <img 
                                src={gym.logo} 
                                alt={gym.name} 
                                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-lg mb-3" 
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-black text-2xl shadow-lg mb-3">
                                {gym?.name?.charAt(0) || 'G'}
                            </div>
                        )}

                        <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight">
                            {gym?.name || 'Gym Center'}
                        </h2>
                        
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-rose-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Self Check-In Station
                        </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="p-6 sm:p-8 w-full flex flex-col items-center bg-white">
                        
                        <div className="p-4 bg-white border-2 border-rose-200/80 rounded-2xl shadow-md relative group">
                            <QRCodeSVG 
                                value={checkInUrl} 
                                size={220} 
                                bgColor={"#ffffff"}
                                fgColor={"#0f172a"}
                                level={"H"}
                                className="rounded-lg"
                            />
                        </div>

                        <p className="text-xs font-bold text-slate-500 mt-4 tracking-wide uppercase">
                            Scan with camera to mark attendance
                        </p>

                        {/* Step-by-Step Instructions */}
                        <div className="mt-6 w-full bg-[#FAEEEF]/60 border border-rose-200/60 p-4 rounded-2xl text-left">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <FiSmartphone className="text-[#CA0410]" /> How to check in:
                            </h4>
                            <ol className="space-y-2 text-xs text-slate-600 font-medium">
                                <li className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-[#CA0410] text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                                    <span>Open your phone's <b>Camera</b> or QR Scanner</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-[#CA0410] text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                                    <span>Point camera at this <b>QR Code</b></span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-[#CA0410] text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                                    <span>Allow <b>Location Permission</b> when prompted</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-[#CA0410] text-white font-bold text-[10px] flex items-center justify-center shrink-0">4</span>
                                    <span>Tap <b>"Check In"</b> to complete attendance</span>
                                </li>
                            </ol>
                        </div>

                        {/* GPS Geofence Security Badge */}
                        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200/80 w-full shadow-2xs">
                            <FiShield className="text-sm shrink-0 text-emerald-600" />
                            <span>GPS Geofenced • Safe & Secure Check-In</span>
                        </div>

                    </div>

                    {/* Standee Footer Branding */}
                    <div className="w-full bg-slate-50 border-t border-rose-100 py-3 px-4 text-[11px] font-semibold text-slate-400 text-center">
                        Powered by Gym Chalak Smart Reception
                    </div>

                </div>

            </div>

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
                    nav, header, .print\\:hidden { display: none !important; }
                }
            `}</style>
        </PageLayout>
    );
}
