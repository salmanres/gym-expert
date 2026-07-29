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
        <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black flex flex-col items-center justify-center p-0 sm:p-6">
            <ToastContainer theme="dark" position="top-center" />
            
            <div className="w-full max-w-md bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col min-h-screen sm:min-h-[600px]">
                
                <div className="bg-emerald-600 p-8 text-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-16 bg-emerald-500 rounded-full opacity-50 transform translate-x-10 -translate-y-10 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 p-12 bg-emerald-700 rounded-full opacity-50 transform -translate-x-8 translate-y-8 blur-lg"></div>
                    
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-emerald-600">
                            <FiMapPin className="text-3xl" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Gym Check-In</h1>
                        {uiState === 'init' && <p className="text-emerald-100 text-sm font-medium mt-1">Ready to mark your attendance</p>}
                        {uiState === 'phone' && <p className="text-emerald-100 text-sm font-medium mt-1">Please enter your registered phone number</p>}
                        {uiState === 'otp' && <p className="text-emerald-100 text-sm font-medium mt-1">Verify your phone number</p>}
                    </div>
                </div>

                <div className="p-8 flex-1 flex flex-col justify-center bg-white">
                    {message && uiState !== 'success' && uiState !== 'loading' && (
                        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-bold flex gap-3 shadow-sm">
                            <FiXCircle className="shrink-0 text-lg mt-0.5" />
                            <span>{message}</span>
                        </div>
                    )}

                    {uiState === 'init' && (
                        <div className="text-center space-y-6">
                            {memberName && (
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Hello, {memberName}</h2>
                            )}
                            
                            {attendanceStatus === 'none' && (
                                <Button 
                                    onClick={handleDirectCheckIn}
                                    fullWidth
                                    className="!py-5 !rounded-xl !font-black !text-xl shadow-lg active:scale-95 transform hover:-translate-y-1"
                                    icon={<FiMapPin />}
                                >
                                    Tap to Check In
                                </Button>
                            )}

                            {attendanceStatus === 'checked_in' && (
                                <Button 
                                    onClick={handleDirectCheckIn}
                                    variant="danger"
                                    fullWidth
                                    className="!py-5 !rounded-xl !font-black !text-xl shadow-lg active:scale-95 transform hover:-translate-y-1 !bg-amber-500 hover:!bg-amber-600"
                                    icon={<FiMapPin />}
                                >
                                    Tap to Check Out
                                </Button>
                            )}

                            {attendanceStatus === 'checked_out' && (
                                <div className="bg-slate-100 rounded-xl p-5 border border-slate-200">
                                    <p className="text-slate-600 font-bold flex items-center justify-center gap-2">
                                        <FiCheckCircle className="text-emerald-500 text-xl" />
                                        Attendance Completed Today
                                    </p>
                                </div>
                            )}

                            <p className="text-center text-xs font-bold text-slate-400">
                                Requires Location Access
                            </p>
                            <button 
                                onClick={() => {
                                    localStorage.removeItem(`deviceToken_${gymId}`);
                                    setUiState('phone');
                                }}
                                className="text-xs text-rose-500 hover:underline font-bold mt-4"
                            >
                                Not you? Change account
                            </button>
                        </div>
                    )}

                    {uiState === 'phone' && (
                        <form onSubmit={handleRequestOTP} className="space-y-6">
                            <Input
                                label="Phone Number"
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="e.g. 9876543210"
                                className="!py-3 !text-lg !font-bold"
                            />

                            <Button 
                                type="submit"
                                fullWidth
                                className="!py-4 !rounded-xl !font-black !text-lg shadow-lg active:scale-95 !bg-slate-900 hover:!bg-slate-800"
                            >
                                Send OTP
                            </Button>
                        </form>
                    )}

                    {uiState === 'otp' && (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <Input
                                label="6-Digit OTP"
                                type="number"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter OTP"
                                className="!py-3 !text-lg !font-bold tracking-widest text-center"
                            />

                            <Button 
                                type="submit"
                                fullWidth
                                className="!py-4 !rounded-xl !font-black !text-lg shadow-lg active:scale-95"
                            >
                                Verify & Check In
                            </Button>

                            <button 
                                type="button"
                                onClick={() => { setUiState('phone'); setOtp(''); }}
                                className="w-full text-sm text-slate-500 font-bold hover:text-slate-700 text-center"
                            >
                                Change Phone Number
                            </button>
                        </form>
                    )}

                    {uiState === 'loading' && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                            <FiLoader className="text-4xl text-emerald-500 animate-spin" />
                            <p className="text-slate-600 font-bold animate-pulse text-lg">Processing...</p>
                        </div>
                    )}

                    {uiState === 'error' && (
                        <div className="py-8 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                                <FiXCircle className="text-5xl text-rose-600 relative z-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Check-in Failed</h2>
                            <p className="text-slate-500 mb-6">{message}</p>
                            
                            <button 
                                onClick={resetFlow}
                                className="font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-6 py-3 rounded-xl transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {uiState === 'success' && (
                        <div className="py-8 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                                <FiCheckCircle className="text-5xl text-emerald-600 relative z-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Success!</h2>
                            <p className="text-slate-600 mt-2 font-medium text-lg">
                                {isCheckingOut ? 'Goodbye' : 'Welcome'}, <span className="font-bold text-emerald-600">{memberName}</span>!
                            </p>
                            <p className="text-slate-500 mt-1">{message}</p>
                            
                            <button 
                                onClick={resetFlow}
                                className="mt-8 font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-6 py-3 rounded-xl transition-colors"
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
