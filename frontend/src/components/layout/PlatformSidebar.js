import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiPlusCircle, FiLogOut, FiX, FiShield } from 'react-icons/fi';

function PlatformSidebar({ user, location, sidebarOpen, setSidebarOpen, handleLogout }) {
    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:relative md:translate-x-0 md:w-56 border-r border-slate-800 flex flex-col shrink-0 print:hidden`}>
            {/* Platform Header */}
            <div className="h-14 bg-slate-950 p-4 flex items-center gap-3 border-b border-slate-800">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <FiShield className="text-lg text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="font-bold text-white text-sm tracking-tight leading-none">Platform Admin</h2>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        {user?.role ? user.role.replace('_', ' ') : 'SUPERADMIN'}
                    </p>
                </div>
                <button 
                    onClick={() => setSidebarOpen(false)} 
                    className="md:hidden text-slate-400 hover:text-white"
                >
                    <FiX className="text-xl" />
                </button>
            </div>

            {/* Platform Navigation Links */}
            <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 custom-scrollbar px-2">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Platform Management
                </div>
                <Link 
                    to="/dashboard/gyms" 
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        location.pathname === '/dashboard/gyms' 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                    <FiHome className="text-base shrink-0" />
                    <span>Dashboard Overview</span>
                </Link>
                <Link 
                    to="/dashboard/register-gym" 
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        location.pathname === '/dashboard/register-gym' 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                    <FiPlusCircle className="text-base shrink-0" />
                    <span>Register New Gym</span>
                </Link>
            </div>

            {/* Logout Footer */}
            <div className="p-2 border-t border-slate-800">
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2.5 w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-bold text-xs"
                >
                    <FiLogOut className="text-base shrink-0" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}

export default PlatformSidebar;
