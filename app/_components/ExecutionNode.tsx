"use client";

import React from "react";
import { AgentStep, useAgentStore } from "../_store/useAgentStore";
import { cn } from "@/lib/utils";
import { ChevronRight, FileCode, CheckCircle2, FlaskConical } from "lucide-react";
import { PyodideExecutor } from "./PyodideExecutor";

interface ExecutionNodeProps {
    step: AgentStep;
    isLast?: boolean;
}

export const ExecutionNode = ({ step, isLast }: ExecutionNodeProps) => {
    const { selectedStepId, setSelectedStepId } = useAgentStore();

    const getIcon = () => {
        switch (step.type) {
            case 'action': return <FileCode size={12} className="text-primary" />;
            case 'thought': return <FlaskConical size={12} className="text-blue-400" />;
            case 'output': return <CheckCircle2 size={12} className="text-green-400" />;
            default: return <ChevronRight size={12} />;
        }
    };

    const latency = (step as any).latencyMs;
    const isSelected = selectedStepId === step.id;

    return (
        <div
            onClick={() => setSelectedStepId(step.id)}
            className={cn(
                "min-w-[240px] max-w-[320px] brutal-card bg-[#1c1c1e]/50 p-3 h-24 flex flex-col justify-between shrink-0 animate-in fade-in slide-in-from-left-4 duration-300 relative group cursor-pointer transition-all hover:bg-[#1c1c1e]",
                isLast && "border-primary shadow-[0_0_15px_rgba(202,255,88,0.2)]",
                isSelected && "border-white bg-[#1c1c1e] ring-1 ring-white/50"
            )}
        >
            {/* Prompt Peek Tooltip */}
            {step.promptConsumed && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 p-2 text-[8px] max-w-[280px] z-50 pointer-events-none line-clamp-4 font-mono">
                    <span className="text-zinc-500 block mb-1 uppercase tracking-tighter">Consumed_Prompt:</span>
                    {step.promptConsumed}
                </div>
            )}

            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 overflow-hidden">
                    {getIcon()}
                    <span className="text-[10px] font-bold uppercase truncate text-zinc-300">
                        {step.label}
                    </span>
                    {step.isParallel && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 border border-amber-500/30 rounded flex-shrink-0">|| PARALLEL</span>
                    )}
                    {step.isFastRoute && (
                        <span className="text-[8px] bg-indigo-500/20 text-indigo-500 px-1 border border-indigo-500/30 rounded flex-shrink-0">⚡ FAST</span>
                    )}
                </div>
                {latency && (
                    <span className="text-[8px] font-mono text-zinc-500">{(latency / 1000).toFixed(2)}s</span>
                )}
            </div>

            <div className="text-[9px] text-zinc-500 line-clamp-2 font-space-mono bg-black/30 p-1.5 rounded-sm flex-1 mb-2">
                {step.metadata?.tool === 'code_interpreter' ? (
                    <div onClick={e => e.stopPropagation()}>
                        <PyodideExecutor code={JSON.parse(step.content).code || step.content} autoRun={true} />
                    </div>
                ) : (
                    step.content
                )}
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[8px] text-zinc-600 font-mono">
                <div className="flex gap-2">
                    <span className="text-zinc-400">{Math.round(step.usage?.totalTokens || 0)} <span className="text-zinc-700">tkn</span></span>
                    {step.usage?.cost !== undefined && step.usage.cost > 0 && (
                        <span className="text-primary/70">${step.usage.cost.toFixed(4)}</span>
                    )}
                </div>
                <span className="text-zinc-700 uppercase">{step.metadata?.tool || 'reason'}</span>
            </div>

            {/* Handover Indicator */}
            {step.handoverFrom && (
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-primary opacity-50">
                    <ChevronRight size={16} strokeWidth={3} />
                </div>
            )}
        </div>
    );
};

