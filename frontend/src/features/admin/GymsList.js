import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiMapPin, FiMail, FiPhone } from 'react-icons/fi';

function GymsList() {
    const [gyms, setGyms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGyms = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get('http://localhost:5000/api/gyms', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setGyms(data);
            } catch (error) {
                toast.error("Failed to fetch gyms");
            } finally {
                setLoading(false);
            }
        };

        fetchGyms();
    }, []);

    if (loading) {
        return <div className="text-slate-500 font-bold flex justify-center py-10">Loading gyms...</div>;
    }

    return (
        <div className="w-full h-full bg-slate-50/50 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Registered Gyms</h1>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">Manage and view all gym franchises on the platform.</p>
                </div>
            </div>

            <div className="flex-1 w-full bg-white overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-2 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Gym Name</th>
                                <th className="px-4 py-2 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Owner</th>
                                <th className="px-4 py-2 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Contact</th>
                                <th className="px-4 py-2 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Address</th>
                                <th className="px-4 py-2 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gyms.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 lg:px-12 py-12 text-center text-slate-500 font-medium">
                                        No gyms registered yet.
                                    </td>
                                </tr>
                            ) : (
                                gyms.map((gym) => (
                                    <tr key={gym._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2">
                                            <div className="font-bold text-slate-800 text-sm">{gym.name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">ID: {gym._id.slice(-6)}</div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="font-semibold text-slate-700 text-xs">{gym.ownerId?.name || 'N/A'}</div>
                                            <div className="text-[10px] text-slate-500">{gym.ownerId?.email}</div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex flex-col gap-0.5 text-xs text-slate-600 font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <FiMail className="text-slate-400 shrink-0" /> {gym.contactEmail}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <FiPhone className="text-slate-400 shrink-0" /> {gym.contactPhone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-start gap-1.5 text-xs text-slate-600 whitespace-normal min-w-[200px] font-medium">
                                                <FiMapPin className="text-slate-400 mt-0.5 shrink-0" />
                                                <span>{gym.address}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${gym.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {gym.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default GymsList;
