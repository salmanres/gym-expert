import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { 
    FiMapPin, FiCheckCircle, FiXCircle, FiInfo, 
    FiAlertTriangle, FiChevronRight, FiPhone 
} from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';

export default function SelfCheckIn() {
    const { gymId: routeGymId } = useParams();
    const [gymId, setGymId] = useState(routeGymId);
    
    // UI States: 'init', 'phone', 'otp', 'loading', 'success', 'error'
    const [uiState, setUiState] = useState('init');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [memberName, setMemberName] = useState('');

    const [attendanceStatus, setAttendanceStatus] = useState('none');
    const [isTrial, setIsTrial] = useState(false);
    const [detectedUser, setDetectedUser] = useState(null);
    const [isLookingUp, setIsLookingUp] = useState(false);

    useEffect(() => {
        if (routeGymId && routeGymId !== gymId) {
            setGymId(routeGymId);
        }
    }, [routeGymId]);

    useEffect(() => {
        const token = localStorage.getItem(`deviceToken_${gymId}`);
        const trialToken = localStorage.getItem(`trial_deviceToken_${gymId}`);
        if (token) {
            checkStatus(token, false);
        } else if (trialToken) {
            checkStatus(trialToken, true);
            setIsTrial(true);
        } else {
            setUiState('phone'); // Needs phone number
        }
    }, [gymId]);

    // Live automatic lookup when phone number has 10 digits
    useEffect(() => {
        const clean = phone.replace(/\D/g, '').slice(-10);
        if (clean.length === 10) {
            let active = true;
            setIsLookingUp(true);
            apiClient.post('/attendance/lookup', { gymId, phone: clean })
                .then(res => {
                    if (active) {
                        setDetectedUser({ ...res.data, phone: clean });
                        if (res.data.gymId) {
                            setGymId(res.data.gymId);
                        }
                        setIsLookingUp(false);
                    }
                })
                .catch(() => {
                    if (active) {
                        setDetectedUser(null);
                        setIsLookingUp(false);
                    }
                });
            return () => { active = false; };
        } else {
            setDetectedUser(null);
            setIsLookingUp(false);
        }
    }, [phone, gymId]);

    const checkStatus = async (token, trial = false) => {
        setUiState('loading');
        try {
            const endpoint = trial ? `/trial-attendance/status/${gymId}/${token}` : `/attendance/status/${gymId}/${token}`;
            const res = await apiClient.get(endpoint);
            setAttendanceStatus(res.data.status); // 'none', 'checked_in', 'checked_out'
            setMemberName(res.data.memberName || '');
            setUiState('init');
        } catch (error) {
            if (error.response?.data?.requiresReauth) {
                localStorage.removeItem(trial ? `trial_deviceToken_${gymId}` : `deviceToken_${gymId}`);
                setIsTrial(false);
                setUiState('phone');
            } else {
                setUiState('init'); // fallback to init if there's a non-auth error
            }
        }
    };

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length < 10) {
            toast.error("Please enter a valid 10-digit phone number.");
            return;
        }

        setUiState('loading');
        setMessage('');

        try {
            // Determine user type via lookup
            let info = detectedUser;
            let effectiveGymId = gymId;
            if (!info || info.phone !== cleanPhone) {
                const lookupRes = await apiClient.post('/attendance/lookup', { gymId, phone: cleanPhone });
                info = lookupRes.data;
                if (info.gymId) {
                    effectiveGymId = info.gymId;
                    setGymId(info.gymId);
                }
                setDetectedUser({ ...info, phone: cleanPhone });
            } else if (info.gymId) {
                effectiveGymId = info.gymId;
            }

            if (!info.found) {
                setUiState('phone');
                setMessage('Phone number not registered as Member or Trial. Please contact reception.');
                return;
            }

            if (info.userType === 'trial') {
                // Trial User Flow
                const trialRes = await apiClient.post(`/trial-attendance/identify`, { 
                    gymId: effectiveGymId, 
                    contactNumber: cleanPhone
                });
                setIsTrial(true);
                
                if (trialRes.data.skipOtp) {
                    const tokenKey = `trial_deviceToken_${effectiveGymId}`;
                    localStorage.setItem(tokenKey, trialRes.data.deviceToken);
                    setMemberName(trialRes.data.memberName || info.name || '');
                    performCheckIn(trialRes.data.deviceToken, true);
                    return;
                }

                showOtpSuccess(trialRes.data);
                return;
            } else {
                // Member User Flow
                const res = await apiClient.post(`/attendance/request-otp`, { gymId: effectiveGymId, phone: cleanPhone });
                setIsTrial(false);
                setMemberName(info.name || '');
                showOtpSuccess(res.data);
                return;
            }
        } catch (error) {
            setUiState('phone');
            setMessage(error.response?.data?.message || 'Check-in request failed. Please try again.');
        }
    };

    const showOtpSuccess = (data) => {
        toast.success(data.message);
        if (data.mockOtp) {
            toast.info(`Mock OTP : ${data.mockOtp}`, { autoClose: false });
        }
        setUiState('otp');
        setMessage('');
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (!otp || otp.length < 6) {
            toast.error("Please enter a valid 6-digit OTP.");
            return;
        }

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        setUiState('loading');
        try {
            const res = await apiClient.post(`/attendance/verify-otp`, { 
                gymId, 
                phone: cleanPhone, 
                otp
            });
            
            localStorage.setItem(`deviceToken_${gymId}`, res.data.deviceToken);
            setMemberName(res.data.memberName || '');
            
            // Now proceed to mark attendance
            performCheckIn(res.data.deviceToken, false);
        } catch (error) {
            setUiState('otp');
            setMessage(error.response?.data?.message || 'Invalid OTP. Please try again.');
        }
    };

    const handleDirectCheckIn = () => {
        const token = localStorage.getItem(`deviceToken_${gymId}`);
        const trialToken = localStorage.getItem(`trial_deviceToken_${gymId}`);
        
        if (token) {
            performCheckIn(token, false);
        } else if (trialToken) {
            performCheckIn(trialToken, true);
        } else {
            setUiState('phone');
        }
    };

    const performCheckIn = (deviceToken, forceTrial = null) => {
        const useTrial = forceTrial !== null ? forceTrial : isTrial;
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
                    const endpoint = useTrial ? `/trial-attendance/self-checkin` : `/attendance/self-checkin`;
                    const res = await apiClient.post(endpoint, {
                        gymId,
                        deviceToken,
                        latitude,
                        longitude
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
                        localStorage.removeItem(useTrial ? `trial_deviceToken_${gymId}` : `deviceToken_${gymId}`);
                        setIsTrial(false);
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
        if (localStorage.getItem(`deviceToken_${gymId}`) || localStorage.getItem(`trial_deviceToken_${gymId}`)) {
            setUiState('init');
        } else {
            setUiState('phone');
        }
        setPhone('');
        setOtp('');
        setMessage('');
    };

    return (
        <div className="min-h-screen bg-[#D4D4D8] flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans select-none">
            <ToastContainer theme="light" position="top-center" autoClose={3500} icon={({ type }) => {
                const icons = {
                    success: (
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                            <FiCheckCircle size={16} />
                        </div>
                    ),
                    error: (
                        <div className="w-7 h-7 rounded-xl bg-rose-100 text-[#CA0410] border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                            <FiXCircle size={16} />
                        </div>
                    ),
                    info: (
                        <div className="w-7 h-7 rounded-xl bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                            <FiInfo size={16} />
                        </div>
                    ),
                    warning: (
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                            <FiAlertTriangle size={16} />
                        </div>
                    )
                };
                return icons[type] || icons.info;
            }} />
            
            {/* MAIN CHECK-IN CARD */}
            <div className="w-full max-w-[380px] bg-black border-2 border-[#CA0410] rounded-[28px] p-7 sm:p-8 relative flex flex-col z-10">
                
                {/* Header Area */}
                <div className="text-center relative">
                    {/* Top Location Pin Box */}
                    <div className="w-16 h-16 bg-[#CA0410] rounded-2xl flex items-center justify-center mx-auto mb-4 text-white">
                        <FiMapPin className="text-3xl fill-current text-white" />
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-2xl font-black text-white tracking-wide uppercase">
                        GYM <span className="text-[#CA0410]">CHECK-IN</span>
                    </h1>
                    
                    {uiState === 'init' && <p className="text-[#888888] text-xs font-medium mt-1">Ready to mark your attendance</p>}
                    {uiState === 'phone' && <p className="text-[#888888] text-xs font-medium mt-1">Enter your registered phone number</p>}
                    {uiState === 'otp' && <p className="text-[#888888] text-xs font-medium mt-1">Verify your 6-digit OTP</p>}
                </div>

                <div className="pt-5 flex flex-col justify-center relative">
                    {message && uiState !== 'success' && uiState !== 'loading' && (
                        <div className="mb-5 bg-rose-950/40 border border-rose-600/40 text-rose-300 px-4 py-3 rounded-2xl text-xs font-bold flex gap-2.5">
                            <FiXCircle className="shrink-0 text-base mt-0.5 text-rose-400" />
                            <span>{message}</span>
                        </div>
                    )}

                    {/* 1. INITIAL RECOGNIZED STATE */}
                    {uiState === 'init' && (
                        <div className="text-center space-y-6">
                            {memberName && (
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">
                                        Hello, <span className="text-[#CA0410] font-black">{memberName}</span>
                                    </h2>
                                    <span className={`inline-block mt-1.5 text-[10.5px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider ${
                                        isTrial 
                                            ? 'bg-purple-950/70 text-purple-300 border border-purple-600/40' 
                                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/40'
                                    }`}>
                                        {isTrial ? 'Trial Guest' : 'Gym Member'}
                                    </span>
                                </div>
                            )}
                            
                            {attendanceStatus === 'none' && (
                                <button 
                                    onClick={handleDirectCheckIn}
                                    className="w-full py-4 bg-[#CA0410] hover:bg-[#B0030E] active:scale-[0.98] text-white rounded-2xl font-black text-base transition-all flex items-center justify-between px-6 group cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                        <FiMapPin className="text-white text-base fill-current" />
                                    </div>
                                    <span className="text-base font-black tracking-wide">Tap to Check in</span>
                                    <FiChevronRight className="text-xl group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}

                            {attendanceStatus === 'checked_in' && (
                                <button 
                                    onClick={handleDirectCheckIn}
                                    className="w-full py-4 bg-[#CA0410] hover:bg-[#B0030E] active:scale-[0.98] text-white rounded-2xl font-black text-base transition-all flex items-center justify-between px-6 group cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                        <FiMapPin className="text-white text-base fill-current" />
                                    </div>
                                    <span className="text-base font-black tracking-wide">Tap to Check out</span>
                                    <FiChevronRight className="text-xl group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}

                            {attendanceStatus === 'checked_out' && (
                                <div className="bg-emerald-950/40 rounded-2xl p-5 border border-emerald-600/40">
                                    <p className="text-emerald-400 text-sm font-black flex items-center justify-center gap-2">
                                        <FiCheckCircle className="text-lg" />
                                        Attendance Completed
                                    </p>
                                </div>
                            )}

                            <p className="text-center text-[10.5px] font-bold text-[#666666] tracking-wider uppercase pt-2">
                                REQUIRES GPS LOCATION ACCESS
                            </p>
                            
                            <p className="text-xs text-[#888888] font-medium">
                                Not you?{' '}
                                <button 
                                    onClick={() => {
                                        localStorage.removeItem(`deviceToken_${gymId}`);
                                        localStorage.removeItem(`trial_deviceToken_${gymId}`);
                                        setIsTrial(false);
                                        setDetectedUser(null);
                                        setUiState('phone');
                                        setMessage('');
                                    }}
                                    className="text-[#CA0410] hover:underline font-bold transition-colors cursor-pointer"
                                >
                                    Change account
                                </button>
                            </p>
                        </div>
                    )}

                    {/* 2. PHONE NUMBER INPUT */}
                    {uiState === 'phone' && (
                        <form onSubmit={handleRequestOTP} className="space-y-4">
                            <div className="space-y-1.5 text-left">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                    Registered Phone Number
                                </label>
                                <div className="relative">
                                    <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base" />
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Enter 10-digit mobile number"
                                        className="w-full py-3.5 pl-11 pr-4 bg-[#141414] border border-[#262626] rounded-2xl text-white font-bold text-base focus:outline-none focus:border-[#CA0410] transition-colors placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Live Phone Detection Indicator */}
                            {isLookingUp && (
                                <div className="p-3 bg-[#141414] border border-[#262626] rounded-2xl flex items-center gap-2.5 text-xs text-slate-400 font-bold animate-pulse text-left">
                                    <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-white rounded-full animate-spin shrink-0"></div>
                                    <span>Identifying member or trial guest...</span>
                                </div>
                            )}

                            {detectedUser && !isLookingUp && (
                                <>
                                    {detectedUser.found && detectedUser.userType === 'member' && (
                                        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-left animate-in fade-in duration-200">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Gym Member</span>
                                                </div>
                                                <p className="text-sm font-black text-white mt-0.5">{detectedUser.name}</p>
                                                <p className="text-[11px] font-semibold text-emerald-300/80">{detectedUser.message}</p>
                                            </div>
                                            <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                                                Member
                                            </span>
                                        </div>
                                    )}

                                    {detectedUser.found && detectedUser.userType === 'trial' && (
                                        <div className="p-3.5 bg-purple-950/40 border border-purple-500/40 rounded-2xl flex items-center justify-between text-left animate-in fade-in duration-200">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Trial Pass</span>
                                                </div>
                                                <p className="text-sm font-black text-white mt-0.5">{detectedUser.name}</p>
                                                <p className="text-[11px] font-semibold text-purple-300/80">{detectedUser.message}</p>
                                            </div>
                                            <span className="text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                                                Trial Guest
                                            </span>
                                        </div>
                                    )}

                                    {!detectedUser.found && (
                                        <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-left animate-in fade-in duration-200 text-rose-300 text-xs font-semibold flex items-center gap-2">
                                            <FiXCircle className="text-base text-rose-400 shrink-0" />
                                            <span>No member or trial found for this number.</span>
                                        </div>
                                    )}
                                </>
                            )}

                            <button 
                                type="submit"
                                disabled={isLookingUp}
                                className="w-full py-4 rounded-2xl font-black text-white bg-[#CA0410] hover:bg-[#B0030E] active:scale-95 transform transition-all cursor-pointer text-base tracking-wide disabled:opacity-50"
                            >
                                {isLookingUp 
                                    ? 'Identifying...' 
                                    : detectedUser?.userType === 'member'
                                    ? 'Continue with Member OTP'
                                    : detectedUser?.userType === 'trial'
                                    ? 'Instant Trial Check-In'
                                    : 'Continue'}
                            </button>
                        </form>
                    )}

                    {/* 3. OTP VERIFICATION */}
                    {uiState === 'otp' && (
                        <form onSubmit={handleVerifyOTP} className="space-y-5">
                            <div className="space-y-1.5 text-left">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">6-Digit OTP</label>
                                <input
                                    type="number"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full py-3.5 px-4 bg-[#141414] border border-[#262626] rounded-2xl text-white font-black text-2xl tracking-[0.4em] text-center focus:outline-none focus:border-[#CA0410] transition-colors placeholder:text-slate-700"
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 rounded-2xl font-black text-white bg-[#CA0410] hover:bg-[#B0030E] active:scale-95 transform transition-all cursor-pointer text-base tracking-wide"
                            >
                                Verify & Check In
                            </button>

                            <button 
                                type="button"
                                onClick={() => { setUiState('phone'); setOtp(''); }}
                                className="w-full text-xs text-slate-400 font-bold hover:text-white text-center mt-1 transition-colors cursor-pointer"
                            >
                                Change Phone Number
                            </button>
                        </form>
                    )}

                    {/* 4. LOADING STATE */}
                    {uiState === 'loading' && (
                        <div className="py-10 flex flex-col items-center justify-center space-y-4">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-[#222222] rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-[#CA0410] rounded-full border-t-transparent animate-spin"></div>
                                <FiMapPin className="text-[#CA0410] text-xl" />
                            </div>
                            <p className="text-slate-400 font-bold text-xs tracking-wide">Verifying location...</p>
                        </div>
                    )}

                    {/* 5. ERROR STATE */}
                    {uiState === 'error' && (
                        <div className="py-4 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-950/40 border border-rose-600/40 rounded-2xl flex items-center justify-center relative">
                                <FiXCircle className="text-3xl text-rose-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">Check-in Failed</h2>
                                <p className="text-slate-400 mt-1 text-xs leading-relaxed max-w-[280px] mx-auto">{message}</p>
                            </div>
                            
                            <button 
                                onClick={resetFlow}
                                className="font-bold text-xs text-white bg-[#CA0410] hover:bg-[#B0030E] w-full py-3.5 rounded-2xl transition-all active:scale-95 cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* 6. SUCCESS STATE */}
                    {uiState === 'success' && (
                        <div className="py-4 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-950/40 border border-emerald-600/40 rounded-2xl flex items-center justify-center relative">
                                <FiCheckCircle className="text-3xl text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Success!</h2>
                                <p className="text-slate-300 mt-1 font-bold text-sm">
                                    {isCheckingOut ? 'Goodbye' : 'Welcome'}, <span className="text-[#CA0410] font-black">{memberName}</span>!
                                </p>
                                <p className="text-slate-500 mt-0.5 text-xs">{message}</p>
                            </div>
                            
                            <button 
                                onClick={resetFlow}
                                className="font-bold text-xs text-white bg-[#CA0410] hover:bg-[#B0030E] w-full py-3.5 rounded-2xl transition-all active:scale-95 cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
