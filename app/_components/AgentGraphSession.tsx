"use client";

import React, { useState, useMemo } from "react";
import { AgentStep, useAgentStore } from "../_store/useAgentStore";
import { ExecutionNode } from "./ExecutionNode";
import { ChevronDown, ChevronRight, Layers, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentGraphSessionProps {
    agent: string;
    steps: AgentStep[];
    isActive?: boolean;
}

export const AgentGraphSession = ({ agent, steps, isActive }: AgentGraphSessionProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { currentStepIndex, currentScenario } = useAgentStore();

    // Determine if this session contains the currently active global step
    const containsActiveStep = useMemo(() => {
        if (!currentScenario) return false;
        const sessionStepIds = new Set(steps.map(s => s.id));
        const currentStep = currentScenario.steps[currentStepIndex];
        return currentStep && sessionStepIds.has(currentStep.id);
    }, [steps, currentStepIndex, currentScenario]);

    // Auto-expand if active
    React.useEffect(() => {
        if (containsActiveStep) {
            setIsExpanded(true);
        }
    }, [containsActiveStep]);

    if (steps.length === 0) return null;

    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];
    const duration = (lastStep.timestamp - firstStep.timestamp) || 0;

    // Dynamic Summary Label
    const summaryLabel = useMemo(() => {
        const actionStep = steps.find(s => s.type === 'action');
        const outputStep = steps.find(s => s.type === 'output');

        if (actionStep) return actionStep.label; // "Call: Google Search"
        if (outputStep) return "Final Response";
        return firstStep.label || "Processing...";
    }, [steps]);

    return (
        <div className={cn(
            "flex-shrink-0 flex flex-col transition-all duration-300 relative group/session",
            isExpanded ? "w-[400px]" : "w-[200px]"
        )}>
            {/* Session Header / Collapsed Node */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all duration-200 relative overflow-hidden",
                    isActive || containsActiveStep
                        ? "bg-zinc-900 border-primary/50 shadow-[0_0_15px_rgba(202,255,88,0.1)]"
                        : "bg-zinc-900/50 border-white/10 hover:bg-zinc-800/80 hover:border-white/20"
                )}
            >
                {/* Connecting Line (Visual) */}
                <div className="absolute left-0 top-1/2 -translate-x-full w-4 h-px bg-white/10" />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            isActive || containsActiveStep ? "bg-primary animate-pulse" : "bg-zinc-600"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            Session_{steps.length}
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                </div>

                <div className="font-mono text-xs font-bold text-zinc-200 truncate">
                    {summaryLabel}
                </div>

                {/* Metrics Footer */}
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono mt-1">
                    <span className="flex items-center gap-1">
                        <Layers size={10} /> {steps.length} Steps
                    </span>
                    {duration > 0 && (
                        <span className="flex items-center gap-1">
                            <Clock size={10} /> {duration}ms
                        </span>
                    )}
                </div>

                {/* Progress Bar (if collapsed and active) */}
                {!isExpanded && containsActiveStep && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
                        <div className="h-full bg-primary animate-progress" />
                    </div>
                )}
            </div>

            {/* Expanded Content (Sub-processes) */}
            {isExpanded && (
                <div className="mt-2 pl-4 border-l border-white/10 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="relative">
                            {/* Thread line */}
                            <div className="absolute -left-[17px] top-4 w-3 h-px bg-white/10" />

                            <ExecutionNode
                                step={step as any}
                                isLast={false} // Logic handled internally or not needed for sub-view
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Connector Line to next session */}
            <div className="absolute right-0 top-1/2 translate-x-full w-4 h-px bg-white/10" />
        </div>
    );
};
