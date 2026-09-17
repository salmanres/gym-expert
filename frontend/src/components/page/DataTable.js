import React from 'react';
import Loader from './Loader';
import Pagination from './Pagination';

export default function DataTable({
    columns,
    data,
    loading,
    emptyMessage,
    renderRow,
    darkHeader = false,
    redHeader = true,
    headerBgClass = '',
    className = '',
    pagination = null
}) {
    if (loading) {
        return (
            <div className={`w-full overflow-hidden rounded-2xl bg-white border border-rose-200/50 shadow-2xs p-12 flex flex-col items-center justify-center ${className}`}>
                <div className="w-10 h-10 border-4 border-rose-200 border-t-[#CA0410] rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold text-xs mt-3">Loading data...</p>
            </div>
        );
    }

    const getHeaderBg = () => {
        if (darkHeader) return 'bg-[#162544] text-white';
        if (headerBgClass) return headerBgClass;
        return 'bg-[#CA0410] text-white';
    };

    return (
        <div className={`w-full overflow-hidden rounded-xl bg-white border border-slate-200/90 shadow-2xs font-['Roboto',sans-serif] ${className}`}>
            <div className="w-full overflow-x-auto custom-scrollbar">
                <table className="w-full text-left table-fixed min-w-[1000px] border-collapse">
                    {/* TABLE HEADER */}
                    <thead>
                        <tr className={`h-8 ${getHeaderBg()}`}>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`
                                        h-8
                                        py-1
                                        px-3
                                        font-['Roboto',sans-serif]
                                        text-[10.5px]
                                        font-bold
                                        tracking-wider
                                        uppercase
                                        whitespace-nowrap
                                        overflow-hidden
                                        text-ellipsis
                                        align-middle
                                        first:rounded-tl-xl
                                        last:rounded-tr-xl
                                        ${darkHeader ? 'text-white !bg-[#162544]' : (headerBgClass ? '' : 'text-white !bg-[#CA0410]')}
                                        ${col.className || ''}
                                    `}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* BODY */}
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {!data || data.length === 0 ? (
                            <tr className="h-36">
                                <td
                                    colSpan={columns.length}
                                    className="h-36 text-center bg-white align-middle"
                                >
                                    <p className="text-slate-400 font-medium text-xs">
                                        {emptyMessage || 'No data found.'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, index) => renderRow(row, index, index === data.length - 1))
                        )}
                    </tbody>
                </table>
            </div>

            {/* INTEGRATED PAGINATION */}
            {pagination && (
                <div className="border-t border-slate-100 bg-white px-4 py-1">
                    {React.isValidElement(pagination) ? (
                        pagination
                    ) : (
                        <Pagination {...pagination} />
                    )}
                </div>
            )}
        </div>
    );
}