import React from 'react';
import { FiActivity } from 'react-icons/fi';

export default function LineChart({ title, subtitle, points = [], color = '#10b981' }) {
    if (!points || points.length === 0) {
        points = [
            { label: 'Point 1', value: 10 },
            { label: 'Point 2', value: 25 },
            { label: 'Point 3', value: 18 },
            { label: 'Point 4', value: 40 },
            { label: 'Point 5', value: 35 },
            { label: 'Point 6', value: 60 }
        ];
    }

    const width = 600;
    const height = 180;
    const padding = 30;

    const maxVal = Math.max(...points.map(p => p.value), 10);
    const minVal = 0;

    const getX = (index) => padding + (index * (width - 2 * padding)) / Math.max(1, points.length - 1);
    const getY = (value) => height - padding - ((value - minVal) * (height - 2 * padding)) / (maxVal - minVal || 1);

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.value)}`).join(' ');
    const areaD = `${pathD} L ${getX(points.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`;

    const gradientId = `lineGrad-${Math.random().toString(36).substring(2, 7)}`;

    return (
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <FiActivity className="text-emerald-600" /> {title}
                    </h4>
                    {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-md border border-emerald-200">
                    Live Trend Line
                </span>
            </div>

            <div className="w-full overflow-x-auto custom-scrollbar">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {[0, 0.33, 0.66, 1].map((r, i) => {
                        const y = padding + r * (height - 2 * padding);
                        return (
                            <line 
                                key={i} 
                                x1={padding} 
                                y1={y} 
                                x2={width - padding} 
                                y2={y} 
                                stroke="#f1f5f9" 
                                strokeDasharray="4 4" 
                            />
                        );
                    })}

                    {/* Area Fill */}
                    <path d={areaD} fill={`url(#${gradientId})`} />

                    {/* Main Line */}
                    <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Point Circles */}
                    {points.map((p, i) => (
                        <g key={i} className="group cursor-pointer">
                            <circle 
                                cx={getX(i)} 
                                cy={getY(p.value)} 
                                r="5" 
                                fill="#ffffff" 
                                stroke={color} 
                                strokeWidth="3" 
                                className="transition-all duration-200 group-hover:r-7"
                            />
                            <text 
                                x={getX(i)} 
                                y={getY(p.value) - 10} 
                                textAnchor="middle" 
                                className="text-[10px] font-bold fill-slate-700 opacity-80 group-hover:opacity-100"
                            >
                                {typeof p.value === 'number' && p.value >= 1000 ? `₹${p.value.toLocaleString()}` : p.value}
                            </text>
                            <text 
                                x={getX(i)} 
                                y={height - 8} 
                                textAnchor="middle" 
                                className="text-[10px] font-semibold fill-slate-400"
                            >
                                {p.label}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
