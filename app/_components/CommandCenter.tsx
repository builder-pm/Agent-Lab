"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAgentStore, AgentStep } from "../_store/useAgentStore";
import {
    X, Terminal, MessageSquare, Mic, Send,
    Activity, ChevronRight, Cpu, FlaskConical, Gauge, Brain, Network
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WaterfallPanel } from "./WaterfallPanel";
import { PyodideExecutor } from "./PyodideExecutor";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SourcesAccordion } from "./SourcesAccordion";

export function CommandCenter() {
    const {
        isConsoleOpen,
        toggleConsole,
        currentScenario,
        runScenario,
        selectedStepId,
        setSelectedStepId,
        agentConfigs,
        isLoading,
        executionMode,
        setExecutionMode,
        isLabsEnabled,
        toggleLabs
    } = useAgentStore();

    // Derive steps from currentScenario
    const steps = currentScenario?.steps || [];

    const [activeTab, setActiveTab] = useState<'chat' | 'telemetry' | 'metrics'>('chat');
    const [input, setInput] = useState('');
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLElement | null>>({});

    // Set mounted on client
    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-scroll logic
    useEffect(() => {
        if (selectedStepId && activeTab === 'telemetry' && itemRefs.current[selectedStepId]) {
            setTimeout(() => {
                itemRefs.current[selectedStepId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else if (scrollRef.current && !selectedStepId) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [steps.length, activeTab, selectedStepId]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;
        runScenario(input);
        setInput('');
    };

    return (
        <div className="w-full h-full flex flex-col overflow-x-hidden">
            {/* Header */}
            <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-2 bg-zinc-950">
                <div className="flex w-full h-full gap-1 pt-1">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-bold font-mono uppercase transition-all tracking-tight border-t-2",
                            activeTab === 'chat'
                                ? "bg-zinc-900 text-[#CAFF58] border-[#CAFF58]"
                                : "text-zinc-500 border-transparent hover:text-zinc-300"
                        )}
                    >
                        <MessageSquare size={14} /> Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('telemetry')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-bold font-mono uppercase transition-all tracking-tight border-t-2",
                            activeTab === 'telemetry'
                                ? "bg-zinc-900 text-blue-400 border-blue-500"
                                : "text-zinc-500 border-transparent hover:text-zinc-300"
                        )}
                    >
                        <Terminal size={14} /> Steps
                        <span className="bg-zinc-800 text-zinc-400 px-1 rounded text-[9px]">{steps.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 text-xs font-bold font-mono uppercase transition-all tracking-tight border-t-2",
                            activeTab === 'metrics'
                                ? "bg-zinc-900 text-purple-400 border-purple-500"
                                : "text-zinc-500 border-transparent hover:text-zinc-300"
                        )}
                    >
                        <Activity size={14} /> Stats
                    </button>
                </div>
                <button
                    onClick={toggleConsole}
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded ml-2"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-zinc-950/50">
                {/* CHAT TAB */}
                {activeTab === 'chat' && (
                    <div className="absolute inset-0 flex flex-col">
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {steps.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-6 px-8">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg">
                                        <Cpu size={24} className="text-[#CAFF58]" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-base font-semibold text-zinc-300">What can I help you with?</h2>
                                        <p className="text-xs text-zinc-500 max-w-sm">
                                            Ask questions, analyze topics, or paste URLs to summarize. I'll research, analyze, and synthesize answers for you.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const groups: { type: 'input' | 'output' | 'process', steps: AgentStep[] }[] = [];
                                let currentProcess: AgentStep[] = [];

                                steps.forEach(step => {
                                    if (step.type === 'input') {
                                        if (currentProcess.length > 0) {
                                            groups.push({ type: 'process', steps: [...currentProcess] });
                                            currentProcess = [];
                                        }
                                        groups.push({ type: 'input', steps: [step] });
                                        return;
                                    }

                                    const isFinalAnswer = step.type === 'output' && (step.agent === 'synthesizer' || step.agent === 'aggregator');

                                    if (isFinalAnswer) {
                                        if (currentProcess.length > 0) {
                                            groups.push({ type: 'process', steps: [...currentProcess] });
                                            currentProcess = [];
                                        }
                                        groups.push({ type: 'output', steps: [step] });
                                    } else {
                                        if (step.content.includes('```python')) {
                                            if (currentProcess.length > 0) {
                                                groups.push({ type: 'process', steps: [...currentProcess] });
                                                currentProcess = [];
                                            }
                                            groups.push({ type: 'output', steps: [step] });
                                        } else {
                                            currentProcess.push(step);
                                        }
                                    }
                                });
                                if (currentProcess.length > 0) {
                                    groups.push({ type: 'process', steps: [...currentProcess] });
                                }

                                return groups.map((group, groupIdx) => {
                                    if (group.type === 'process') {
                                        const latestStep = group.steps[group.steps.length - 1];
                                        const isRunning = groupIdx === groups.length - 1 && isLoading;

                                        return (
                                            <div key={`group-${groupIdx}`} className="flex flex-col gap-2 my-2 animate-in fade-in duration-300">
                                                <details className="group/details open:bg-zinc-900/40 bg-zinc-900/20 border border-zinc-800/50 rounded-lg overflow-hidden transition-all">
                                                    <summary className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors list-none select-none">
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                                                            isRunning ? "animate-pulse" : ""
                                                        )}>
                                                            {isRunning ? (
                                                                <div className="w-4 h-4 border-2 border-t-transparent border-[#CAFF58] rounded-full animate-spin" />
                                                            ) : (
                                                                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-zinc-300 truncate">
                                                                    {latestStep.label || 'Processing...'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-zinc-500 group-open/details:rotate-90 transition-transform" />
                                                    </summary>
                                                    <div className="p-3 border-t border-white/5 space-y-3 bg-black/20">
                                                        {group.steps.map((step, idx) => (
                                                            <div key={`${step.id}-${idx}`} className="flex items-start gap-3 text-xs pl-2 border-l border-zinc-800 ml-1">
                                                                <div className="flex-1 space-y-1">
                                                                    <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
                                                                        <span className="uppercase">{step.agent}</span>
                                                                        <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                                                                    </div>
                                                                    <div className="text-zinc-300">{step.label}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        );
                                    }

                                    const step = group.steps[0];
                                    const isUser = step.type === 'input';
                                    const isFinalAnswer = step.type === 'output' && (step.agent === 'synthesizer' || step.agent === 'aggregator');

                                    return (
                                        <div key={`bubble-${groupIdx}`} className={cn(
                                            "flex flex-col gap-2 max-w-[95%] animate-in fade-in zoom-in-95 duration-300",
                                            isUser ? "self-end items-end" : "self-start items-start"
                                        )}>
                                            <div className={cn(
                                                "p-4 text-sm leading-relaxed shadow-sm relative overflow-hidden group",
                                                isUser
                                                    ? "bg-[#27272a] text-zinc-200 rounded-2xl rounded-tr-sm border border-zinc-700"
                                                    : "bg-transparent text-zinc-100 font-sans"
                                            )}>
                                                <div className="prose prose-invert prose-sm max-w-none prose-ul:list-disc prose-ol:list-decimal prose-a:text-[#CAFF58] prose-a:underline hover:prose-a:text-white prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-p:leading-relaxed space-y-4">
                                                    {step.content.split(/```python([\s\S]*?)```/g).map((part, i) => {
                                                        if (i % 2 === 1) {
                                                            return <PyodideExecutor key={i} code={part.trim()} autoRun={true} />;
                                                        }
                                                        return part.trim() ? (
                                                            <ReactMarkdown
                                                                key={i}
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#CAFF58] hover:text-white underline cursor-pointer pointer-events-auto relative z-50" />
                                                                }}
                                                            >
                                                                {part.trim()}
                                                            </ReactMarkdown>
                                                        ) : null;
                                                    })}
                                                </div>
                                                {/* Sources Accordion for Final Output */}
                                                {!isUser && isFinalAnswer && <SourcesAccordion steps={steps} />}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 pb-6 bg-zinc-950 border-t border-zinc-800 shrink-0 z-20">
                            <form onSubmit={handleSubmit} className="relative group">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Enter directive..."
                                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm font-mono p-3 rounded-lg focus:outline-none focus:border-[#CAFF58]/50"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <button type="submit" disabled={!input.trim()} className="p-1.5 text-[#CAFF58]">
                                        <Send size={14} />
                                    </button>
                                </div>
                            </form>
                            <div className="flex justify-between mt-2 px-1">
                                <div className="flex gap-2">
                                    <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setExecutionMode('turbo')}
                                            className={cn(
                                                "px-2 py-0.5 rounded text-[9px] font-bold transition-all flex items-center gap-1",
                                                mounted && (executionMode === 'turbo' || executionMode === 'linear') ? "bg-[#CAFF58] text-black" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            <Gauge size={10} /> FAST
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExecutionMode('deep')}
                                            className={cn(
                                                "px-2 py-0.5 rounded text-[9px] font-bold transition-all flex items-center gap-1",
                                                mounted && executionMode === 'deep' ? "bg-blue-900/30 text-blue-400 border border-blue-500/20" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            <Network size={10} /> DEEP
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={toggleLabs}
                                        className={cn(
                                            "text-[9px] font-bold flex items-center gap-1 px-2 py-1 rounded border transition-all",
                                            mounted && isLabsEnabled ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "bg-zinc-900 text-zinc-600 border-zinc-800"
                                        )}
                                    >
                                        <FlaskConical size={10} className={mounted && isLabsEnabled ? "animate-pulse" : ""} />
                                        LABS
                                    </button>
                                </div>
                                <div className="text-[9px] font-mono text-zinc-600 flex items-center gap-1.5 uppercase font-bold tracking-widest">
                                    <span className={cn("w-1 h-1 rounded-full", isLoading ? "bg-amber-500 animate-ping" : "bg-green-500")}></span>
                                    {isLoading ? 'Processing' : 'Ready'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TELEMETRY TAB */}
                {activeTab === 'telemetry' && (
                    <div className="absolute inset-0 overflow-y-auto p-2 space-y-1 bg-zinc-950 font-mono text-[10px]" ref={scrollRef}>
                        {steps.map((log: AgentStep) => (
                            <details
                                key={log.id}
                                className="group/log border-l-2 border-zinc-800 open:border-primary transition-all bg-zinc-900/10 open:bg-zinc-900/30 rounded-r overflow-hidden"
                            >
                                <summary
                                    ref={(el) => { itemRefs.current[log.id] = el; }}
                                    onClick={() => setSelectedStepId(selectedStepId === log.id ? null : log.id)}
                                    className={cn(
                                        "flex items-center gap-2 p-2 cursor-pointer hover:bg-zinc-800/50 transition-colors list-none select-none",
                                        selectedStepId === log.id && "bg-white/5"
                                    )}
                                >
                                    <ChevronRight size={10} className="text-zinc-600 group-open/log:rotate-90 transition-transform" />

                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-[4px] text-[8px] font-black tracking-tighter uppercase shrink-0",
                                        log.agent === 'planner' ? "text-amber-400 bg-amber-950/30 border border-amber-500/20" :
                                            log.agent === 'executor' ? "text-red-400 bg-red-950/30 border border-red-500/20" :
                                                log.agent === 'researcher' ? "text-blue-400 bg-blue-950/30 border border-blue-500/20" :
                                                    log.agent === 'analyst' ? "text-purple-400 bg-purple-950/30 border border-purple-500/20" :
                                                        log.agent === 'synthesizer' ? "text-[#CAFF58] bg-[#CAFF58]/10 border border-[#CAFF58]/20" :
                                                            "text-zinc-400 bg-zinc-900 border border-zinc-800"
                                    )}>
                                        {log.agent?.toUpperCase() || 'SYSTEM'}
                                    </span>

                                    <span className="text-zinc-400 truncate max-w-[150px] group-open/log:hidden transition-all">
                                        {log.content.slice(0, 50)}{log.content.length > 50 ? '...' : ''}
                                    </span>

                                    {/* Metadata Badges (Mode/Labs) */}
                                    {log.metadata?.meta && (
                                        <div className="flex gap-1 items-center shrink-0">
                                            {log.metadata.meta.executionMode === 'turbo' && (
                                                <span className="px-1 py-0.5 rounded-[4px] text-[7px] font-black text-orange-400 bg-orange-950/30 border border-orange-500/20 uppercase">FAST</span>
                                            )}
                                            {log.metadata.meta.isLabsEnabled && (
                                                <FlaskConical size={8} className="text-purple-400" />
                                            )}
                                        </div>
                                    )}

                                    <span className="text-zinc-600 ml-auto font-mono text-[8px] tracking-tight">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </summary>
                                <div className="p-3 pt-0 border-t border-white/5 text-zinc-300 break-words leading-relaxed whitespace-pre-wrap bg-black/20">
                                    {log.content}
                                </div>
                            </details>
                        ))}
                    </div>
                )}

                {/* METRICS TAB */}
                {activeTab === 'metrics' && (
                    <div className="absolute inset-0 bg-zinc-950">
                        <WaterfallPanel />
                    </div>
                )}
            </div>
        </div >
    );
}
