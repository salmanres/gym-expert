import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CgGym } from 'react-icons/cg';
import axios from 'axios';
import { toast } from 'react-toastify';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            toast.success('Logged in successfully!');
            // Redirect based on role or to dashboard
            if (data.role === 'SUPERADMIN') {
                navigate('/dashboard/gyms');
            } else {
                navigate('/dashboard/owner');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 selection:bg-black selection:text-white">
            <div className="w-full max-w-md p-8 sm:p-12">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6">
                        <CgGym className="text-2xl" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-black mb-2">Welcome Back</h1>
                    <p className="text-gray-500 text-sm">Sign in to manage your fitness empire</p>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2" htmlFor="email">
                            Email Address
                        </label>
                        <div className="relative">
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-200 focus:border-black transition-colors text-black placeholder-gray-400 outline-none sm:text-lg"
                                placeholder="admin@gym.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider" htmlFor="password">
                                Password
                            </label>
                            <button type="button" className="text-xs font-medium text-gray-400 hover:text-black transition-colors">
                                Forgot password?
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-0 py-3 bg-transparent border-0 border-b-2 border-gray-200 focus:border-black transition-colors text-black placeholder-gray-400 outline-none sm:text-lg"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {/* <div className="flex items-center pt-2">
                        <input
                            id="remember-me"
                            type="checkbox"
                            className="w-4 h-4 border-gray-300 text-black focus:ring-black rounded-sm"
                        />
                        <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-600">
                            Remember me for 30 days
                        </label>
                    </div> */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-4 bg-black hover:bg-gray-900 text-white font-medium transition-all active:scale-[0.99] mt-8 flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
{/* 
                <div className="mt-10 text-center text-sm text-gray-500">
                    Don't have a gym account yet?{' '}
                    <Link to="/register" className="font-medium text-black hover:underline transition-all">
                        Register your Gym
                    </Link>
                </div> */}
            </div>
        </div>
    );
}

export default LoginPage;