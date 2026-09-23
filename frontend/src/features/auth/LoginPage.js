import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import { FaDumbbell } from 'react-icons/fa6';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import gymLogo from '../../assets/gym.png';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await apiClient.post('/auth/login', {
                email,
                password
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            toast.success('Logged in successfully!');
            
            if (data.role === 'SUPERADMIN') {
                navigate('/dashboard/gyms');
            } else {
                navigate('/dashboard/owner');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-black font-sans selection:bg-[#e52525] selection:text-white"
            style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.72)), url(${process.env.PUBLIC_URL}/gym-bg-cinematic.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#070709'
            }}
        >
            {/* Ambient Background Blur & Glow */}
            <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#e52525]/10 rounded-full blur-[140px] pointer-events-none" />

            {/* ================= CENTRAL LOGIN CONTAINER ================= */}
            <div 
                className="relative z-10 w-full max-w-4xl mx-auto rounded-[24px] sm:rounded-[28px] overflow-hidden flex flex-col md:flex-row transition-all"
                style={{
                    border: '1px solid rgba(239, 40, 40, 0.7)',
                    boxShadow: '0 0 30px rgba(239, 40, 40, 0.12), 0 25px 60px -15px rgba(0, 0, 0, 0.8)'
                }}
            >
                
                {/* ----------------- LEFT PANEL: BRANDING & TYPOGRAPHY ----------------- */}
                <div 
                    className="w-full md:w-1/2 min-h-[260px] md:min-h-[500px] relative flex flex-col items-center justify-center p-6 sm:p-10 text-center border-b md:border-b-0 md:border-r border-white/10"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.65), rgba(12, 12, 16, 0.88)), url(${process.env.PUBLIC_URL}/gym-bg-cinematic.jpg)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="relative z-10 flex flex-col items-center w-full max-w-[360px]">
                        
                        {/* Official GYM CHALAK Logo using gym.png */}
                        <div 
                            className="bg-white rounded-[20px] px-6 py-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-white/90 mb-6 transform hover:scale-105 transition-transform duration-300 w-[240px] sm:w-[260px] flex items-center justify-center"
                        >
                            <img 
                                src={gymLogo} 
                                alt="GYM CHALAK" 
                                className="w-full h-auto object-contain block select-none"
                            />
                        </div>

                        {/* 2. Premium Typography */}
                        <div className="space-y-1 w-full">
                            <h2 className="text-xl sm:text-[22px] lg:text-[25px] font-black text-white leading-tight tracking-tight font-sans whitespace-nowrap">
                                Manage your GYM with ease.
                            </h2>
                            <h2 className="text-xl sm:text-[22px] lg:text-[25px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#e52525] via-[#ff4d4d] to-[#ff3333] leading-tight tracking-tight font-sans whitespace-nowrap">
                                Grow your business smarter.
                            </h2>
                        </div>

                        <p className="text-gray-300 text-xs sm:text-[13px] font-normal leading-relaxed mt-3.5 text-gray-300/90 max-w-[300px]">
                            All-in-one software for attendance, memberships, payments & billing.
                        </p>
                    </div>
                </div>

                {/* ----------------- RIGHT PANEL: SLEEK GRADIENT LOGIN FORM ----------------- */}
                <div 
                    className="w-full md:w-1/2 p-6 sm:p-9 lg:p-10 flex flex-col justify-between relative"
                    style={{
                        background: 'linear-gradient(135deg, #090909 0%, #111111 50%, #160707 100%)'
                    }}
                >
                    {/* Subtle red ambient glow behind form */}
                    <div className="absolute top-10 right-10 w-48 h-48 bg-[#e52525]/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 w-full max-w-[360px] mx-auto flex-1 flex flex-col justify-center">
                        
                        {/* Header: Dumbbell Badge & Title */}
                        <div className="flex flex-col items-center text-center mb-5">
                            <div className="w-12 h-12 bg-gradient-to-tr from-[#d61c1c] to-[#ff3333] rounded-2xl flex items-center justify-center text-white mb-2.5 shadow-lg shadow-[#e52525]/30 transform hover:scale-105 transition-transform p-2.5">
                                <FaDumbbell className="text-xl transform -rotate-12" />
                            </div>
                            
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-0.5 font-sans">
                                Welcome <span className="text-[#e52525]">Back</span>
                            </h1>
                            <p className="text-gray-400 text-xs font-normal">
                                Sign in to manage your fitness business
                            </p>
                        </div>

                        {/* Form */}
                        <form className="space-y-3.5" onSubmit={handleLogin}>
                            {/* Email Address */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1" htmlFor="email">
                                    EMAIL ADDRESS
                                </label>
                                <div className="flex items-center bg-[#141418] border border-neutral-800 focus-within:border-[#e52525] focus-within:ring-1 focus-within:ring-[#e52525]/30 rounded-xl px-3.5 py-2.5 transition-all shadow-inner group">
                                    <FiMail className="text-[#e52525] text-base mr-3 flex-shrink-0 group-focus-within:text-[#ff4d4d] transition-colors" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-transparent text-white text-sm placeholder-gray-500 outline-none font-medium"
                                        placeholder="admin@gym.com"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider" htmlFor="password">
                                        PASSWORD
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => toast.info('Please contact your administrator to reset password.')}
                                        className="text-[11px] text-gray-400 hover:text-[#ff4d4d] transition-colors cursor-pointer font-medium"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="flex items-center bg-[#141418] border border-neutral-800 focus-within:border-[#e52525] focus-within:ring-1 focus-within:ring-[#e52525]/30 rounded-xl px-4 py-3 transition-all shadow-inner group">
                                    <FiLock className="text-[#e52525] text-base mr-3 flex-shrink-0 group-focus-within:text-[#ff4d4d] transition-colors" />
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent text-white text-sm placeholder-gray-500 outline-none font-medium tracking-wide"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-gray-400 hover:text-white transition-colors ml-2 focus:outline-none cursor-pointer p-1"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Premium Sign-in CTA Button with Smooth Hover & Arrow Animation */}
                            <div className="pt-1.5">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full py-3 px-6 rounded-xl text-white text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] overflow-hidden shadow-md"
                                    style={{
                                        background: 'linear-gradient(90deg, #CA0410, #e52525)',
                                        boxShadow: '0 8px 25px rgba(202, 4, 16, 0.3)'
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0"></div>
                                            <span className="tracking-wide">Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="tracking-wide">Sign-in</span>
                                            <span className="text-base font-bold transform group-hover:translate-x-1.5 transition-transform duration-200">
                                                →
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                    </div>

                    {/* Subtle Trust Footer for perfect vertical balance */}
                    <div className="mt-4 pt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 text-center border-t border-white/5">
                        <FiShield className="text-[#e52525] text-xs flex-shrink-0" />
                        <span>Secure access to your fitness management dashboard.</span>
                    </div>

                </div>

            </div>

        </div>
    );
}

export default LoginPage;