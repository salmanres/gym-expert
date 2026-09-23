import React, { useRef } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';

export default function DatePicker({
    label,
    required,
    error,
    value = '',
    onChange,
    name,
    min,
    max,
    placeholder = 'DD/MM/YYYY',
    prefix = '',
    compact = false,
    className = '',
    containerClassName = '',
    inputRef,
    disabled = false,
    ...props
}) {
    const internalPickerRef = useRef(null);
    const activePickerRef = inputRef || internalPickerRef;
    
    // Cooldown refs to prevent infinite loop on dismiss/re-focus
    const lastDismissRef = useRef(0);
    const lastOpenRef = useRef(0);

    // Convert value (YYYY-MM-DD or Date) to DD/MM/YYYY for user display
    const displayValue = value ? formatDate(value) : '';

    const handleOpenPicker = (e) => {
        if (disabled) return;
        
        const now = Date.now();
        // Prevent re-trigger if just dismissed, blurred, or opened within 450ms
        if (now - lastDismissRef.current < 450 || now - lastOpenRef.current < 450) {
            return;
        }
        lastOpenRef.current = now;

        if (activePickerRef.current) {
            try {
                if (typeof activePickerRef.current.showPicker === 'function') {
                    activePickerRef.current.showPicker();
                } else {
                    activePickerRef.current.focus();
                }
            } catch {
                activePickerRef.current.focus();
            }
        }
    };

    const handleNativeChange = (e) => {
        lastDismissRef.current = Date.now();
        if (onChange) {
            onChange(e);
        }
    };

    const handleNativeBlur = () => {
        lastDismissRef.current = Date.now();
    };

    const containerStyles = compact
        ? `group relative flex items-center justify-between h-9 px-2.5 rounded-xl border border-rose-200/80 bg-white/90 backdrop-blur-md shadow-2xs transition-all duration-150 cursor-pointer select-none text-xs hover:border-[#CA0410] focus-within:border-[#CA0410] focus-within:ring-2 focus-within:ring-[#CA0410]/20 min-w-[125px] ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`
        : `group relative flex items-center justify-between w-full h-10 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer shadow-2xs select-none ${
            error 
                ? 'border-rose-400 bg-rose-50/50 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/15 text-rose-950' 
                : 'border-slate-200/90 bg-white hover:border-slate-300 focus-within:border-[#CA0410] focus-within:ring-4 focus-within:ring-rose-500/10 text-slate-800'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'bg-white'} ${className}`;

    const dateContent = (
        <div onClick={handleOpenPicker} className={containerStyles}>
            {/* Visual Formatted Text Display */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 pointer-events-none">
                {prefix && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        {prefix}
                    </span>
                )}
                <span className={`${compact ? 'text-xs' : 'text-[13px]'} tracking-wide truncate ${
                    displayValue ? 'text-slate-800 font-semibold' : 'text-slate-400 font-medium'
                }`}>
                    {displayValue || placeholder}
                </span>
            </div>

            {/* Calendar Icon */}
            <FiCalendar className={`text-slate-400 group-hover:text-[#CA0410] transition-colors shrink-0 ml-1.5 pointer-events-none ${compact ? 'text-xs' : 'text-base'}`} />

            {/* Hidden native date picker with dismissal listener */}
            <input
                ref={activePickerRef}
                type="date"
                name={name}
                value={value || ''}
                onChange={handleNativeChange}
                onBlur={handleNativeBlur}
                min={min}
                max={max}
                disabled={disabled}
                required={required}
                tabIndex={-1}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1px',
                    height: '1px',
                    opacity: 0,
                    pointerEvents: 'none'
                }}
                {...props}
            />
        </div>
    );

    if (compact) {
        return dateContent;
    }

    return (
        <div className={`flex flex-col ${containerClassName}`}>
            {label && (
                <label className={`block text-[12px] font-bold mb-1.5 tracking-tight ${error ? 'text-rose-600' : 'text-slate-700'}`}>
                    {label} {required && <span className="text-[#CA0410] ml-0.5">*</span>}
                </label>
            )}
            {dateContent}
            {error && <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">{error}</p>}
        </div>
    );
}
