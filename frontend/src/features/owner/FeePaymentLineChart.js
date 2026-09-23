import React, { useState } from 'react';

export default function FeePaymentLineChart({ transactions = [], loading = false }) {
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'daily'
    const [hoveredPoint, setHoveredPoint] = useState(null);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Prepare data based on viewMode
    const prepareChartData = () => {
        if (viewMode === 'monthly') {
            const monthsMap = {};
            const months = [];

            // Last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleDateString('default', { month: 'short' });
                monthsMap[key] = { label, amount: 0, count: 0 };
                months.push(key);
            }

            transactions.forEach(tx => {
                const d = new Date(tx.paymentDate || tx.createdAt);
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (monthsMap[key]) {
                        monthsMap[key].amount += (tx.amountPaid || 0);
                        monthsMap[key].count += 1;
                    }
                }
            });

            return months.map(k => monthsMap[k]);
        } else {
            // Daily for last 14 days
            const daysMap = {};
            const days = [];

            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const label = d.toLocaleDateString('default', { day: '2-digit', month: 'short' });
                daysMap[key] = { label, amount: 0, count: 0 };
                days.push(key);
            }

            transactions.forEach(tx => {
                const d = new Date(tx.paymentDate || tx.createdAt);
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (daysMap[key]) {
                        daysMap[key].amount += (tx.amountPaid || 0);
                        daysMap[key].count += 1;
                    }
                }
            });

            return days.map(k => daysMap[k]);
        }
    };

    const data = prepareChartData();
    const maxAmount = Math.max(...data.map(d => d.amount), 1000);

    // Calculate totals for currently selected period
    const totalFee = data.reduce((sum, d) => sum + d.amount, 0);
    const totalCount = data.reduce((sum, d) => sum + d.count, 0);
    const avgFee = totalCount > 0 ? Math.round(totalFee / totalCount) : 0;

    // Dynamic Growth Calculations
    let collectionGrowth = { percentage: '0%', isPositive: true };
    let avgGrowth = { percentage: '0%', isPositive: true };

    if (viewMode === 'monthly') {
        const curMonthTx = transactions.filter(t => {
            const d = new Date(t.paymentDate || t.createdAt);
            return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const prevMonthTx = transactions.filter(t => {
            const d = new Date(t.paymentDate || t.createdAt);
            return !isNaN(d.getTime()) && d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });

        const curTotal = curMonthTx.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
        const prevTotal = prevMonthTx.reduce((sum, t) => sum + (t.amountPaid || 0), 0);

        if (prevTotal === 0) {
            collectionGrowth = { percentage: curTotal > 0 ? '+100%' : '0%', isPositive: true };
        } else {
            const diff = curTotal - prevTotal;
            const pct = Math.round((diff / prevTotal) * 100);
            const displayPct = Math.abs(pct) > 999 ? (pct > 0 ? '+999%' : '-999%') : `${pct >= 0 ? '+' : ''}${pct}%`;
            collectionGrowth = { percentage: displayPct, isPositive: pct >= 0 };
        }

        const curAvg = curMonthTx.length > 0 ? curTotal / curMonthTx.length : 0;
        const prevAvg = prevMonthTx.length > 0 ? prevTotal / prevMonthTx.length : 0;

        if (prevAvg === 0) {
            avgGrowth = { percentage: curAvg > 0 ? '+100%' : '0%', isPositive: true };
        } else {
            const diff = curAvg - prevAvg;
            const pct = Math.round((diff / prevAvg) * 100);
            const displayPct = Math.abs(pct) > 999 ? (pct > 0 ? '+999%' : '-999%') : `${pct >= 0 ? '+' : ''}${pct}%`;
            avgGrowth = { percentage: displayPct, isPositive: pct >= 0 };
        }
    } else {
        // 14 Days: First 7 days vs previous 7 days
        const recent7Data = data.slice(7);
        const prev7Data = data.slice(0, 7);

        const recTotal = recent7Data.reduce((sum, d) => sum + d.amount, 0);
        const prevTotal = prev7Data.reduce((sum, d) => sum + d.amount, 0);

        if (prevTotal === 0) {
            collectionGrowth = { percentage: recTotal > 0 ? '+100%' : '0%', isPositive: true };
        } else {
            const diff = recTotal - prevTotal;
            const pct = Math.round((diff / prevTotal) * 100);
            const displayPct = Math.abs(pct) > 999 ? (pct > 0 ? '+999%' : '-999%') : `${pct >= 0 ? '+' : ''}${pct}%`;
            collectionGrowth = { percentage: displayPct, isPositive: pct >= 0 };
        }

        const recCount = recent7Data.reduce((sum, d) => sum + d.count, 0);
        const prevCount = prev7Data.reduce((sum, d) => sum + d.count, 0);
        const recAvg = recCount > 0 ? recTotal / recCount : 0;
        const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;

        if (prevAvg === 0) {
            avgGrowth = { percentage: recAvg > 0 ? '+100%' : '0%', isPositive: true };
        } else {
            const diff = recAvg - prevAvg;
            const pct = Math.round((diff / prevAvg) * 100);
            const displayPct = Math.abs(pct) > 999 ? (pct > 0 ? '+999%' : '-999%') : `${pct >= 0 ? '+' : ''}${pct}%`;
            avgGrowth = { percentage: displayPct, isPositive: pct >= 0 };
        }
    }

    // SVG dimensions
    const width = 600;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Build SVG Path points
    const points = data.map((d, index) => {
        const x = paddingLeft + (index / (data.length - 1 || 1)) * chartWidth;
        const y = height - paddingBottom - (d.amount / maxAmount) * chartHeight;
        return { x, y, ...d };
    });

    // Spline curve function
    const getCurvedPath = (pts) => {
        if (pts.length === 0) return '';
        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
        
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i === 0 ? 0 : i - 1];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return path;
    };

    const smoothLineD = getCurvedPath(points);
    const smoothAreaD = points.length > 0 
        ? `${smoothLineD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
        : '';

    return (
        <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs flex flex-col justify-between h-full gap-4 overflow-hidden">
            
            {/* Header with Red Themed Icon, Title & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-rose-50 text-[#CA0410] border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                            <line x1="12" y1="20" x2="12" y2="8"></line>
                            <line x1="18" y1="20" x2="18" y2="4"></line>
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-base tracking-tight leading-tight">Fee Collection Analytics</h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Real-time revenue trends & fee payment insights</p>
                    </div>
                </div>

                {/* View Switcher Pills */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                            viewMode === 'monthly' ? 'bg-black text-white shadow-2xs' : 'bg-[#E2E8F0] text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                        Monthly Trend
                    </button>
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                            viewMode === 'daily' ? 'bg-black text-white shadow-2xs' : 'bg-[#E2E8F0] text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                        14 Days
                    </button>
                </div>
            </div>

            {/* 3 Metric Cards Sub-Bar with Dynamic Backend Values */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 shrink-0 items-stretch">
                {/* 1. TOTAL COLLECTION */}
                <div className="bg-[#F8F9FA] p-3.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col justify-between min-w-0 h-full min-h-[88px]">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">TOTAL COLLECTION</span>
                    <div className="mt-1.5 min-w-0">
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 border-2 border-rose-200 border-t-[#CA0410] rounded-full animate-spin shrink-0"></div>
                                <span className="text-xs font-bold text-slate-400 animate-pulse">Loading...</span>
                            </div>
                        ) : (
                            <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none break-words">
                                ₹{totalFee.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. AVERAGE FEE */}
                <div className="bg-[#F8F9FA] p-3.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col justify-between min-w-0 h-full min-h-[88px]">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">AVERAGE FEE</span>
                    <div className="mt-1.5 min-w-0">
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 border-2 border-rose-200 border-t-[#CA0410] rounded-full animate-spin shrink-0"></div>
                                <span className="text-xs font-bold text-slate-400 animate-pulse">Loading...</span>
                            </div>
                        ) : (
                            <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none break-words">
                                ₹{avgFee.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. TIME WINDOW */}
                <div className="bg-[#F8F9FA] p-3.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col justify-between min-w-0 h-full min-h-[88px]">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">TIME WINDOW</span>
                    <div className="mt-1.5">
                        <span className="text-sm sm:text-base font-black text-slate-900 leading-none">
                            {viewMode === 'monthly' ? 'Last 6 months' : 'Last 14 days'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Smooth Red Spline Line & Area Chart Container matching Theme */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-[160px]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                    <defs>
                        <linearGradient id="crimsonGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#CA0410" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#CA0410" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                        const yVal = height - paddingBottom - ratio * chartHeight;
                        return (
                            <line 
                                key={idx} 
                                x1={paddingLeft} 
                                y1={yVal} 
                                x2={width - paddingRight} 
                                y2={yVal} 
                                stroke="#fce7e9" 
                                strokeDasharray="3 3" 
                            />
                        );
                    })}

                    {/* Smooth Crimson Gradient Area Fill */}
                    {points.length > 0 && (
                        <path d={smoothAreaD} fill="url(#crimsonGradient)" />
                    )}

                    {/* Smooth Crimson Spline Curve Line */}
                    {points.length > 0 && (
                        <path 
                            d={smoothLineD} 
                            fill="none" 
                            stroke="#CA0410" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    )}

                    {/* Interactive Red Data Points */}
                    {points.map((pt, idx) => (
                        <g key={idx} className="cursor-pointer">
                            <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="4.5"
                                fill="#ffffff"
                                stroke="#CA0410"
                                strokeWidth="2.5"
                                onMouseEnter={() => setHoveredPoint(pt)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                className="transition-all hover:r-6"
                            />

                            {/* X-Axis Labels */}
                            <text
                                x={pt.x}
                                y={height - 8}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-slate-400"
                            >
                                {pt.label}
                            </text>
                        </g>
                    ))}
                </svg>

                {/* Hover Tooltip Overlay */}
                {hoveredPoint && (
                    <div 
                        className="absolute bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full text-center z-10"
                        style={{
                            left: `${((hoveredPoint.x - paddingLeft) / chartWidth) * 85 + 7}%`,
                            top: `${((hoveredPoint.y - paddingTop) / chartHeight) * 50 + 15}%`
                        }}
                    >
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{hoveredPoint.label}</p>
                        <p className="text-xs font-black text-rose-400">₹{hoveredPoint.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-300">{hoveredPoint.count} payment{hoveredPoint.count !== 1 ? 's' : ''}</p>
                    </div>
                )}
            </div>

        </div>
    );
}
