import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { FiLogOut, FiList, FiPlusCircle, FiUser, FiHome, FiChevronDown, FiActivity } from 'react-icons/fi';
import { CgGym } from 'react-icons/cg';
import { toast } from 'react-toastify';
import axios from 'axios';

function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [gyms, setGyms] = useState([]);
    
    // Quick user check
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    useEffect(() => {
        if (user?.role === 'SUPERADMIN') {
            const fetchGyms = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get('http://localhost:5000/api/auth/superadmin/gyms', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setGyms(res.data);
                } catch (err) {
                    console.error("Failed to fetch gyms for sidebar", err);
                }
            };
            fetchGyms();
        }
    }, [user?.role]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.success("Logged out successfully");
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 z-20 shrink-0">
                <div className="h-24 bg-slate-950 p-6 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md">
                        <CgGym className="text-xl text-white" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-white text-lg tracking-tight leading-tight">Gym Admin</h2>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {user?.role === 'SUPERADMIN' ? 'SUPER ADMIN' : 'GYM OWNER'}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 custom-scrollbar">
                    {user?.role === 'SUPERADMIN' && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Link 
                                    to="/dashboard/gyms" 
                                    className={`flex items-center gap-3 px-6 py-3 font-bold text-sm transition-colors ${location.pathname === '/dashboard/gyms' ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiHome className="text-lg" />
                                    <span>Dashboard Overview</span>
                                </Link>
                                <Link 
                                    to="/dashboard/register-gym" 
                                    className={`flex items-center gap-3 px-6 py-3 font-bold text-sm transition-colors ${location.pathname === '/dashboard/register-gym' ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiPlusCircle className="text-lg" />
                                    <span>Register New Gym</span>
                                </Link>
                            </div>

                            <div className="px-6">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Registered Gyms</h3>
                                <div className="flex flex-col gap-1">
                                    {gyms.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No gyms found</p>
                                    ) : (
                                        gyms.map(gym => (
                                            <div key={gym._id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                                                <div className={`w-2 h-2 rounded-full ${gym.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <span className="text-sm font-semibold text-slate-600 group-hover:text-emerald-600 truncate">{gym.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {user?.role === 'GYM_OWNER' && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Link 
                                    to="/dashboard/owner" 
                                    className={`flex items-center gap-3 px-6 py-3 font-bold text-sm transition-colors ${location.pathname === '/dashboard/owner' ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiHome className="text-lg" />
                                    <span>Dashboard</span>
                                </Link>
                                <Link 
                                    to="/dashboard/owner/leads" 
                                    className={`flex items-center gap-3 px-6 py-3 font-bold text-sm transition-colors ${location.pathname.includes('/leads') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiActivity className="text-lg" />
                                    <span>Enquiries & Leads</span>
                                </Link>
                                <Link 
                                    to="/dashboard/owner/branches" 
                                    className={`flex items-center gap-3 px-6 py-3 font-bold text-sm transition-colors ${location.pathname.includes('/branches') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiList className="text-lg" />
                                    <span>My Branches</span>
                                </Link>
                                <Link 
                                    to="/dashboard/owner/staff" 
                                    className={`flex items-center gap-3 px-6 py-3 font-bold text-sm transition-colors ${location.pathname.includes('/staff') ? 'text-emerald-600 border-l-4 border-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <FiUser className="text-lg" />
                                    <span>Staff Management</span>
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                <div className="py-4 border-t border-slate-200">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-6 py-3 w-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors font-bold text-sm"
                    >
                        <FiLogOut className="text-lg" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative bg-white">
                {/* Top Navbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0 z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-800 hidden sm:block capitalize">
                            {location.pathname === '/dashboard/gyms' ? 'Overview' : 
                             location.pathname.includes('/register-gym') ? 'New Registration' : 
                             location.pathname.split('/').pop().replace('-', ' ')}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:text-emerald-600 shadow-sm border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                            <span className="sr-only">Notifications</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        </button>
                        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm border-2 border-emerald-100 cursor-pointer">
                            <FiUser className="text-white text-sm" />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto w-full z-10 bg-white">
                    <div className="w-full h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default DashboardLayout;
