import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    avatarText,
    avatarBg = "bg-[#CA0410]",
    avatarTextColor = "text-white",
    badge,
    icon: Icon,
    headerRight,
    children,
    footer,
    maxWidth = "max-w-2xl",
    className = "",
    bodyClassName = "",
    headerBgStyle
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                onClose();
            }
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const defaultGradient = {
        background: 'linear-gradient(135deg, #07101A 0%, #1c0b11 50%, #A5151B 100%)'
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
            {/* Backdrop click */}
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

            <div 
                className={`
                    relative z-10 bg-white w-full max-h-[88vh] rounded-[28px] shadow-2xl overflow-hidden flex flex-col font-['Roboto',sans-serif]
                    ${maxWidth} ${className} animate-in zoom-in-95 duration-200 border border-slate-100/50 my-auto
                `}
            >
                {/* Figma Linear Gradient Header (Rectangle 62) */}
                <div 
                    className="px-6 sm:px-8 py-5 min-h-[90px] text-white flex items-center justify-between shrink-0 relative overflow-hidden select-none rounded-t-[28px]"
                    style={headerBgStyle || defaultGradient}
                >
                    {/* Header Info */}
                    <div className="flex items-center gap-4 min-w-0 z-10">
                        {avatarText ? (
                            <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl ${avatarBg} ${avatarTextColor} font-black text-2xl flex items-center justify-center shadow-lg shrink-0`}>
                                {avatarText}
                            </div>
                        ) : Icon ? (
                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#CA0410] text-white flex items-center justify-center shadow-lg shrink-0">
                                <Icon size={24} />
                            </div>
                        ) : null}

                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight truncate">
                                    {title}
                                </h2>
                                {badge && (
                                    <div className="shrink-0">{badge}</div>
                                )}
                            </div>
                            {subtitle && (
                                <p className="text-xs sm:text-sm text-slate-200/90 font-medium mt-1 leading-snug truncate">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Controls & Close Button */}
                    <div className="flex items-center gap-2.5 z-10 shrink-0">
                        {headerRight}
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
                                title="Close"
                            >
                                <FiX size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Modal Body */}
                <div className={`overflow-y-auto flex-1 custom-scrollbar p-6 sm:p-8 bg-white ${bodyClassName}`}>
                    {children}
                </div>

                {/* Modal Footer */}
                {footer && (
                    <div className="px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white shrink-0 rounded-b-[28px]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
