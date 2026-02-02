"use client";

import React from "react";
import Link from "next/link";
import { AgentGraphCanvas } from "./_components/AgentGraphCanvas";
import { useAgentStore } from "./_store/useAgentStore";
import { Brain, Terminal, Settings, Database, BarChart2 } from "lucide-react";
import { BrutalBadge } from "@/components/ui/brutal";
import { CommandBar } from "./_components/CommandBar";
import { CommandCenter } from "./_components/CommandCenter";
import { TimelineBar } from "./_components/TimelineBar";
import { SessionDetailModal } from "./_components/SessionDetailModal";
import { SettingsModal } from "./_components/SettingsModal";
import { cn } from "@/lib/utils";

export default function AgentLabPage() {
    const { isConsoleOpen, toggleConsole, viewedSession, setViewedSession, toggleSettings, executionMode, modelTiering } = useAgentStore();
    const [consoleWidth, setConsoleWidth] = React.useState(450);
    const [isResizing, setIsResizing] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const sidebarRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
                if (newWidth > 300 && newWidth < 800) {
                    setConsoleWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    React.useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div className="h-full w-full flex flex-col font-sans text-foreground bg-background overflow-hidden selection:bg-accent selection:text-black">
            {/* Header */}
            <header className="h-14 border-b-4 border-border bg-card flex items-center px-4 justify-between z-30 relative shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-foreground flex items-center justify-center text-background">
                        <Brain size={18} />
                    </div>
                    <h1 className="font-bold text-lg font-space-grotesk tracking-tight flex items-baseline gap-2 text-primary">
                        AGENT LAB PRO
                        <BrutalBadge className="text-[10px] px-1.5 py-0.5 bg-black text-white border-white">BETA v1.2</BrutalBadge>
                    </h1>
                </div>
                <nav className="font-space-mono text-xs font-bold flex gap-6">
                    {mounted ? (
                        <div className="flex items-center gap-2 text-[10px] bg-muted px-2 py-1 border-2 border-border font-mono">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            {executionMode === 'turbo' && <span className="text-primary">⚡ TURBO</span>}
                            {executionMode === 'linear' && <span>🐢 LINEAR</span>}
                            {modelTiering && <span className="text-primary">• 🎯 TIERING</span>}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-[10px] bg-muted px-2 py-1 border-2 border-border font-mono opacity-0">
                            {/* Static Placeholder to prevent layout shift */}
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>🐢 LINEAR</span>
                        </div>
                    )}
                    <button
                        onClick={toggleConsole}
                        className={`hover:text-primary transition-colors flex items-center gap-1 ${isConsoleOpen ? 'text-primary' : ''}`}
                        title="Toggle the command center panel with chat, execution steps, and performance metrics"
                    >
                        <Terminal size={14} /> Telemetry
                    </button>
                    <button
                        onClick={toggleSettings}
                        className="hover:text-primary transition-colors flex items-center gap-1"
                        title="Configure execution mode, model selection, and system preferences"
                    >
                        <Settings size={14} /> System
                    </button>
                </nav>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 flex flex-col relative min-w-0 bg-[#0c0c0e] overflow-hidden transition-all duration-300 ease-in-out">
                    {/* Execution Canvas */}
                    <AgentGraphCanvas />

                    {/* Floating Command Bar (Ignition - Only visible when console is closed) */}
                    {!isConsoleOpen && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CommandBar />
                        </div>
                    )}

                    {/* Timeline Playback Bar */}
                    <div className="mt-auto relative z-30">
                        <TimelineBar />
                    </div>

                    {/* Global Overlays (Scoped to Main Content Area now) */}
                    {
                        viewedSession && (
                            <div className="absolute inset-0 z-[60]">
                                <SessionDetailModal
                                    agent={viewedSession.agent}
                                    steps={viewedSession.steps}
                                    onClose={() => setViewedSession(null)}
                                />
                            </div>
                        )
                    }
                </div>

                {/* Unified Command Center (Right Panel) - Resizable */}
                <div
                    className={cn(
                        "border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-md z-40 transition-none ease-in-out flex flex-col shadow-2xl overflow-hidden relative",
                        isConsoleOpen ? "" : "w-0 border-l-0 opacity-0 pointer-events-none"
                    )}
                    style={{ width: isConsoleOpen ? consoleWidth : 0 }}
                    ref={sidebarRef}
                >
                    {/* Drag Handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 z-50 transition-colors"
                        onMouseDown={startResizing}
                    />

                    {/* Content */}
                    <CommandCenter />
                </div>
            </main>

            {/* Settings Modal */}
            <SettingsModal />
        </div >
    );
}
