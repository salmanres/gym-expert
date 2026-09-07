import React from 'react';
import Loader from './Loader';

export default function DataTable({
    columns,
    data,
    loading,
    emptyMessage,
    renderRow,
    darkHeader = false,
    className = ''
}) {
    if (loading) {
        return <Loader text="Loading data..." />;
    }

    return (
        <div
            className={`
                bg-[#FEFFFE]
                rounded-xl
                border border-slate-200
                shadow-sm
                overflow-hidden
                w-full
                flex flex-col
                font-['Roboto',sans-serif]
                ${className}
            `}
        >
            <div className="w-full overflow-x-auto custom-scrollbar flex-1 min-h-0">
                <table className="w-full table-fixed border-collapse text-left">

                    {/* HEADER */}
                    <thead
                        className={`
                            sticky top-0 z-10
                            ${
                                darkHeader
                                    ? 'bg-[#162544] text-white'
                                    : 'bg-[#FEFFFE] text-[#737373]'
                            }
                        `}
                    >
                        <tr className="border-b border-slate-200">
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`
                                        h-9
                                        px-4
                                        py-2
                                        text-sm
                                        font-bold
                                        normal-case
                                        tracking-normal
                                        whitespace-nowrap
                                        align-middle
                                        ${
                                            darkHeader
                                                ? 'text-white'
                                                : 'text-[#737373]'
                                        }
                                        ${col.className || ''}
                                    `}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* BODY */}
                    <tbody className="divide-y divide-slate-100 bg-[#FEFFFE]">
                        {!data || data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="h-[160px] text-center"
                                >
                                    <p className="text-slate-400 font-medium text-xs">
                                        {emptyMessage || 'No data found.'}
                                    </p>
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