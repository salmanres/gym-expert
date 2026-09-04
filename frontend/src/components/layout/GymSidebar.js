import React from 'react';
import { Link } from 'react-router-dom';
import { 
    FiHome, FiClipboard, FiUsers, FiCreditCard, FiDollarSign, 
    FiUserCheck, FiCheckSquare, FiBarChart2, FiSettings, FiLogOut, FiX 
} from 'react-icons/fi';
import { CgGym } from 'react-icons/cg';

function GymSidebar({ user, location, sidebarOpen, setSidebarOpen, handleLogout }) {
    const isOwnerOrAdmin = ['GYM_OWNER', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role);

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1B1E23] transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:relative md:translate-x-0 md:w-56 border-r border-slate-200 flex flex-col shrink-0 print:hidden`}>
            {/* Gym Header Banner */}
            <div className="h-40 bg-white rounded-b-3xl flex items-center justify-center p-4 relative ">
               <img src="/gym.jpg" alt="gym" className='h-full w-full object-cover' />
                <button 
                    onClick={() => setSidebarOpen(false)} 
                    className="md:hidden text-slate-400 hover:text-white"
                >
                    <FiX className="text-xl" />
                </button>
            </div>

            {/* Gym Navigation Links */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col gap-1 custom-scrollbar">
                <Link 
                    to="/dashboard/owner" 
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors ${
                        location.pathname === '/dashboard/owner' 
                            ? 'bg-[#CA0410] text-white ' 
                            : 'text-white hover:bg-[#CA0410] '
                    }`}
                >
                    <FiHome className="text-2xl shrink-0" />
                    <span>Dashboard</span>
                </Link>

                <Link 
                    to="/dashboard/owner/leads"     
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors ${
                        location.pathname.includes('/leads') 
                            ? 'bg-[#CA0410] text-white' 
                            : 'text-white hover:bg-[#CA0410]'                    }`}
                >
                    <FiClipboard className="text-2xl shrink-0" />
                    <span>Leads</span>
                </Link>

                <Link 
                    to="/dashboard/owner/members" 
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto fo   nt-semibold text-lg transition-colors ${
                        location.pathname === '/dashboard/owner/members' || location.pathname.startsWith('/dashboard/owner/members/') 
                             ? 'bg-[#CA0410] text-white'    
                            : 'text-white hover:bg-[#CA0410] '
                    }`}
                >
                    <FiUsers className="text-2xl" />
                    <span>Members</span>
                </Link>

                <Link 
                    to="/dashboard/owner/membership" 
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors ${
                        location.pathname === '/dashboard/owner/membership' || location.pathname.startsWith('/dashboard/owner/membership/') 
                             ? 'bg-[#CA0410] text-white'    
                            : 'text-white hover:bg-[#CA0410]'
                    }`}
                >
                    <FiCreditCard className="text-2xl shrink-0" />
                    <span>Membership</span>
                </Link>

                <Link 
                    to="/dashboard/owner/finance" 
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors ${
                        location.pathname.includes('/finance') 
                             ? 'bg-[#CA0410] text-white'    
                            : 'text-white hover:bg-[#CA0410]'
                    }`}
                >
                    <FiDollarSign className="text-2xl shrink-0" />
                    <span>Finance</span>
                </Link>

                {isOwnerOrAdmin && (
                    <Link 
                        to="/dashboard/owner/staff"     
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors ${
                            location.pathname.includes('/staff') 
                                 ? 'bg-[#CA0410] text-white'    
                            : 'text-white hover:bg-[#CA0410]'
                        }`}
                    >
                        <FiUserCheck className=" text-2xl" />
                        <span>Trainers & Staff</span>
                    </Link>
                )}
                
                <Link 
                    to="/dashboard/owner/attendance" 
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors ${
                        location.pathname.includes('/attendance') 
                             ? 'bg-[#CA0410] text-white'    
                            : 'text-white hover:bg-[#CA0410]'
                    }`}
                >
                    <FiCheckSquare className="text-2xl shrink-0" />
                    <span>Attendance</span>
                </Link>

                <Link 
                    to="/dashboard/owner/reports" 
                    className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors ${
                        location.pathname.includes('/reports') 
                            ? 'bg-[#CA0410] text-white'    
                            : 'text-white hover:bg-[#CA0410]'
                    }`}
                >
                    <FiBarChart2 className="text-2xl shrink-0" />
                    <span>Reports</span>
                </Link>

                {isOwnerOrAdmin && (
                    <Link 
                        to="/dashboard/owner/settings" 
                        className={`flex items-center gap-2 w-48 mx-4 px-2 py-2 rou nded-xl text-roboto font-semibold text-lg transition-colors ${
                            location.pathname.includes('/settings') 
                                ? 'bg-[#CA0410] text-white ' 
                                : 'text-white hover:bg-[#CA0410]'
                        }`}
                    >
                        <FiSettings className="text-2xl" />
                        <span>Settings</span>
                    </Link>
                )}
            </div>

            {/* Logout Footer */}
            <div className="py-2 border-t border-slate-200">
                <button 
                    onClick={handleLogout}
                    className="flex items-center w-48 mx-4 px-2 py-2 rounded-xl text-roboto font-semibold text-lg transition-colors  gap-2 "
                >
                    <FiLogOut className="text-2xl shrink-0 text-white" />
                    <span className='text-white'>Logout</span>
                </button>
            </div>
        </aside>
    );
}

export default GymSidebar;
