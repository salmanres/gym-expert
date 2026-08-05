import React from 'react';
import Loader from './Loader';

export default function DataTable({ columns, data, loading, emptyMessage, renderRow, darkHeader = false }) {
    if (loading) {
        return <Loader text="Loading data..." />;
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className={darkHeader ? "bg-[#162544] text-white" : "bg-slate-50 text-slate-600 border-b border-slate-200"}>
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className={`py-3.5 px-4 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap ${darkHeader ? 'text-slate-100' : 'text-slate-600'} ${col.className || ''}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {!data || data.length === 0 ? (
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
