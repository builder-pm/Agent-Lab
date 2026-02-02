"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAgentStore, AgentType } from "../_store/useAgentStore";
import { cn } from "@/lib/utils";
import { Terminal, X, ChevronRight, Hash, ShieldCheck, Info, Loader2 } from "lucide-react";

export const TelemetryDrawer = () => {
    const { currentScenario, currentStepIndex, isConsoleOpen, toggleConsole, isStreaming, evaluateStep } = useAgentStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());

    // Auto-scroll to bottom as logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentScenario?.steps.length, isStreaming]);

    const handleEval = async (stepId: string) => {
        setEvaluatingIds(prev => new Set(prev).add(stepId));
        await evaluateStep(stepId);
        setEvaluatingIds(prev => {
            const next = new Set(prev);
            next.delete(stepId);
            return next;
        });
    };

    const steps = currentScenario?.steps || [];

    return (
        <div
            className={cn(
                "h-full bg-[#0c0c0e] border-l-4 border-border transition-all duration-300 ease-in-out flex flex-col font-space-mono z-50",
                isConsoleOpen ? "w-[400px]" : "w-0 border-none overflow-hidden"
            )}
        >
            {/* Header */}
            <div className="bg-[#1c1c1e] border-b-2 border-border p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <Terminal size={14} className="text-primary animate-pulse" />
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Telemetry_Feed
                    </h3>
                </div>
                <button
                    onClick={toggleConsole}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-zinc-500 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Log Feed */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide text-[10px] selection:bg-primary selection:text-black"
            >
                {steps.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-zinc-500 italic">
                        <Hash size={24} className="mb-2" />
                        NO_EVENTS_STREAMING
                    </div>
                ) : (
                    steps.map((step, idx) => (
                        <div
                            key={step.id}
                            className={cn(
                                "flex flex-col gap-1 border-l-2 pl-3 py-2 transition-colors relative group",
                                idx === currentStepIndex ? "border-primary bg-primary/5" : "border-zinc-800"
                            )}
                        >
                            {/* Handover Metadata */}
                            {step.handoverFrom && (
                                <div className="mb-2 p-1.5 bg-primary/10 border-l border-primary text-[8px] text-zinc-400">
                                    <div className="flex items-center gap-1 text-primary font-bold mb-0.5">
                                        <ChevronRight size={8} /> HANDOVER_DETECTED
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 mb-1">
                                        <span>ORIGIN: {step.handoverFrom}</span>
                                        <span>DEST: {step.agent}</span>
                                    </div>
                                    <div className="text-[7px] italic text-zinc-500 line-clamp-1">
                                        REASON: {step.handoverReason || "Sequential task progression"}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-[8px] text-zinc-600 mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="uppercase font-bold text-zinc-400 tracking-tighter bg-zinc-800 px-1 py-0.5">{step.agent}</span>
                                    {((step as any).latencyMs) && (
                                        <span className="text-zinc-500">[{((step as any).latencyMs / 1000).toFixed(2)}s]</span>
                                    )}
                                </div>
                                <span>{new Date(step.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>

                            <div className="flex items-start gap-1">
                                <ChevronRight size={10} className="mt-1 text-primary/50" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-zinc-200 mb-1 uppercase tracking-tight flex items-center justify-between">
                                        {step.label}
                                        <span className="text-[7px] text-zinc-700 font-normal">ID: {step.id.slice(-6)}</span>
                                    </div>
                                    <div className="text-zinc-500 break-words line-clamp-2 hover:line-clamp-none transition-all cursor-pointer bg-black/20 p-1 font-mono">
                                        {step.content}
                                    </div>
                                </div>
                            </div>

                            {/* Metrics Row */}
                            <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1">
                                    <span className="text-[7px] text-zinc-600">IN:</span>
                                    <span className="text-[8px] text-zinc-400">{step.usage?.inputTokens || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[7px] text-zinc-600">OUT:</span>
                                    <span className="text-[8px] text-zinc-400">{step.usage?.outputTokens || 0}</span>
                                </div>
                                {step.usage?.cost !== undefined && step.usage.cost > 0 && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <span className="text-[7px] text-primary/40">$</span>
                                        <span className="text-[8px] text-primary/60">{step.usage.cost.toFixed(5)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Evaluation Section */}
                            <div className="mt-2 border-t border-zinc-800/50 pt-2 flex flex-col gap-2">
                                {step.evaluationResults && step.evaluationResults.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {step.evaluationResults.map((res, i) => (
                                            <div 
                                                key={i} 
                                                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded group/eval relative"
                                            >
                                                <span className="text-[7px] text-zinc-500 uppercase font-bold">{res.metric}:</span>
                                                <span className={cn(
                                                    "text-[8px] font-bold",
                                                    res.score >= 0.8 ? "text-emerald-400" : res.score >= 0.5 ? "text-amber-400" : "text-rose-400"
                                                )}>
                                                    {(res.score * 100).toFixed(0)}%
                                                </span>
                                                
                                                {/* Reasoning Tooltip */}
                                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900 border border-zinc-800 p-2 rounded shadow-2xl opacity-0 invisible group-hover/eval:opacity-100 group-hover/eval:visible transition-all z-10 text-[7px] text-zinc-400 leading-relaxed pointer-events-none">
                                                    <div className="text-zinc-200 font-bold mb-1 border-b border-zinc-800 pb-1 flex items-center gap-1">
                                                        <Info size={8} /> JUDGE_REASONING
                                                    </div>
                                                    {res.reasoning}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEval(step.id)}
                                        disabled={evaluatingIds.has(step.id) || step.id.startsWith('tmp-')}
                                        className="flex items-center gap-1 text-[7px] text-zinc-500 hover:text-primary transition-colors disabled:opacity-50"
                                    >
                                        {evaluatingIds.has(step.id) ? (
                                            <>
                                                <Loader2 size={10} className="animate-spin" />
                                                EVALUATING...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck size={10} />
                                                RUN_EVALUATION
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))

                )}
            </div>

            {/* Footer Stats */}
            <div className="p-3 bg-black/50 border-t border-border/30 text-[9px] text-zinc-600 flex justify-between uppercase">
                <span>Kernel: v1.2.0</span>
                <span>Events: {steps.length}</span>
            </div>
        </div>
    );
};
