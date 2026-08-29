import React, { useState } from 'react';
import { FiTrendingUp } from 'react-icons/fi';

export default function FeePaymentLineChart({ transactions = [] }) {
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'daily'
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // Prepare data based on viewMode
    const prepareChartData = () => {
        if (viewMode === 'monthly') {
            const monthsMap = {};
            const months = [];
            const now = new Date();

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
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (monthsMap[key]) {
                    monthsMap[key].amount += (tx.amountPaid || 0);
                    monthsMap[key].count += 1;
                }
            });

            return months.map(k => monthsMap[k]);
        } else {
            // Daily for last 14 days
            const daysMap = {};
            const days = [];
            const now = new Date();

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
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (daysMap[key]) {
                    daysMap[key].amount += (tx.amountPaid || 0);
                    daysMap[key].count += 1;
                }
            });

            return days.map(k => daysMap[k]);
        }
    };

    const data = prepareChartData();
    const maxAmount = Math.max(...data.map(d => d.amount), 1000);

    // Calculate totals
    const totalFee = data.reduce((sum, d) => sum + d.amount, 0);
    const avgFee = Math.round(totalFee / (data.length || 1));

    // SVG dimensions
    const width = 600;
    const height = 210;
    const paddingLeft = 45;
    const paddingRight = 25;
    const paddingTop = 35; // Headroom for highest points
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Build SVG Path points
    const points = data.map((d, index) => {
        const x = paddingLeft + (index / (data.length - 1 || 1)) * chartWidth;
        const y = height - paddingBottom - (d.amount / maxAmount) * chartHeight;
        return { x, y, ...d };
    });

    // Create polyline / area path d string
    const linePathD = points.reduce((acc, point, idx) => {
        return idx === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, '');

    const areaPathD = points.length > 0 
        ? `${linePathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
        : '';

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full gap-3 overflow-hidden">
            
            {/* Header with Title & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
                        <FiTrendingUp size={18} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">Fee Collection Analytics</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Real-time revenue trends & fee payment insights</p>
                    </div>
                </div>

                {/* View Switcher Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                            viewMode === 'monthly' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Monthly Trend
                    </button>
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                            viewMode === 'daily' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Last 14 Days
                    </button>
                </div>
            </div>

            {/* Metrics Quick Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 shrink-0">
                <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Collection</span>
                    <span className="text-lg font-black text-slate-900">₹{totalFee.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Average Fee</span>
                    <span className="text-lg font-black text-emerald-600">₹{avgFee.toLocaleString()}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Time Window</span>
                    <span className="text-xs font-bold text-slate-700">{viewMode === 'monthly' ? 'Last 6 Months' : 'Last 14 Days'}</span>
                </div>
            </div>

            {/* SVG Line & Area Chart Container */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-[190px]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                    <defs>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const yVal = height - paddingBottom - ratio * chartHeight;
                        return (
                            <line 
                                key={idx} 
                                x1={paddingLeft} 
                                y1={yVal} 
                                x2={width - paddingRight} 
                                y2={yVal} 
                                stroke="#f1f5f9" 
                                strokeDasharray="3 3" 
                            />
                        );
                    })}

                    {/* Gradient Area Fill */}
                    {points.length > 0 && (
                        <path d={areaPathD} fill="url(#emeraldGradient)" />
                    )}

                    {/* Polyline */}
                    {points.length > 0 && (
                        <path 
                            d={linePathD} 
                            fill="none" 
                            stroke="#059669" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    )}

                    {/* Data Points */}
                    {points.map((pt, idx) => (
                        <g key={idx} className="cursor-pointer">
                            <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="5"
                                fill="#ffffff"
                                stroke="#047857"
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
                                className="text-[10px] font-extrabold fill-slate-400"
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
                            top: `${((hoveredPoint.y - paddingTop) / chartHeight) * 50 + 20}%`
                        }}
                    >
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{hoveredPoint.label}</p>
                        <p className="text-xs font-black text-emerald-400">₹{hoveredPoint.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-300">{hoveredPoint.count} payment{hoveredPoint.count !== 1 ? 's' : ''}</p>
                    </div>
                )}
            </div>

        </div>
    );
}
