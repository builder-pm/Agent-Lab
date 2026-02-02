"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Database, History, BarChart2, Settings, Home, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlobalSidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'LAB', icon: <Brain size={20} />, tooltip: 'Execute AI agent pipelines' },
        { href: '/datasets', label: 'GYM', icon: <Database size={20} />, tooltip: 'Manage training datasets' },
        { href: '/history', label: 'HISTORY', icon: <History size={20} />, tooltip: 'View past sessions' },
        { href: '/analytics', label: 'METRICS', icon: <BarChart2 size={20} />, tooltip: 'Performance analytics' },
    ];

    return (
        <aside className="w-16 bg-[#0c0c0e] border-r border-zinc-800 flex flex-col items-center py-4 z-50 shrink-0">
            {/* Logo / Home */}
            <Link href="/" className="mb-8 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Layers size={24} />
            </Link>

            {/* Nav Links */}
            <nav className="flex-1 flex flex-col gap-4 w-full px-2">
                {navItems.map((item) => {
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 gap-1 group",
                                isActive
                                    ? "text-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]"
                                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                            )}
                            title={item.tooltip}
                        >
                            <div className={cn("transition-transform group-hover:scale-110", isActive && "scale-110")}>
                                {item.icon}
                            </div>
                            <span className="text-[10px] font-bold font-space-mono tracking-tight">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto flex flex-col gap-4 px-2 w-full">
                <button
                    className="flex flex-col items-center justify-center p-2 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                    title="Global settings"
                >
                    <Settings size={20} />
                </button>
            </div>
        </aside>
    );
}
