"use client";

import React, { useState, useMemo } from "react";
import { useAgentStore, AgentType, AgentStep } from "../_store/useAgentStore";
import { AgentPillar } from "./AgentPillar";
import { SessionNode } from "./SessionNode";
import { SessionDetailModal } from "./SessionDetailModal";
import { PrismHUD } from "./PrismHUD";
import { cn } from "@/lib/utils";

const AGENTS: AgentType[] = ["planner", "executor", "researcher", "analyst", "synthesizer"];

const ROW_HEIGHT = 100;
const COL_WIDTH = 120;
const START_OFFSET_X = 80;
const START_OFFSET_Y = 50;

export const AgentGraphCanvas = () => {
    const { currentScenario, currentStepIndex, agentConfigs, setViewedSession } = useAgentStore();
    const [configAgent, setConfigAgent] = useState<AgentType | null>(null);
    const [selectedSession, setSelectedSession] = useState<{ agent: AgentType, steps: AgentStep[] } | null>(null);

    // Group steps into sessions with column indexing for DAG support
    const sessions = useMemo(() => {
        if (!currentScenario || currentScenario.steps.length === 0) return [];

        const result: {
            agent: AgentType,
            steps: AgentStep[],
            columnIndex: number,
            parallelGroup?: string,
            isFastRoute?: boolean
        }[] = [];

        let currentColumnIndex = 0;
        let lastSession: any = null;

        currentScenario.steps.forEach((step) => {
            const agent = (step.agent || "executor") as AgentType;
            const parallelGroup = step.parallelGroup;
            const isFastRoute = step.isFastRoute;

            let startNewSession = false;
            let incrementColumn = true;

            if (!lastSession) {
                startNewSession = true;
            } else {
                const timeGap = step.timestamp - lastSession.steps[lastSession.steps.length - 1].timestamp;

                if (agent !== lastSession.agent) {
                    startNewSession = true;
                    // If both are in the same parallel group, they share a column
                    if (parallelGroup && parallelGroup === lastSession.parallelGroup) {
                        incrementColumn = false;
                    }
                } else if (timeGap > 5000) {
                    startNewSession = true;
                }
            }

            if (startNewSession) {
                if (lastSession && incrementColumn) {
                    currentColumnIndex++;
                }
                const newSession = {
                    agent,
                    steps: [step],
                    columnIndex: currentColumnIndex,
                    parallelGroup,
                    isFastRoute
                };
                result.push(newSession);
                lastSession = newSession;
            } else {
                lastSession.steps.push(step);
            }
        });

        return result;
    }, [currentScenario]);

    const activeAgent = currentScenario?.steps[currentStepIndex]?.agent as AgentType | undefined;

    // Calculate canvas size based on column index
    const maxColumn = sessions.length > 0 ? sessions[sessions.length - 1].columnIndex : 0;
    const canvasWidth = Math.max(1000, (maxColumn * COL_WIDTH) + START_OFFSET_X + 260);
    const canvasHeight = AGENTS.length * ROW_HEIGHT + 100;

    return (
        <div className="flex-1 relative overflow-hidden flex flex-col bg-[#0c0c0e]">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            {/* Canvas Header/Status */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between text-[10px] font-space-mono text-zinc-500 z-10 relative bg-[#0c0c0e]/80 backdrop-blur-sm">
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    MODE: DAG_TURBO_VIZ
                </span>
                <span>STEPS: {currentScenario?.steps.length || 0} | COLS: {maxColumn + 1}</span>
            </div>

            {/* Main Layout: Fixed Sidebar + Scrollable Canvas Area */}
            <div className="flex-1 flex w-full h-full relative overflow-hidden">

                {/* Left Sidebar - FIXED Row Headers */}
                <div className="w-16 border-r border-white/5 flex flex-col z-20 bg-[#0c0c0e]/50 backdrop-blur-sm relative h-full flex-shrink-0">
                    <div className="absolute inset-0 flex flex-col pt-[START_OFFSET_Y] overflow-hidden">
                        {AGENTS.map((agent, i) => (
                            <div
                                key={agent}
                                className="absolute left-0 right-0 flex items-center justify-center group"
                                style={{ top: (i * ROW_HEIGHT) + START_OFFSET_Y - 20, height: ROW_HEIGHT }}
                            >
                                <AgentPillar
                                    agentId={agent}
                                    isActive={activeAgent === agent}
                                    onClickConfig={() => setConfigAgent(agent)}
                                    compact
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scrollable Diagram Area */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden relative scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    <div className="relative min-w-full" style={{ width: canvasWidth, height: canvasHeight }}>

                        {/* Background Lanes */}
                        {AGENTS.map((agent, i) => (
                            <div
                                key={`lane-${agent}`}
                                className="absolute left-0 right-0 border-b border-white/5"
                                style={{ top: (i * ROW_HEIGHT) + START_OFFSET_Y + (ROW_HEIGHT / 2), height: 1 }} // Center of lane
                            />
                        ))}

                        {/* DAG Connections */}
                        <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: canvasWidth, height: canvasHeight }}>
                            <defs>
                                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                    <polygon points="0 0, 6 2, 0 4" fill="#52525b" />
                                </marker>
                                <marker id="arrowhead-fast" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                    <polygon points="0 0, 6 2, 0 4" fill="#6366f1" />
                                </marker>
                            </defs>
                            {sessions.map((session, i) => {
                                // For each session, find its parent sessions (those in the previous column)
                                const parentSessions = sessions.filter(s => s.columnIndex === session.columnIndex - 1);

                                return parentSessions.map((parent, pIdx) => {
                                    const prevAgentIdx = AGENTS.indexOf(parent.agent);
                                    const currAgentIdx = AGENTS.indexOf(session.agent);

                                    const x1 = START_OFFSET_X + (parent.columnIndex * COL_WIDTH) + 20;
                                    const y1 = (prevAgentIdx * ROW_HEIGHT) + START_OFFSET_Y;

                                    const x2 = START_OFFSET_X + (session.columnIndex * COL_WIDTH) - 20;
                                    const y2 = (currAgentIdx * ROW_HEIGHT) + START_OFFSET_Y;

                                    const controlPointX = x1 + (x2 - x1) / 2;
                                    const isFast = session.isFastRoute;

                                    return (
                                        <g key={`path-${i}-${pIdx}`}>
                                            <path
                                                d={`M ${x1} ${y1} C ${controlPointX} ${y1}, ${controlPointX} ${y2}, ${x2} ${y2}`}
                                                fill="none"
                                                stroke={isFast ? "#6366f1" : "#52525b"}
                                                strokeWidth={isFast ? "2" : "1.5"}
                                                strokeDasharray={isFast ? "None" : "6 4"}
                                                markerEnd={isFast ? "url(#arrowhead-fast)" : "url(#arrowhead)"}
                                                className={cn("transition-all duration-1000", isFast ? "opacity-100" : "opacity-40")}
                                            />
                                            {isFast && (
                                                <text
                                                    x={controlPointX}
                                                    y={(y1 + y2) / 2 - 10}
                                                    className="fill-indigo-400 text-[8px] font-bold font-mono"
                                                    textAnchor="middle"
                                                >
                                                    ⚡ FAST
                                                </text>
                                            )}
                                        </g>
                                    );
                                });
                            })}
                        </svg>

                        {/* Nodes */}
                        {sessions.map((session, idx) => {
                            const agentIdx = AGENTS.indexOf(session.agent);
                            const top = (agentIdx * ROW_HEIGHT) + START_OFFSET_Y - 28;
                            const left = START_OFFSET_X + (session.columnIndex * COL_WIDTH) - 28;

                            return (
                                <div
                                    key={`node-${idx}`}
                                    className="absolute z-10"
                                    style={{ top, left }}
                                >
                                    <SessionNode
                                        agent={session.agent}
                                        steps={session.steps}
                                        isActive={activeAgent === session.agent && idx === sessions.length - 1}
                                        onClick={() => setViewedSession(session)}
                                        index={idx}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {configAgent && (
                <PrismHUD
                    agentId={configAgent}
                    onClose={() => setConfigAgent(null)}
                />
            )}
        </div>
    );
};
