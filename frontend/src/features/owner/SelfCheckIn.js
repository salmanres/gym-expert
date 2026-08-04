import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiMapPin, FiCheckCircle, FiLoader, FiSmartphone, FiXCircle, FiLock } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import Button from '../../components/form/Button';
import Input from '../../components/form/Input';

export default function SelfCheckIn() {
    const { gymId } = useParams();
    
    // UI States: 'init', 'phone', 'otp', 'loading', 'success', 'error'
    const [uiState, setUiState] = useState('init');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [memberName, setMemberName] = useState('');

    const [attendanceStatus, setAttendanceStatus] = useState('none');

    useEffect(() => {
        const token = localStorage.getItem(`deviceToken_${gymId}`);
        if (token) {
            checkStatus(token);
        } else {
            setUiState('phone'); // Needs phone number
        }
    }, [gymId]);

    const checkStatus = async (token) => {
        setUiState('loading');
        try {
            const res = await apiClient.get(`/attendance/status/${gymId}/${token}`);
            setAttendanceStatus(res.data.status); // 'none', 'checked_in', 'checked_out'
            setMemberName(res.data.memberName || '');
            setUiState('init');
        } catch (error) {
            if (error.response?.data?.requiresReauth) {
                localStorage.removeItem(`deviceToken_${gymId}`);
                setUiState('phone');
            } else {
                setUiState('init'); // fallback to init if there's a non-auth error
            }
        }
    };

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        if (!phone || phone.length < 10) {
            toast.error("Please enter a valid phone number.");
            return;
        }

        setUiState('loading');
        try {
            const res = await apiClient.post(`/attendance/request-otp`, { gymId, phone });
            toast.success(res.data.message);
            // In dev mode, log the mock OTP and show it in a toast
            console.log("Mock OTP:", res.data.mockOtp);
            if (res.data.mockOtp) {
                toast.info(`Mock OTP : ${res.data.mockOtp}`, { autoClose: false });
            }
            setUiState('otp');
            setMessage('');
        } catch (error) {
            setUiState('phone');
            setMessage(error.response?.data?.message || 'Failed to send OTP. Please try again.');
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (!otp || otp.length < 6) {
            toast.error("Please enter a valid 6-digit OTP.");
            return;
        }

        setUiState('loading');
        try {
            const res = await apiClient.post(`/attendance/verify-otp`, { 
                gymId, 
                phone, 
                otp,
                browserFingerprint: navigator.userAgent
            });
            
            localStorage.setItem(`deviceToken_${gymId}`, res.data.deviceToken);
            setMemberName(res.data.memberName || '');
            
            // Now proceed to mark attendance
            performCheckIn(res.data.deviceToken);
        } catch (error) {
            setUiState('otp');
            setMessage(error.response?.data?.message || 'Invalid OTP. Please try again.');
        }
    };

    const handleDirectCheckIn = () => {
        const token = localStorage.getItem(`deviceToken_${gymId}`);
        if (!token) {
            setUiState('phone');
            return;
        }
        performCheckIn(token);
    };

    const performCheckIn = (deviceToken) => {
        setUiState('loading');
        
        if (!navigator.geolocation) {
            setUiState('error');
            setMessage('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await apiClient.post(`/attendance/self-checkin`, {
                        gymId,
                        deviceToken,
                        latitude,
                        longitude,
                        fingerprint: navigator.userAgent
                    });
                    
                    setMemberName(res.data.memberName || memberName || '');
                    const isOut = res.data.type === 'checkout';
                    setIsCheckingOut(isOut);
                    setAttendanceStatus(isOut ? 'checked_out' : 'checked_in');
                    setUiState('success');
                    setMessage(res.data.message);
                } catch (error) {
                    setUiState('error');
                    const errorMsg = error.response?.data?.message || 'Check-in failed.';
                    setMessage(errorMsg);
                    
                    if (error.response?.data?.requiresReauth) {
                        localStorage.removeItem(`deviceToken_${gymId}`);
                        setTimeout(() => setUiState('phone'), 3000); // go back to phone after a bit
                    }
                }
            },
            (err) => {
                setUiState('error');
                if (err.code === 1) {
                    setMessage("Location permission denied. We need your GPS location to verify you are at the gym.");
                } else {
                    setMessage("Failed to get your location. Please check your GPS signal.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const resetFlow = () => {
        if (localStorage.getItem(`deviceToken_${gymId}`)) {
            setUiState('init');
        } else {
            setUiState('phone');
        }
        setPhone('');
        setOtp('');
        setMessage('');
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
            <ToastContainer theme="dark" position="top-center" />
            
            {/* Animated Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col z-10 transition-all duration-500">
                
                {/* Header Area */}
                <div className="p-8 pb-4 text-center relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] text-white transform hover:scale-105 transition-transform">
                        <FiMapPin className="text-2xl" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase">Gym Check-In</h1>
                    {uiState === 'init' && <p className="text-slate-400 text-sm font-medium mt-1">Ready to mark your attendance</p>}
                    {uiState === 'phone' && <p className="text-slate-400 text-sm font-medium mt-1">Enter your registered phone number</p>}
                    {uiState === 'otp' && <p className="text-slate-400 text-sm font-medium mt-1">Verify your phone number</p>}
                </div>

                <div className="p-8 pt-4 flex flex-col justify-center relative">
                    {message && uiState !== 'success' && uiState !== 'loading' && (
                        <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-2xl text-sm font-bold flex gap-3 shadow-sm backdrop-blur-sm">
                            <FiXCircle className="shrink-0 text-lg mt-0.5" />
                            <span>{message}</span>
                        </div>
                    )}

                    {uiState === 'init' && (
                        <div className="text-center space-y-6">
                            {memberName && (
                                <h2 className="text-xl font-bold text-white mb-2">Hello, <span className="text-emerald-400">{memberName}</span></h2>
                            )}
                            
                            {attendanceStatus === 'none' && (
                                <button 
                                    onClick={handleDirectCheckIn}
                                    className="w-full py-5 rounded-2xl font-black text-lg text-slate-900 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transform transition-all flex items-center justify-center gap-2"
                                >
                                    <FiMapPin className="text-xl" />
                                    Tap to Check In
                                </button>
                            )}

                            {attendanceStatus === 'checked_in' && (
                                <button 
                                    onClick={handleDirectCheckIn}
                                    className="w-full py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-[0_0_40px_rgba(245,158,11,0.4)] active:scale-95 transform transition-all flex items-center justify-center gap-2"
                                >
                                    <FiMapPin className="text-xl" />
                                    Tap to Check Out
                                </button>
                            )}

                            {attendanceStatus === 'checked_out' && (
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                                    <p className="text-emerald-400 text-base font-bold flex items-center justify-center gap-2">
                                        <FiCheckCircle className="text-xl" />
                                        Attendance Completed
                                    </p>
                                </div>
                            )}

                            <p className="text-center text-[11px] font-bold text-slate-500 mt-4 tracking-wider uppercase">
                                Requires GPS Location Access
                            </p>
                            <button 
                                onClick={() => {
                                    localStorage.removeItem(`deviceToken_${gymId}`);
                                    setUiState('phone');
                                }}
                                className="text-sm text-slate-400 hover:text-white font-medium mt-6 transition-colors"
                            >
                                Not you? Change account
                            </button>
                        </div>
                    )}

                    {uiState === 'phone' && (
                        <form onSubmit={handleRequestOTP} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="e.g. 9876543210"
                                    className="w-full py-4 px-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all placeholder:text-slate-600"
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 rounded-2xl font-black text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 transform transition-all"
                            >
                                Send OTP
                            </button>
                        </form>
                    )}

                    {uiState === 'otp' && (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">6-Digit OTP</label>
                                <input
                                    type="number"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full py-4 px-5 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-2xl tracking-[0.5em] text-center focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all placeholder:text-slate-700"
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 rounded-2xl font-black text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 transform transition-all"
                            >
                                Verify & Check In
                            </button>

                            <button 
                                type="button"
                                onClick={() => { setUiState('phone'); setOtp(''); }}
                                className="w-full text-sm text-slate-400 font-medium hover:text-white text-center mt-2 transition-colors"
                            >
                                Change Phone Number
                            </button>
                        </form>
                    )}

                    {uiState === 'loading' && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                                <FiMapPin className="text-emerald-500 text-xl animate-pulse" />
                            </div>
                            <p className="text-slate-400 font-medium animate-pulse text-sm">Processing...</p>
                        </div>
                    )}

                    {uiState === 'error' && (
                        <div className="py-6 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner relative backdrop-blur-md">
                                <FiXCircle className="text-4xl text-rose-500 relative z-10" />
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight mb-2">Check-in Failed</h2>
                            <p className="text-slate-400 mb-8 text-sm">{message}</p>
                            
                            <button 
                                onClick={resetFlow}
                                className="font-bold text-sm text-slate-900 bg-white hover:bg-slate-200 w-full py-4 rounded-2xl transition-all active:scale-95"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {uiState === 'success' && (
                        <div className="py-6 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner relative backdrop-blur-md">
                                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                                <FiCheckCircle className="text-4xl text-emerald-400 relative z-10" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Success!</h2>
                            <p className="text-slate-300 mt-2 font-medium text-base">
                                {isCheckingOut ? 'Goodbye' : 'Welcome'}, <span className="font-bold text-emerald-400">{memberName}</span>!
                            </p>
                            <p className="text-slate-500 mt-1 text-xs">{message}</p>
                            
                            <button 
                                onClick={resetFlow}
                                className="mt-8 font-bold text-sm text-slate-900 bg-emerald-400 hover:bg-emerald-300 w-full py-4 rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                            >
                                Back to Home
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
