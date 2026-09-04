import React from 'react';
import { FiMenu, FiShield, FiUser } from 'react-icons/fi';

function PlatformNavbar({ user, setSidebarOpen }) {
    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 sticky top-0 print:hidden shadow-xs">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setSidebarOpen(true)} 
                    className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <FiMenu className="text-xl" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        Platform Administration Portal
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
                    <FiShield className="text-indigo-600 text-xs" />
                    <span className="text-xs font-bold text-indigo-900">Platform SuperAdmin</span>
                </div>

                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs border border-indigo-500 text-white cursor-pointer" title={user?.email || 'SuperAdmin'}>
                    <FiUser className="text-sm" />
                </div>
            </div>
        </header>
    );
}

export default PlatformNavbar;
