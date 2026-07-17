import React from 'react';

export default function PageLayout({ children }) {
    return (
        <div className="p-0 m-0 w-full h-full flex flex-col animate-in fade-in duration-300 bg-white">
            {children}
        </div>
    );
}
