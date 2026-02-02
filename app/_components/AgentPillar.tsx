"use client";

import React from "react";
import { Settings, Cpu, Search, Activity, LayoutTemplate, Play } from "lucide-react";
import { AgentType } from "../_store/useAgentStore";
import { cn } from "@/lib/utils";

const AGENT_ICONS = {
    planner: LayoutTemplate,
    researcher: Search,
    analyst: Activity,
    synthesizer: Cpu,
    executor: Play,
};

const AGENT_COLORS = {
    planner: "text-blue-400",
    researcher: "text-amber-400",
    analyst: "text-purple-400",
    synthesizer: "text-primary",
    executor: "text-zinc-400",
};

interface AgentPillarProps {
    agentId: AgentType;
    isActive?: boolean;
    onClickConfig: () => void;
    compact?: boolean;
}

export const AgentPillar = ({ agentId, isActive, onClickConfig, compact }: AgentPillarProps) => {
    const Icon = AGENT_ICONS[agentId] || Play;
    const colorClass = AGENT_COLORS[agentId] || "text-zinc-400";

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center relative group transition-all duration-300",
                compact ? "w-full h-10" : "w-16 h-16",
                isActive ? "opacity-100" : "opacity-40 hover:opacity-100"
            )}
        >
            <div className={cn(
                "flex items-center justify-center rounded-lg transition-all",
                compact ? "w-8 h-8" : "w-12 h-12",
                isActive ? "bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]" : "bg-transparent"
            )}>
                <Icon size={compact ? 16 : 24} className={cn(colorClass, isActive && "animate-pulse drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]")} />
            </div>
            
            {!compact && (
                <span className="text-[8px] font-bold uppercase mt-1 text-muted-foreground select-none tracking-widest">
                    {agentId}
                </span>
            )}

            {/* Hover Config Button - Subtle */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClickConfig();
                }}
                className={cn(
                    "absolute text-zinc-500 hover:text-white transition-colors z-10",
                    compact ? "right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" : "-top-2 -right-2 opacity-0 group-hover:opacity-100 bg-zinc-800 p-1 rounded-full"
                )}
                title="Configure Agent"
            >
                <Settings size={12} />
            </button>
        </div>
    );
};
