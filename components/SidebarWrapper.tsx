"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import GlobalSidebar to prevent hydration mismatch from browser extensions
// This MUST be in a client component for ssr: false to look clean or be allowed depending on contexts
const GlobalSidebar = dynamic(
    () => import("./GlobalSidebar").then((mod) => mod.GlobalSidebar),
    {
        ssr: false,
        loading: () => (
            <aside className="w-16 bg-[#0c0c0e] border-r border-zinc-800 flex flex-col items-center py-4 z-50 shrink-0" />
        ),
    }
);

export function SidebarWrapper() {
    return <GlobalSidebar />;
}
