import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({
    currentPage = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    itemLabel = 'leads'
}) {
    if (totalItems === 0) return null;

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2.5 px-3 w-full text-xs font-medium text-slate-500 select-none">
            {/* Left: Showing info */}
            <div>
                Showing <span className="font-semibold text-slate-700">{startItem}</span> to <span className="font-semibold text-slate-700">{endItem}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> {itemLabel}
            </div>

            {/* Center: Pagination controls */}
            <div className="flex items-center gap-1">
                {/* Prev Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                    title="Previous Page"
                >
                    <FiChevronLeft size={16} />
                </button>

                {/* Page Numbers */}
                {getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                        return (
                            <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400">
                                ...
                            </span>
                        );
                    }

                    const isActive = page === currentPage;
                    return (
                        <button
                            key={`page-${page}`}
                            type="button"
                            onClick={() => onPageChange(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                isActive
                                    ? 'bg-[#CA0410] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            {page}
                        </button>
                    );
                })}

                {/* Next Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                    title="Next Page"
                >
                    <FiChevronRight size={16} />
                </button>
            </div>

            {/* Right: Page Size Dropdown */}
            {onPageSizeChange && (
                <div className="flex items-center gap-2">
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            onPageSizeChange(Number(e.target.value));
                            onPageChange(1);
                        }}
                        className="h-8 px-3 bg-[#CA0410] text-white border-0 rounded-md text-xs font-bold shadow-2xs focus:outline-none cursor-pointer"
                    >
                        {pageSizeOptions.map((opt) => (
                            <option key={opt} value={opt} className="bg-white text-slate-800">
                                {opt} per page
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
