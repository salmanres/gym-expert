import React, { useRef } from 'react';
import { FiClock } from 'react-icons/fi';
import { formatTime } from '../../utils/dateUtils';

export default function TimePicker({
    label,
    required,
    error,
    value = '',
    onChange,
    name,
    placeholder = 'HH:MM AM/PM',
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

    const lastDismissRef = useRef(0);
    const lastOpenRef = useRef(0);

    /* =====================================================
       DISPLAY VALUE

       Backend/form value:
       14:30

       Display:
       02:30 PM
    ===================================================== */

    const displayValue = value
        ? formatTime(value)
        : '';

    /* =====================================================
       OPEN NATIVE TIME PICKER
    ===================================================== */

    const handleOpenPicker = (e) => {
        if (disabled) return;

        const now = Date.now();

        /*
         * Prevent repeated open calls caused by
         * blur/focus/browser native picker behaviour.
         */
        if (
            now - lastDismissRef.current < 450 ||
            now - lastOpenRef.current < 450
        ) {
            return;
        }

        lastOpenRef.current = now;

        const picker = activePickerRef.current;

        if (!picker) return;

        try {
            if (
                typeof picker.showPicker ===
                'function'
            ) {
                picker.showPicker();
            } else {
                picker.focus();
            }
        } catch {
            try {
                picker.focus();
            } catch {
                // Ignore browser-specific focus errors
            }
        }
    };

    /* =====================================================
       NATIVE CHANGE
    ===================================================== */

    const handleNativeChange = (e) => {
        lastDismissRef.current = Date.now();

        if (onChange) {
            onChange(e);
        }
    };

    /* =====================================================
       NATIVE BLUR
    ===================================================== */

    const handleNativeBlur = () => {
        lastDismissRef.current = Date.now();
    };

    /* =====================================================
       CONTAINER STYLES
    ===================================================== */

    const containerStyles = compact
        ? `
            group
            relative
            flex
            items-center
            justify-between
            h-9
            px-2.5
            rounded-xl
            border
            bg-white
            transition-all
            duration-150
            cursor-pointer
            select-none
            text-xs

            ${
                error
                    ? `
                        border-rose-400
                        bg-rose-50/50
                        focus-within:border-rose-500
                        focus-within:ring-2
                        focus-within:ring-rose-500/15
                    `
                    : `
                        border-slate-200/90
                        hover:border-[#CA0410]
                        focus-within:border-[#CA0410]
                        focus-within:ring-2
                        focus-within:ring-[#CA0410]/20
                    `
            }

            min-w-[125px]

            ${
                disabled
                    ? `
                        opacity-60
                        cursor-not-allowed
                        bg-slate-50
                    `
                    : ''
            }

            ${className}
        `
        : `
            group
            relative
            flex
            items-center
            justify-between
            w-full
            h-10
            px-3.5
            rounded-xl
            border
            transition-all
            duration-150
            cursor-pointer
            select-none
            shadow-2xs

            ${
                error
                    ? `
                        border-rose-400
                        bg-rose-50/50
                        text-rose-950

                        hover:border-rose-500

                        focus-within:border-rose-500
                        focus-within:ring-4
                        focus-within:ring-rose-500/15
                    `
                    : `
                        border-slate-200/90
                        bg-white
                        text-slate-800

                        hover:border-[#CA0410]

                        focus-within:border-[#CA0410]
                        focus-within:ring-4
                        focus-within:ring-[#CA0410]/10
                    `
            }

            ${
                disabled
                    ? `
                        opacity-60
                        cursor-not-allowed
                        bg-slate-50
                    `
                    : ''
            }

            ${className}
        `;

    /* =====================================================
       TIME CONTENT
    ===================================================== */

    const timeContent = (
        <div
            onClick={handleOpenPicker}
            className={containerStyles}
        >
            {/* =================================================
                TEXT AREA
            ================================================= */}

            <div
                className="
                    flex
                    items-center
                    gap-1.5
                    min-w-0
                    flex-1
                    pointer-events-none
                "
            >
                {/* PREFIX */}

                {prefix && (
                    <span
                        className="
                            text-[10px]
                            font-bold
                            text-slate-400
                            uppercase
                            tracking-wider
                            shrink-0
                        "
                    >
                        {prefix}
                    </span>
                )}

                {/* TIME VALUE */}

                <span
                    className={`
                        block
                        text-[13px]
                        tracking-wide
                        truncate

                        ${
                            displayValue
                                ? `
                                    text-slate-800
                                    font-semibold
                                `
                                : `
                                    text-slate-400
                                    font-medium
                                `
                        }
                    `}
                >
                    {displayValue ||
                        placeholder}
                </span>
            </div>

            {/* =================================================
                CLOCK ICON
            ================================================= */}

            <FiClock
                className={`
                    shrink-0
                    ml-1.5
                    pointer-events-none
                    transition-all
                    duration-150

                    ${
                        error
                            ? `
                                text-rose-400
                                group-hover:text-rose-500
                            `
                            : `
                                text-slate-400
                                group-hover:text-[#CA0410]
                                group-focus-within:text-[#CA0410]
                            `
                    }

                    ${
                        compact
                            ? 'text-xs'
                            : 'text-base'
                    }
                `}
            />

            {/* =================================================
                HIDDEN NATIVE TIME INPUT

                Actual value remains HH:mm.
                Browser handles the native picker.
            ================================================= */}

            <input
                ref={activePickerRef}
                type="time"
                name={name}
                value={value || ''}
                onChange={handleNativeChange}
                onBlur={handleNativeBlur}
                disabled={disabled}
                required={required}
                tabIndex={-1}
                aria-hidden="true"
                {...props}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1px',
                    height: '1px',
                    opacity: 0,
                    pointerEvents: 'none',
                    border: 0,
                    padding: 0,
                    margin: 0
                }}
            />
        </div>
    );

    /* =====================================================
       COMPACT MODE
    ===================================================== */

    if (compact) {
        return timeContent;
    }

    /* =====================================================
       NORMAL MODE
    ===================================================== */

    return (
        <div
            className={`
                flex
                flex-col
                min-w-0
                ${containerClassName}
            `}
        >
            {/* LABEL */}

            {label && (
                <label
                    className={`
                        block
                        text-[13px]
                        font-bold
                        mb-1.5
                        tracking-tight

                        ${
                            error
                                ? 'text-rose-600'
                                : 'text-slate-700'
                        }
                    `}
                >
                    {label}{' '}

                    {required && (
                        <span className="text-[#CA0410] ml-0.5">
                            *
                        </span>
                    )}
                </label>
            )}

            {/* TIME PICKER */}

            {timeContent}

            {/* ERROR */}

            {error && (
                <p
                    className="
                        text-[11px]
                        font-semibold
                        text-rose-500
                        mt-1
                        flex
                        items-center
                        gap-1
                    "
                >
                    {error}
                </p>
            )}
        </div>
    );
}