import React from 'react';
import SummaryCards from '../../../components/page/SummaryCards';
import DataTable from '../../../components/page/DataTable';
import EmptyState from '../../../components/page/EmptyState';
import { FiUsers, FiCheckCircle, FiClock } from 'react-icons/fi';

export default function StaffHoursReport({ 
    staffAttendance = [],
    filterBar = null
}) {
    const onDutyStaff = staffAttendance.filter(s => s.attendance?.checkInTime && !s.attendance?.checkOutTime);
    const completedStaff = staffAttendance.filter(s => s.attendance?.checkOutTime);

    const cards = [
        { title: 'Total Staff Registered', value: `${staffAttendance.length} Members`, icon: <FiUsers />, textColor: 'text-slate-500', valueColor: 'text-slate-800', bgClass: 'bg-slate-100', iconColor: 'text-slate-700' },
        { title: 'Currently On Duty', value: `${onDutyStaff.length} On Duty`, icon: <FiCheckCircle />, textColor: 'text-emerald-600', valueColor: 'text-emerald-600', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { title: 'Shifts Completed Today', value: `${completedStaff.length} Shifts`, icon: <FiClock />, textColor: 'text-blue-600', valueColor: 'text-blue-600', bgClass: 'bg-blue-50', iconColor: 'text-blue-600' }
    ];

    const columns = [
        { label: 'Staff / Trainer Name' },
        { label: 'Contact Phone' },
        { label: 'Role' },
        { label: 'Shift Status' },
        { label: 'Check In' },
        { label: 'Check Out' }
    ];

    const renderRow = (item) => (
        <tr key={item.user?._id || item._id} className="hover:bg-slate-50 transition-colors">
            <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                {item.user?.name || 'Staff Member'}
            </td>
            <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                {item.user?.phone || 'N/A'}
            </td>
            <td className="py-3 px-4 text-xs font-medium text-slate-600">
                {item.user?.role || 'Staff'}
            </td>
            <td className="py-3 px-4">
                <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    item.attendance?.checkOutTime ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                    item.attendance?.checkInTime ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                    'bg-slate-100 text-slate-600'
                }`}>
                    {item.attendance?.checkOutTime ? 'Completed' : item.attendance?.checkInTime ? 'On Duty' : 'Not Checked In'}
                </span>
            </td>
            <td className="py-3 px-4 text-xs font-medium text-slate-600">
                {item.attendance?.checkInTime ? new Date(item.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
            </td>
            <td className="py-3 px-4 text-xs font-medium text-slate-600">
                {item.attendance?.checkOutTime ? new Date(item.attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
            </td>
        </tr>
    );

    return (
        <div className="space-y-4 w-full m-0 p-0">
            <div className="px-4 pt-3">
                <SummaryCards cards={cards} />
            </div>

            {/* FilterBar Component AFTER Cards */}
            {filterBar}

            {staffAttendance.length > 0 ? (
                <DataTable columns={columns} data={staffAttendance} renderRow={renderRow} />
            ) : (
                <EmptyState 
                    icon={<FiClock size={48} />} 
                    title="No staff attendance records found" 
                    subtitle="Try adjusting your date filters or search parameters." 
                />
            )}
        </div>
    );
}
