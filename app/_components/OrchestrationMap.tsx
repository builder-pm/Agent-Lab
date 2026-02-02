"use client";

import React from "react";
import { useAgentStore, AgentStep } from "../_store/useAgentStore";
import {
    GitBranch, Circle, Disc, CheckCircle,
    ArrowRight, Map, Cpu
} from "lucide-react";
import cn from "classnames";

export function OrchestrationMap() {
    const { currentScenario } = useAgentStore();
    const steps = currentScenario?.steps || [];

    // Filter for phases to create a simplified map
    const mapNodes = steps.filter(s =>
        s.agent === 'executor' && s.type === 'action' ||
        s.agent === 'planner' && s.type === 'output' ||
        s.type === 'approval_requested' ||
        s.metadata?.decision
    );

    if (mapNodes.length === 0) return null;

    return (
        <div className="absolute top-24 left-6 z-10 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
            <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 p-3 rounded-xl shadow-xl pointer-events-auto max-w-[200px]">
                <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-2">
                    <Map size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Orchestration Map</span>
                </div>

                <div className="space-y-3 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-zinc-800" />

                    {mapNodes.map((node, i) => (
                        <div key={node.id} className="relative flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className={cn(
                                "z-10 w-5 h-5 rounded-full flex items-center justify-center border-2",
                                node.agent === 'executor' ? "bg-zinc-900 border-zinc-600 text-zinc-400" :
                                    node.agent === 'planner' ? "bg-amber-950 border-amber-500 text-amber-500" :
                                        node.type === 'approval_requested' ? "bg-red-950 border-red-500 text-red-500 animate-pulse" :
                                            "bg-blue-950 border-blue-500 text-blue-500"
                            )}>
                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            </div>
                            <div className="text-[10px] font-mono leading-tight">
                                <span className={cn(
                                    "font-bold block uppercase",
                                    node.agent === 'executor' ? "text-zinc-400" :
                                        node.agent === 'planner' ? "text-amber-400" :
                                            node.type === 'approval_requested' ? "text-red-400" :
                                                "text-blue-400"
                                )}>
                                    {node.agent || 'SYSTEM'}
                                </span>
                                <span className="text-zinc-600 block max-w-[120px] truncate">
                                    {node.type === 'approval_requested' ? 'HITL Gate' :
                                        node.metadata?.decision ? `Decision: ${node.metadata.decision}` :
                                            node.label || 'Processing...'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Active Pulse at bottom */}
                    <div className="relative flex items-center gap-3">
                        <div className="z-10 w-5 h-5 rounded-full flex items-center justify-center border-2 border-green-500/50 bg-green-500/20 text-green-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                        </div>
                        <span className="text-[9px] text-green-500/80 font-mono italic animate-pulse">
                            Processing...
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
