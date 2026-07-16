import React, { useState } from 'react';
import { CgGym } from 'react-icons/cg';
import { toast } from 'react-toastify';
import axios from 'axios';

function RegisterGymPage() {
    const [formData, setFormData] = useState({
        gymName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            return toast.error("Passwords do not match");
        }

        const token = localStorage.getItem('token');
        if (!token) {
            return toast.error("SuperAdmin token missing. Please log in first.");
        }

        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/auth/register-gym', {
                gymName: formData.gymName,
                ownerName: formData.ownerName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                password: formData.password
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            toast.success("Gym registered successfully!");
            setFormData({
                gymName: '', ownerName: '', email: '', phone: '', password: '', confirmPassword: '', address: ''
            });
            // Optional: redirect to dashboard
            // navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-full bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-col items-start bg-white shrink-0">
                <h1 className="text-xl font-bold text-slate-900 mb-0.5">Register Your Gym</h1>
                <p className="text-slate-500 font-medium text-xs">Join our platform and elevate your gym management experience. Set up your business profile below.</p>
            </div>

            <div className="flex-1 w-full bg-white px-4 py-4">
                <div className="w-full">
                    <form className="space-y-3" onSubmit={handleRegister}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Gym Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="gymName">
                                    Gym Name
                                </label>
                                <div className="relative">
                                    <input
                                        id="gymName"
                                        type="text"
                                        value={formData.gymName}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder-slate-400 outline-none font-medium text-sm shadow-sm"
                                        placeholder="Iron Paradise"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="ownerName">
                                    Owner Name
                                </label>
                                <div className="relative">
                                    <input
                                        id="ownerName"
                                        type="text"
                                        value={formData.ownerName}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder-slate-400 outline-none font-medium text-sm shadow-sm"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="email">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder-slate-400 outline-none font-medium text-sm shadow-sm"
                                        placeholder="admin@gym.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="phone">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder-slate-400 outline-none font-medium text-sm shadow-sm"
                                        placeholder="+1 (555) 000-0000"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="password">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400 outline-none font-medium text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="confirmPassword">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400 outline-none font-medium text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address - Full width */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="address">
                                Gym Address
                            </label>
                            <div className="relative">
                                <textarea
                                    id="address"
                                    rows="2"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder-slate-400 outline-none resize-none font-medium text-sm shadow-sm"
                                    placeholder="123 Fitness Ave, Muscle City, MC 12345"
                                    required
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex items-center pt-1">
                            <input
                                id="terms"
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                required
                            />
                            <label htmlFor="terms" className="ml-3 block text-sm font-medium text-slate-600">
                                I agree to the <button type="button" className="text-emerald-600 font-bold hover:underline">Terms and Conditions</button> and <button type="button" className="text-emerald-600 font-bold hover:underline">Privacy Policy</button>.
                            </label>
                        </div>

                        <div className="pt-2 border-t border-slate-200 mt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 text-xs"
                            >
                                {loading ? 'Registering...' : 'Complete Registration'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RegisterGymPage;
