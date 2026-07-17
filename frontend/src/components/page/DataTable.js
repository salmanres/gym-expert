import React from 'react';
import Loader from './Loader';

export default function DataTable({ columns, data, loading, emptyMessage, renderRow }) {
    if (loading) {
        return <Loader text="Loading ..." />;
    }

    return (
        <div className="bg-white flex-1 overflow-hidden">
            <div className="overflow-x-auto h-full w-full custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                        <tr className="border-b border-slate-200">
                            {columns.map((col, index) => (
                                <th key={index} className={`py-3 px-4 font-bold text-slate-600 uppercase text-[10px] sm:text-xs tracking-wider whitespace-nowrap ${col.className || ''}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="py-12 text-center">
                                    <p className="text-slate-500 font-medium text-sm">{emptyMessage || 'No data found.'}</p>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, index) => renderRow(row, index))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
