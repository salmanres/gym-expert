import React from 'react';

export default function PageLayout({ children, className = '' }) {
    return (
        <div className={`p-0 m-0 w-full min-h-full flex flex-col bg-[#FAEEEF] ${className}`}>
            {children}
        </div>
    );
}
