"use client";

import React from "react";
import { AgentStep, useAgentStore, AgentType } from "../_store/useAgentStore";
import { Shield, Database, Activity, FileText, Cpu, Clock, Zap, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionNodeProps {
    agent: AgentType;
    steps: AgentStep[];
    isActive?: boolean;
    onClick: () => void;
    index: number;
}

const AGENT_ICONS: Record<AgentType, React.ReactNode> = {
    planner: <Activity suppressHydrationWarning size={16} />,
    researcher: <Database suppressHydrationWarning size={16} />,
    analyst: <FileText suppressHydrationWarning size={16} />,
    synthesizer: <Cpu suppressHydrationWarning size={16} />,
    executor: <Shield suppressHydrationWarning size={16} />,
    'deep-planner': <Activity suppressHydrationWarning size={16} />, // Reuse Planner icon
    'worker': <Database suppressHydrationWarning size={16} />, // Reuse Researcher icon
    'aggregator': <Cpu suppressHydrationWarning size={16} />, // Reuse Synthesizer icon
    'orchestrator': <Shield suppressHydrationWarning size={16} />, // Reuse Executor icon
    router: <Zap suppressHydrationWarning size={16} />
};

export const SessionNode = ({ agent, steps, isActive, onClick, index }: SessionNodeProps) => {
    const { agentConfigs } = useAgentStore();
    const config = agentConfigs[agent];

    // Calculate Metrics
    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];
    const duration = (lastStep.timestamp - firstStep.timestamp) || 0;
    const totalTokens = steps.reduce((acc, s) => acc + (s.usage?.totalTokens || 0), 0);
    const totalCost = steps.reduce((acc, s) => acc + (s.usage?.cost || 0), 0);

    // Dynamic Summary
    const actionStep = steps.find(s => s.type === 'action');
    const outputStep = steps.find(s => s.type === 'output');
    const summaryLabel = actionStep?.label || outputStep?.label || firstStep.label || "Processing...";

    return (
        <div className="relative group flex items-center">
            {/* Connector Line (Left) - if not first */}
            {index > 0 && (
                <div className="w-8 h-0.5 bg-zinc-800 group-hover:bg-zinc-700 transition-colors" />
            )}

            <button
                onClick={onClick}
                className={cn(
                    "relative z-10 flex flex-col items-center gap-2 p-1 focus:outline-none transition-all duration-300",
                    isActive ? "scale-105" : "hover:scale-105 opacity-80 hover:opacity-100"
                )}
            >
                {/* Stack Effect Layers */}
                {steps.length > 1 && (
                    <>
                        <div className={cn(
                            "absolute top-0 left-0 w-14 h-14 rounded-full border-2 border-zinc-800 bg-zinc-900 transition-all duration-300",
                            isActive ? "translate-x-1 -translate-y-1 opacity-100" : "translate-x-0.5 -translate-y-0.5 opacity-0 group-hover:opacity-100"
                        )} />
                        <div className={cn(
                            "absolute top-0 left-0 w-14 h-14 rounded-full border-2 border-zinc-800 bg-zinc-900 transition-all duration-300",
                            isActive ? "translate-x-2 -translate-y-2 opacity-100" : "translate-x-1 -translate-y-1 opacity-0 group-hover:opacity-100"
                        )} />
                    </>
                )}

                {/* Node Circle */}
                <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg z-10 bg-zinc-950 transition-all duration-300 relative",
                    isActive
                        ? `border-${config.color.split('-')[1]}-400 shadow-[0_0_20px_rgba(255,255,255,0.1)]`
                        : "border-zinc-700 group-hover:border-zinc-500"
                )}>
                    <div suppressHydrationWarning className={cn(
                        "text-zinc-400 group-hover:text-white transition-colors",
                        config.color
                    )}>
                        {AGENT_ICONS[agent]}
                    </div>

                    {/* Badge for step count */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                        {steps.length}
                    </div>

                    {/* Turbo/Fast Indicator */}
                    {(firstStep.isParallel || firstStep.isFastRoute) && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center text-[8px] animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                            ⚡
                        </div>
                    )}
                </div>

                {/* Node Metadata (Tooltip-ish but distinct) */}
                <div className="absolute top-full mt-3 w-32 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-1">
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1",
                        config.color
                    )}>
                        {config.name}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono truncate max-w-full leading-tight">
                        {summaryLabel}
                    </span>

                    {/* Tiny Metrics */}
                    <div className="flex items-center gap-2 mt-1 text-[8px] text-zinc-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="flex items-center gap-0.5"><Clock size={8} /> {duration}ms</span>
                        <span className="flex items-center gap-0.5"><Zap size={8} /> {totalTokens}</span>
                    </div>
                </div>

                {/* Progress Ring (SVG) if Active */}
                {isActive && (
                    <svg className="absolute inset-0 w-full h-full -m-[2px] pointer-events-none" viewBox="0 0 100 100">
                        {/* Placeholder for spinning ring or similar effect if desired */}
                    </svg>
                )}
            </button>
        </div>
    );
};
