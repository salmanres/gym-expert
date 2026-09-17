import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FiHome, FiUsers, FiUser, FiCreditCard, 
    FiCalendar, FiSettings, FiLogOut, FiX 
} from 'react-icons/fi';
import { FaRupeeSign, FaCrown, FaDumbbell } from 'react-icons/fa';
import { FiBarChart2 } from 'react-icons/fi';

function GymSidebar({ user, location, sidebarOpen, setSidebarOpen, handleLogout }) {
    const navigate = useNavigate();
    const isOwnerOrAdmin = ['GYM_OWNER', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role);

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-black text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:relative md:translate-x-0 md:w-56 border-r-2 border-[#CA0410] flex flex-col shrink-0 print:hidden select-none`}>
            {/* Gym Header Banner / Logo (Exact same height as Navbar: h-16, flush at the top) */}
            <div className="h-16 bg-white border-b-2 border-[#CA0410] px-2 py-1 flex items-center justify-center relative shrink-0 overflow-hidden">
                <img 
                    src="/gym.jpg" 
                    alt="Gym Chalak" 
                    className="h-full w-full object-contain select-none scale-105" 
                    onError={(e) => { 
                        e.target.style.display = 'none'; 
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }} 
                />
                <div className="hidden flex-col items-center justify-center">
                    <span className="text-base font-black text-slate-900 tracking-tight leading-none">GYM</span>
                    <span className="text-base font-black text-[#CA0410] tracking-wider leading-none mt-0.5">CHALAK</span>
                </div>
                <button 
                    onClick={() => setSidebarOpen(false)} 
                    className="md:hidden absolute top-3.5 right-2.5 text-slate-700 hover:text-[#CA0410]"
                >
                    <FiX className="text-xl" />
                </button>
            </div>

            {/* Gym Navigation Links */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 flex flex-col gap-1 custom-scrollbar">
                <Link 
                    to="/dashboard/owner" 
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                        location.pathname === '/dashboard/owner' 
                            ? 'bg-[#CA0410] text-white font-bold shadow-sm' 
                            : 'text-white font-medium hover:bg-white/10'
                    }`}
                >
                    <FiHome className="text-lg shrink-0" />
                    <span>Dashboard</span>
                </Link>

                <Link 
                    to="/dashboard/owner/leads"     
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                        location.pathname.includes('/leads') 
                            ? 'bg-[#CA0410] text-white font-bold shadow-sm' 
                            : 'text-white font-medium hover:bg-white/10'
                    }`}
                >
                    <FiUsers className="text-lg shrink-0" />
                    <span>Leads</span>
                </Link>

                <Link 
                    to="/dashboard/owner/members" 
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                        location.pathname === '/dashboard/owner/members' || location.pathname.startsWith('/dashboard/owner/members/') 
                            ? 'bg-[#CA0410] text-white font-bold shadow-sm'    
                            : 'text-white font-medium hover:bg-white/10'
                    }`}
                >
                    <FiUser className="text-lg shrink-0" />
                    <span>Members</span>
                </Link>

                <Link 
                    to="/dashboard/owner/membership" 
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                        location.pathname === '/dashboard/owner/membership' || location.pathname.startsWith('/dashboard/owner/membership/') 
                            ? 'bg-[#CA0410] text-white font-bold shadow-sm'    
                            : 'text-white font-medium hover:bg-white/10'
                    }`}
                >
                    <FiCreditCard className="text-lg shrink-0" />
                    <span>Membership</span>
                </Link>

                <Link 
                    to="/dashboard/owner/finance" 
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                        location.pathname.includes('/finance') 
                            ? 'bg-[#CA0410] text-white font-bold shadow-sm'    
                            : 'text-white font-medium hover:bg-white/10'
                    }`}
                >
                    <FaRupeeSign className="text-base shrink-0" />
                    <span>Finance</span>
                </Link>

                {isOwnerOrAdmin && (
                    <Link 
                        to="/dashboard/owner/staff"     
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                            location.pathname.includes('/staff') 
                                ? 'bg-[#CA0410] text-white font-bold shadow-sm'    
                                : 'text-white font-medium hover:bg-white/10'
                        }`}
                    >
                        <FaDumbbell className="text-lg shrink-0" />
                        <span>Trainers & Staff</span>
                    </Link>
                )}
                
                <Link 
                    to="/dashboard/owner/attendance" 
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                        location.pathname.includes('/attendance') 
                            ? 'bg-[#CA0410] text-white font-bold shadow-sm'    
                            : 'text-white font-medium hover:bg-white/10'
                    }`}
                >
                    <FiCalendar className="text-lg shrink-0" />
                    <span>Attendance</span>
                </Link>

                <Link 
                    to="/dashboard/owner/reports" 
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                        location.pathname.includes('/reports') 
                            ? 'bg-[#CA0410] text-white font-bold shadow-sm'    
                            : 'text-white font-medium hover:bg-white/10'
                    }`}
                >
                    <FiBarChart2 className="text-lg shrink-0" />
                    <span>Reports</span>
                </Link>

                {isOwnerOrAdmin && (
                    <Link 
                        to="/dashboard/owner/settings" 
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                            location.pathname.includes('/settings') 
                                ? 'bg-[#CA0410] text-white font-bold shadow-sm' 
                                : 'text-white font-medium hover:bg-white/10'
                        }`}
                    >
                        <FiSettings className="text-lg shrink-0" />
                        <span>Settings</span>
                    </Link>
                )}
            </div>

            {/* Upgrade & Logout Footer */}
            <div className="p-3 pt-1 flex flex-col gap-2">
                {/* Upgrade Now Button */}
                <button 
                    onClick={() => navigate('/dashboard/owner/settings')}
                    className="w-full py-2.5 bg-[#CA0410] hover:bg-[#b0030e] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
                >
                    <FaCrown className="text-white text-xs" />
                    <span>Upgrade Now</span>
                </button>

                {/* Divider */}
                <div className="border-t border-neutral-800 my-0.5" />

                {/* Logout */}
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3.5 py-2 rounded-xl font-medium text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                    <FiLogOut className="text-lg shrink-0" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}

export default GymSidebar;
