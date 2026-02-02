"use client";

import React from "react";
import { AgentStep, AgentType, useAgentStore } from "../_store/useAgentStore";
import { ExecutionNode } from "./ExecutionNode";
import { X, Layers, Clock, Zap, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionDetailModalProps {
    agent: AgentType;
    steps: AgentStep[];
    onClose: () => void;
}

export const SessionDetailModal = ({ agent, steps, onClose }: SessionDetailModalProps) => {
    const { agentConfigs } = useAgentStore();
    const config = agentConfigs[agent];

    // Metrics
    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];
    const duration = (lastStep.timestamp - firstStep.timestamp) || 0;
    const totalTokens = steps.reduce((acc, s) => acc + (s.usage?.totalTokens || 0), 0);
    const totalCost = steps.reduce((acc, s) => acc + (s.usage?.cost || 0), 0);

    return (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full h-[85%] bg-[#09090b] border-t border-zinc-800 shadow-[0_-10px_60px_rgba(0,0,0,0.7)] flex flex-col animate-in slide-in-from-bottom-10 duration-300 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button & Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#0c0c0e]">
                    <div className="flex items-center gap-6">
                        <div className={cn("w-1.5 h-12 rounded-full shadow-[0_0_15px_currentColor]", config.bgColor.replace('/20', ''))} />
                        <div>
                            <h3 className={cn("text-2xl font-bold uppercase tracking-widest font-space-mono", config.color)}>
                                {config.name} Protocol
                            </h3>
                            <div className="text-sm text-zinc-500 font-mono flex items-center gap-6 mt-2">
                                <span className="flex items-center gap-2"><Layers size={14} /> {steps.length} Steps</span>
                                <span className="flex items-center gap-2"><Clock size={14} /> {duration}ms</span>
                                <span className="flex items-center gap-2"><Zap size={14} /> {totalTokens.toLocaleString()} Tkn</span>
                                {totalCost > 0 && <span className="flex items-center gap-2"><Coins size={14} /> ${totalCost.toFixed(5)}</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all hover:scale-105 border border-zinc-800"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Horizontal Content Scroll Area */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 bg-[#0c0c0e]/50 flex items-center gap-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="relative flex-shrink-0 flex items-center">
                            {/* Horizontal Connector */}
                            {idx > 0 && (
                                <div className="w-8 h-px bg-zinc-800 border-t border-dashed border-zinc-600 mr-4" />
                            )}

                            {/* Step Node - Rendered slightly larger or same */}
                            <div className="scale-110 transform origin-center">
                                <ExecutionNode
                                    step={step as any}
                                    isLast={idx === steps.length - 1}
                                />
                            </div>
                        </div>
                    ))}

                    {/* End Marker */}
                    <div className="flex flex-col items-center gap-3 pl-8 opacity-50">
                        <div className="w-16 h-px bg-zinc-800" />
                        <div className="text-[10px] font-mono text-zinc-600 tracking-widest rotate-90 whitespace-nowrap">End of Session</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
