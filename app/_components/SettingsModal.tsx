"use client";

import React, { useState } from "react";
import { useAgentStore } from "../_store/useAgentStore";
import { X, Zap, Settings as SettingsIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom SVG Icons
const TurtleIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="14" rx="8" ry="5" stroke="currentColor" fill="currentColor" opacity="0.3" />
        <ellipse cx="12" cy="12" rx="6" ry="4" stroke="currentColor" fill="currentColor" />
        <circle cx="8" cy="11" r="1" fill="currentColor" />
        <circle cx="16" cy="11" r="1" fill="currentColor" />
        <path d="M 6 14 L 4 16 M 18 14 L 20 16 M 10 16 L 9 18 M 14 16 L 15 18" stroke="currentColor" />
        <path d="M 10 10 Q 12 8 14 10" stroke="currentColor" fill="none" />
    </svg>
);

const LightningIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 13 2 L 3 14 L 11 14 L 11 22 L 21 10 L 13 10 Z" stroke="currentColor" fill="currentColor" />
    </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" stroke="currentColor" />
        <circle cx="12" cy="12" r="6" stroke="currentColor" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
);

export const SettingsModal = () => {
    const {
        isSettingsOpen,
        toggleSettings,
        executionMode,
        setExecutionMode,
        modelTiering,
        setModelTiering,
        autoSave,
        setAutoSave
    } = useAgentStore();

    const [activeTab, setActiveTab] = useState<'general' | 'performance'>('performance');

    if (!isSettingsOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                onClick={toggleSettings}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-3xl bg-[#0c0c0e] border-4 border-white shadow-[8px_8px_0px_0px_rgba(202,255,88,1)] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-4 border-white bg-black">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <SettingsIcon size={24} className="text-black" strokeWidth={3} />
                        </div>
                        <h2 className="text-3xl font-black font-space-grotesk tracking-tight">SYSTEM SETTINGS</h2>
                    </div>
                    <button
                        onClick={toggleSettings}
                        className="w-10 h-10 flex items-center justify-center hover:bg-primary hover:text-black transition-all border-4 border-white bg-zinc-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b-4 border-white bg-zinc-950">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "flex-1 px-8 py-4 font-black font-space-mono text-sm transition-all border-r-4 border-white relative",
                            activeTab === 'general'
                                ? "bg-primary text-black shadow-[inset_0_4px_0px_0px_rgba(0,0,0,0.2)]"
                                : "bg-zinc-900 hover:bg-zinc-800 text-white"
                        )}
                    >
                        <Save size={14} className="inline mr-2" />
                        GENERAL
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={cn(
                            "flex-1 px-8 py-4 font-black font-space-mono text-sm transition-all relative",
                            activeTab === 'performance'
                                ? "bg-primary text-black shadow-[inset_0_4px_0px_0px_rgba(0,0,0,0.2)]"
                                : "bg-zinc-900 hover:bg-zinc-800 text-white"
                        )}
                    >
                        <Zap size={14} className="inline mr-2" />
                        PERFORMANCE
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 min-h-[400px] bg-[#0c0c0e]">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center justify-between p-6 bg-zinc-950 border-4 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(39,39,42,1)]">
                                <div>
                                    <h3 className="font-black text-base mb-2 font-space-grotesk">Auto-Save Sessions</h3>
                                    <p className="text-sm text-zinc-400 font-space-mono">Automatically save execution sessions to history</p>
                                </div>
                                <button
                                    onClick={() => setAutoSave(!autoSave)}
                                    className={cn(
                                        "w-16 h-10 border-4 flex items-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                        autoSave
                                            ? "bg-primary border-black justify-end"
                                            : "bg-zinc-800 border-zinc-700 justify-start"
                                    )}
                                >
                                    <div className={cn(
                                        "w-7 h-7 border-2",
                                        autoSave ? "bg-black border-black" : "bg-white border-zinc-600"
                                    )} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Execution Mode */}
                            <div className="space-y-4">
                                <h3 className="font-black text-lg flex items-center gap-3 font-space-grotesk">
                                    <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center">
                                        <Zap size={16} className="text-black" strokeWidth={3} />
                                    </div>
                                    Execution Mode
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setExecutionMode('linear')}
                                        className={cn(
                                            "p-6 border-4 transition-all text-left group relative overflow-hidden",
                                            executionMode === 'linear'
                                                ? "bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                                                : "bg-zinc-900 border-zinc-700 hover:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(39,39,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(63,63,70,1)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <TurtleIcon className={cn(
                                                "w-6 h-6",
                                                executionMode === 'linear' ? "text-black" : "text-zinc-400"
                                            )} />
                                            <div className={cn(
                                                "font-black text-lg font-space-grotesk",
                                                executionMode === 'linear' ? "text-black" : "text-white"
                                            )}>
                                                LINEAR
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "text-xs font-space-mono leading-relaxed",
                                            executionMode === 'linear' ? "text-zinc-700" : "text-zinc-400"
                                        )}>
                                            Sequential execution, easier to debug
                                        </div>
                                        {executionMode === 'linear' && (
                                            <div className="absolute top-2 right-2 w-3 h-3 bg-black rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setExecutionMode('turbo')}
                                        className={cn(
                                            "p-6 border-4 transition-all text-left group relative overflow-hidden",
                                            executionMode === 'turbo'
                                                ? "bg-primary border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-pulse"
                                                : "bg-zinc-900 border-zinc-700 hover:border-primary/50 shadow-[4px_4px_0px_0px_rgba(39,39,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(202,255,88,0.3)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <LightningIcon className={cn(
                                                "w-6 h-6",
                                                executionMode === 'turbo' ? "text-black" : "text-primary"
                                            )} />
                                            <div className={cn(
                                                "font-black text-lg font-space-grotesk",
                                                executionMode === 'turbo' ? "text-black" : "text-primary"
                                            )}>
                                                TURBO
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "text-xs font-space-mono leading-relaxed",
                                            executionMode === 'turbo' ? "text-black/70" : "text-zinc-400"
                                        )}>
                                            Parallel DAG execution, faster
                                        </div>
                                        {executionMode === 'turbo' && (
                                            <div className="absolute top-2 right-2 w-3 h-3 bg-black rounded-full" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Model Tiering */}
                            <div className="flex items-center justify-between p-6 bg-zinc-950 border-4 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(39,39,42,1)]">
                                <div className="flex items-center gap-3">
                                    <TargetIcon className="w-5 h-5 text-primary" />
                                    <div>
                                        <h3 className="font-black text-base font-space-grotesk">Model Tiering</h3>
                                        <p className="text-sm text-zinc-400 font-space-mono leading-relaxed">Use fast models for routing, heavy models for reasoning</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setModelTiering(!modelTiering)}
                                    className={cn(
                                        "w-16 h-10 border-4 flex items-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                        modelTiering
                                            ? "bg-primary border-black justify-end"
                                            : "bg-zinc-800 border-zinc-700 justify-start"
                                    )}
                                >
                                    <div className={cn(
                                        "w-7 h-7 border-2",
                                        modelTiering ? "bg-black border-black" : "bg-white border-zinc-600"
                                    )} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
