import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import { toast } from 'react-toastify';
import { FiMapPin, FiMail, FiPhone } from 'react-icons/fi';
import DataTable from '../../components/page/DataTable';
import Loader from '../../components/page/Loader';
import PageLayout from '../../components/page/PageLayout';
import PageHeader from '../../components/page/PageHeader';

function GymsList() {
    const [gyms, setGyms] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        const fetchGyms = async () => {
            try {
                const { data } = await apiClient.get('/gyms');
                setGyms(data || []);
            } catch (error) {
                toast.error("Failed to fetch gyms");
            } finally {
                setLoading(false);
            }
        };

        fetchGyms();
    }, []);

    const avatarStyles = [
        { bg: 'bg-[#FFECEC]', text: 'text-[#E53935]' },
        { bg: 'bg-[#FFF9C4]', text: 'text-[#F57F17]' },
        { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]' },
        { bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        { bg: 'bg-[#F3E8FF]', text: 'text-[#7E22CE]' },
        { bg: 'bg-[#FFEDD5]', text: 'text-[#EA580C]' },
    ];

    const getAvatarStyle = (name, index) => {
        const charCode = (name || '').charCodeAt(0) || 0;
        return avatarStyles[(charCode + index) % avatarStyles.length];
    };

    const totalItems = gyms.length;
    const paginatedGyms = gyms.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = [
        { label: 'GYM NAME', className: 'w-[28%] pl-6' },
        { label: 'OWNER', className: 'w-[20%] pl-3' },
        { label: 'CONTACT', className: 'w-[20%] pl-3' },
        { label: 'LOCATION & ADDRESS', className: 'w-[22%] pl-3' },
        { label: 'STATUS', className: 'w-[10%] pl-1 text-left' }
    ];

    const renderRow = (gym, index) => {
        const avatarStyle = getAvatarStyle(gym.name, index);

        return (
            <tr key={gym._id} className="bg-white hover:bg-slate-50/70 transition-colors duration-150 group">
                {/* GYM NAME */}
                <td className="py-2.5 pl-6 pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full ${avatarStyle.bg} ${avatarStyle.text} font-bold text-sm flex items-center justify-center shrink-0`}>
                            {(gym.name || 'G').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                            <span className="font-bold text-[#111827] text-[13px] leading-tight truncate">
                                {gym.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                                ID: {gym._id.slice(-6).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </td>

                {/* OWNER */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[12px] leading-tight">
                        <span className="font-bold text-[#111827] text-[13px]">
                            {gym.ownerId?.name || 'N/A'}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                            {gym.ownerId?.email || ''}
                        </span>
                    </div>
                </td>

                {/* CONTACT */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex flex-col gap-0.5 text-[12px] leading-tight">
                        {gym.contactPhone && (
                            <div className="flex items-center gap-1.5 font-bold text-[#111827]">
                                <FiPhone className="text-emerald-600 text-xs shrink-0" />
                                <span>{gym.contactPhone}</span>
                            </div>
                        )}
                        {gym.contactEmail && (
                            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                                <FiMail className="text-slate-400 text-xs shrink-0" />
                                <span>{gym.contactEmail}</span>
                            </div>
                        )}
                    </div>
                </td>

                {/* ADDRESS */}
                <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-600 font-medium max-w-[280px]">
                        <FiMapPin className="text-slate-400 mt-0.5 shrink-0 text-xs" />
                        <span className="line-clamp-2">{gym.address || 'Address not specified'}</span>
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-2.5 pl-1 pr-6 text-left align-middle">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border leading-none shadow-2xs ${
                        gym.isActive 
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                        {gym.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
            </tr>
        );
    };

    if (loading) {
        return <Loader text="Loading gyms..." />;
    }

    return (
        <PageLayout>
            <PageHeader 
                title="Registered Gyms" 
                subtitle="Manage and view all gym franchises on the platform." 
            />

            <div className="px-4 sm:px-6 py-4 pb-12 w-full flex flex-col gap-4 min-h-0 flex-1">
                <DataTable 
                    columns={columns} 
                    data={paginatedGyms} 
                    loading={loading}
                    emptyMessage="No gyms registered yet." 
                    renderRow={renderRow} 
                    pagination={{
                        currentPage: currentPage,
                        totalItems: totalItems,
                        pageSize: pageSize,
                        onPageChange: (p) => setCurrentPage(p),
                        onPageSizeChange: (s) => setPageSize(s),
                        itemLabel: "gyms"
                    }}
                />
            </div>
        </PageLayout>
    );
}

export default GymsList;
