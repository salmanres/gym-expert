import React from 'react';

export default function FormSection({ title, subtitle, icon, action, children, className = '', containerClassName = '' }) {
    return (
        <div className={`bg-white rounded-2xl border border-rose-200/80 p-6 md:p-7 shadow-[0_4px_20px_-4px_rgba(202,4,16,0.03),0_2px_6px_-1px_rgba(0,0,0,0.02)] space-y-5 mb-6 last:mb-0 transition-all ${containerClassName}`}>
            {title && (
                <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-rose-100/80">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/70 text-[#CA0410] border border-rose-200/80 flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                                {icon}
                            </div>
                        )}
                        <div>
                            <h3 className="text-[15px] font-black text-slate-900 leading-tight tracking-tight">{title}</h3>
                            {subtitle && (
                                <p className="text-[12px] text-slate-500 font-medium mt-0.5 leading-normal">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className={className || "grid grid-cols-1 md:grid-cols-3 gap-5"}>
                {children}
            </div>
        </div>
    );
}
