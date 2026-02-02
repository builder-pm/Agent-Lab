"use client";

import React, { useMemo } from "react";
import { useAgentStore, AgentStep } from "../_store/useAgentStore";
import { Clock, Zap, Cpu } from "lucide-react";
import cn from "classnames";
import { ConceptTooltip } from "./ConceptTooltip";

export const WaterfallPanel = () => {
    const { currentScenario } = useAgentStore();
    const steps = currentScenario?.steps || [];

    // Filter relevant steps (action/output) + calculate cumulative time for offset
    const waterfallData = useMemo(() => {
        if (steps.length === 0) return [];

        let startTime = BigInt(steps[0].timestamp);

        return steps
            .filter(s => s.type === 'action' || s.type === 'output' || s.type === 'thought')
            .map(step => {
                const ts = BigInt(step.timestamp);
                const latency = (step as any).latencyMs || 100; // Default min width
                const offset = Number(ts - startTime);

                return {
                    id: step.id,
                    agent: step.agent,
                    offsetMs: offset, // Simplified relative start (not perfect Gantt but good visual)
                    durationMs: latency,
                    tokens: step.usage?.totalTokens || 0,
                    cost: step.usage?.cost || 0,
                    label: step.label || step.agent
                };
            });
    }, [steps]);

    const maxDuration = useMemo(() => {
        if (waterfallData.length === 0) return 1000;
        const last = waterfallData[waterfallData.length - 1];
        // Approximate total span
        return (last.offsetMs + last.durationMs) * 1.1;
    }, [waterfallData]);

    if (waterfallData.length === 0) return (
        <div className="p-8 text-center text-zinc-600 font-mono text-xs">
            NO_METRICS_AVAILABLE
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col font-mono text-[10px] overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b border-white/5 bg-zinc-950/50">
                <span className="font-bold text-zinc-400 flex items-center gap-2">
                    <Clock size={12} />
                    <ConceptTooltip term="Execution Waterfall" definition="Visual timeline of agent activities, showing latency and dependencies.">
                        EXECUTION_WATERFALL
                    </ConceptTooltip>
                </span>
                <span className="text-zinc-600">
                    <ConceptTooltip term="Scale" definition="Total duration of the current view window.">
                        SCALE: {Math.round(maxDuration / 1000)}s
                    </ConceptTooltip>
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 relative">
                {/* Vertical Grid Lines */}
                <div className="absolute inset-0 pointer-events-none flex justify-between px-2 opacity-10">
                    <div className="w-px h-full bg-white" />
                    <div className="w-px h-full bg-white" />
                    <div className="w-px h-full bg-white" />
                    <div className="w-px h-full bg-white" />
                </div>

                {waterfallData.map((item) => {
                    const widthPct = Math.max(1, (item.durationMs / maxDuration) * 100);
                    // Just stack them for now, sophisticated Gantt usage requires cumulative offset logic which is hard with just timestamps
                    // We'll trust the "waterfall" look comes from the list order and varying widths

                    return (
                        <div key={item.id} className="group flex items-center gap-2 hover:bg-white/5 p-1 rounded transition-colors">
                            {/* Label */}
                            <div className={cn(
                                "w-20 flex-shrink-0 font-bold truncate text-right pr-2 uppercase",
                                item.agent === 'planner' ? "text-violet-400" :
                                    item.agent === 'executor' ? "text-zinc-400" :
                                        item.agent === 'researcher' ? "text-cyan-400" :
                                            "text-emerald-400"
                            )}>
                                {item.agent}
                            </div>

                            {/* Bar Area */}
                            <div className="flex-1 h-6 bg-zinc-900/50 rounded overflow-hidden relative border border-white/5">
                                <div
                                    className={cn(
                                        "h-full opacity-80 flex items-center px-2 transition-all hover:opacity-100",
                                        item.agent === 'planner' ? "bg-violet-900/50 border-violet-500/30" :
                                            item.agent === 'executor' ? "bg-zinc-800 border-zinc-600/30" :
                                                item.agent === 'researcher' ? "bg-cyan-900/50 border-cyan-500/30" :
                                                    "bg-emerald-900/50 border-emerald-500/30"
                                    )}
                                    style={{ width: `${Math.min(100, widthPct * 5)}%`, minWidth: '4px' }} // Artificial multiplier for visibility
                                >
                                    <ConceptTooltip term="Latency" definition="Time taken for this step to complete." className="text-white drop-shadow-md truncate block w-full h-full">
                                        <span className="flex items-center h-full">{item.durationMs}ms</span>
                                    </ConceptTooltip>
                                </div>
                            </div>

                            {/* Metrics */}
                            <div className="w-24 flex-shrink-0 flex flex-col items-end opacity-50 text-[9px]">
                                <ConceptTooltip term="Token Usage" definition="Total LLM tokens (prompt + completion) valid for this step.">
                                    <span className="flex items-center gap-1 text-zinc-300">
                                        {item.tokens} <Cpu size={8} />
                                    </span>
                                </ConceptTooltip>
                                <ConceptTooltip term="Cost" definition="Estimated dollar cost based on model pricing.">
                                    <span className="flex items-center gap-1 text-emerald-500">
                                        ${item.cost.toFixed(5)}
                                    </span>
                                </ConceptTooltip>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
