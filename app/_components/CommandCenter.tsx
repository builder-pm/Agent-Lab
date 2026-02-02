"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAgentStore, AgentStep } from "../_store/useAgentStore";
import {
    X, Terminal, MessageSquare, Mic, Send,
    Activity, ChevronRight, Cpu
} from "lucide-react";
import cn from "classnames";
import { WaterfallPanel } from "./WaterfallPanel";
import { PyodideExecutor } from "./PyodideExecutor";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function CommandCenter() {
    const {
        isConsoleOpen,
        toggleConsole,
        currentScenario,
        runScenario,
        selectedStepId,
        agentConfigs,
        isLoading
    } = useAgentStore();

    // Derive steps from currentScenario
    const steps = currentScenario?.steps || [];

    const [activeTab, setActiveTab] = useState<'chat' | 'telemetry' | 'metrics'>('chat');
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Auto-scroll logic (removed auto tab-switching to prevent layout jumps)
    useEffect(() => {
        // Only scroll to selected step if we're already on telemetry tab
        if (selectedStepId && activeTab === 'telemetry' && itemRefs.current[selectedStepId]) {
            setTimeout(() => {
                itemRefs.current[selectedStepId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else if (scrollRef.current && !selectedStepId) {
            // Normal auto-scroll for new messages
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [steps.length, activeTab, selectedStepId]);

    // if (!isConsoleOpen) return null; // Controlled by parent layout now

    // ... (rest of render until Telemetry Tab)

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;
        runScenario(input); // Trigger the dynamic loop
        setInput('');
    };

    return (
        <div className="w-full h-full flex flex-col overflow-x-hidden">
            {/* ... Header ... */}
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
                        title="View detailed execution steps and agent handovers"
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

            {/* 2. Content Area */}
            <div className="flex-1 overflow-hidden relative bg-zinc-950/50">

                {/* CHAT TAB */}
                {activeTab === 'chat' && (
                    <div className="absolute inset-0 flex flex-col">
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Gemini-Style Chat Rendering */}
                            {steps.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-6 px-8">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg">
                                        <Cpu size={32} className="text-[#CAFF58]" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-lg font-semibold text-zinc-300">What can I help you with?</h2>
                                        <p className="text-sm text-zinc-500 max-w-md">
                                            Ask questions, analyze topics, or paste URLs to summarize. I'll research, analyze, and synthesize answers for you.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                                        {[
                                            "What is quantum computing?",
                                            "Compare React vs Vue vs Svelte",
                                            "Summarize https://example.com",
                                            "Best practices for API design"
                                        ].map((example, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setInput(example)}
                                                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-[#CAFF58]/50 text-zinc-300 rounded-full transition-all"
                                            >
                                                {example}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Processed Groups Rendering */}
                            {(() => {
                                const groups: { type: 'input' | 'output' | 'process', steps: AgentStep[] }[] = [];
                                let currentProcess: AgentStep[] = [];

                                steps.forEach(step => {
                                    // User Input is always a standalone bubble
                                    if (step.type === 'input') {
                                        if (currentProcess.length > 0) {
                                            groups.push({ type: 'process', steps: [...currentProcess] });
                                            currentProcess = [];
                                        }
                                        groups.push({ type: 'input', steps: [step] });
                                        return;
                                    }

                                    // Determine if this step should be a standalone bubble (Final Answer)
                                    // We basically only show 'synthesizer' outputs as final answers.
                                    // Everything else (Planner plans, Researcher data, intermediate thoughts) is "Process".
                                    const isFinalAnswer = step.type === 'output' && step.agent === 'synthesizer';

                                    if (isFinalAnswer) {
                                        if (currentProcess.length > 0) {
                                            groups.push({ type: 'process', steps: [...currentProcess] });
                                            currentProcess = [];
                                        }
                                        groups.push({ type: 'output', steps: [step] });
                                    } else {
                                        // Check for functional content like Python code
                                        if (step.content.includes('```python')) {
                                            if (currentProcess.length > 0) {
                                                groups.push({ type: 'process', steps: [...currentProcess] });
                                                currentProcess = [];
                                            }
                                            // Treat code steps as distinct 'output-like' bubbles so they are visible
                                            groups.push({ type: 'output', steps: [step] });
                                        } else {
                                            // It's a regular Thought, Action, Approval, OR intermediate Output (Planner/Researcher/Analyst)
                                            currentProcess.push(step);
                                        }
                                    }
                                });
                                // Flush remaining process steps
                                if (currentProcess.length > 0) {
                                    groups.push({ type: 'process', steps: [...currentProcess] });
                                }

                                return groups.map((group, groupIdx) => {
                                    if (group.type === 'process') {
                                        const latestStep = group.steps[group.steps.length - 1];
                                        const isRunning = groupIdx === groups.length - 1 && isLoading; // Assume isLoading is available from store

                                        // Process Block (The "Single Object")
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
                                                                {isRunning && (
                                                                    <span className="text-[10px] uppercase font-bold text-[#CAFF58] tracking-wider animate-pulse">
                                                                        {latestStep.agent?.toUpperCase() || 'SYSTEM'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!isRunning && (
                                                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                                                    Completed {group.steps.length} steps
                                                                </div>
                                                            )}
                                                        </div>

                                                        <ChevronRight className="w-4 h-4 text-zinc-500 group-open/details:rotate-90 transition-transform" />
                                                    </summary>

                                                    {/* Expanded Content */}
                                                    <div className="p-3 border-t border-white/5 space-y-3 bg-black/20">
                                                        {group.steps.map((step, idx) => (
                                                            <div key={`${step.id}-${idx}`} className="flex items-start gap-3 text-xs pl-2 border-l border-zinc-800 ml-1">
                                                                <div className={cn(
                                                                    "w-1.5 h-1.5 mt-1 rounded-full shrink-0",
                                                                    agentConfigs[step.agent || 'executor']?.bgColor.replace('/20', 'bg-') || 'bg-zinc-500'
                                                                )} />
                                                                <div className="flex-1 space-y-1">
                                                                    <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
                                                                        <span className="uppercase">{step.agent}</span>
                                                                        <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                                                                    </div>
                                                                    <div className="text-zinc-300">
                                                                        {step.label}
                                                                    </div>
                                                                    {step.type === 'action' && (
                                                                        <div className="bg-black/40 p-2 rounded border border-white/5 font-mono text-[10px] break-all text-zinc-400">
                                                                            {step.content.slice(0, 100)}{step.content.length > 100 && '...'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        );
                                    }

                                    // Regular Chat Bubbles (Input/Output)
                                    const step = group.steps[0];
                                    const isUser = step.type === 'input';

                                    return (
                                        <div key={`bubble-${groupIdx}`} className={cn(
                                            "flex flex-col gap-2 max-w-[95%] animate-in fade-in zoom-in-95 duration-300",
                                            isUser ? "self-end items-end" : "self-start items-start"
                                        )}>
                                            {!isUser && (
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                                        <Activity size={12} className="text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold text-zinc-400">Assistant</span>
                                                </div>
                                            )}

                                            <div className={cn(
                                                "p-4 text-sm leading-relaxed shadow-sm relative overflow-hidden group",
                                                isUser
                                                    ? "bg-[#27272a] text-zinc-200 rounded-2xl rounded-tr-sm border border-zinc-700"
                                                    : "bg-transparent text-zinc-100 font-sans"
                                            )}>
                                                {/* Content Rendering for Input/Output */}
                                                <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-table:my-2 prose-th:bg-zinc-800 prose-th:p-2 prose-td:p-2 prose-td:border-zinc-700 prose-th:border-zinc-700">
                                                    {step.content.split(/```python([\s\S]*?)```/g).map((part, i) => {
                                                        if (i % 2 === 1) {
                                                            return <PyodideExecutor key={i} code={part.trim()} autoRun={true} />;
                                                        }
                                                        return part.trim() ? (
                                                            <ReactMarkdown
                                                                key={i}
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    table: ({ node, ...props }) => (
                                                                        <div className="overflow-x-auto my-4">
                                                                            <table className="min-w-full border border-zinc-700 rounded-lg overflow-hidden" {...props} />
                                                                        </div>
                                                                    ),
                                                                    thead: ({ node, ...props }) => (
                                                                        <thead className="bg-zinc-800/50" {...props} />
                                                                    ),
                                                                    th: ({ node, ...props }) => (
                                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-300 border-b border-zinc-700" {...props} />
                                                                    ),
                                                                    td: ({ node, ...props }) => (
                                                                        <td className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-800" {...props} />
                                                                    ),
                                                                    code: ({ node, className, children, ...props }) => {
                                                                        const inline = !className;
                                                                        return inline ? (
                                                                            <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[#CAFF58] text-xs" {...props}>{children}</code>
                                                                        ) : (
                                                                            <pre className="bg-zinc-900 p-3 rounded-lg overflow-x-auto border border-zinc-800">
                                                                                <code className={className} {...props}>{children}</code>
                                                                            </pre>
                                                                        );
                                                                    },
                                                                    ul: ({ node, ...props }) => (
                                                                        <ul className="list-disc list-inside space-y-1 text-zinc-300" {...props} />
                                                                    ),
                                                                    ol: ({ node, ...props }) => (
                                                                        <ol className="list-decimal list-inside space-y-1 text-zinc-300" {...props} />
                                                                    ),
                                                                    li: ({ node, ...props }) => (
                                                                        <li className="text-zinc-300" {...props} />
                                                                    ),
                                                                    h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-zinc-100 mt-4 mb-2" {...props} />,
                                                                    h2: ({ node, ...props }) => <h2 className="text-base font-bold text-zinc-200 mt-3 mb-2" {...props} />,
                                                                    h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-zinc-300 mt-2 mb-1" {...props} />,
                                                                    p: ({ node, ...props }) => <p className="text-zinc-300 leading-relaxed" {...props} />,
                                                                    a: ({ node, ...props }) => <a className="text-[#CAFF58] hover:underline" {...props} />,
                                                                    blockquote: ({ node, ...props }) => (
                                                                        <blockquote className="border-l-2 border-[#CAFF58] pl-3 italic text-zinc-400 my-2" {...props} />
                                                                    ),
                                                                    hr: ({ node, ...props }) => <hr className="border-zinc-700 my-4" {...props} />,
                                                                }}
                                                            >
                                                                {part.trim()}
                                                            </ReactMarkdown>
                                                        ) : null;
                                                    })}
                                                </div>

                                                {/* Fallback for pre-computed images */}
                                                {step.content.includes("data:image") && !step.content.includes("```python") && (
                                                    <img
                                                        src={step.content.match(/data:image\/[a-zA-Z]+;base64,[^"]+/)?.[0]}
                                                        alt="Chart"
                                                        className="mt-4 rounded-lg border border-zinc-800 shadow-xl max-w-full hover:scale-105 transition-transform"
                                                    />
                                                )}

                                                {/* Meta Info - Always visible */}
                                                {!isUser && step.usage && (
                                                    <div className="mt-3 pt-3 border-t border-white/5 flex gap-4 text-[10px] text-zinc-500 font-mono">
                                                        <span className="flex items-center gap-1"><Activity size={10} /> {step.usage.totalTokens} tokens</span>
                                                        {(step as any).latencyMs && <span>{(step as any).latencyMs}ms</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>


                        {/* Input Area */}
                        <div className="p-4 pb-6 bg-zinc-950 border-t border-zinc-800 shrink-0 z-20">
                            <form onSubmit={handleSubmit} className="relative group">
                                <div className="absolute inset-0 bg-[#CAFF58] opacity-0 group-focus-within:opacity-5 transition-opacity rounded-lg pointer-events-none" />
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Enter directive..."
                                    className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-200 text-sm font-mono p-3 pl-4 pr-12 rounded-lg focus:outline-none focus:border-[#CAFF58]/50 focus:ring-1 focus:ring-[#CAFF58]/30 transition-all placeholder:text-zinc-600"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button type="submit" disabled={!input.trim()} className="p-1.5 text-[#CAFF58] hover:bg-[#CAFF58]/20 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                        <Send size={14} />
                                    </button>
                                </div>
                            </form>
                            <div className="flex justify-between mt-2 px-1">
                                <div className="flex gap-2">
                                    <button
                                        className="text-xs font-mono text-zinc-500 hover:text-[#CAFF58] flex items-center gap-1.5 px-2 py-1 rounded border border-transparent hover:border-zinc-700 transition-all"
                                        title="Toggle voice input"
                                    >
                                        <Mic size={12} />
                                        <span>Voice</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">OFF</span>
                                    </button>
                                </div>
                                <div className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Ready
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TELEMETRY TAB */}
                {activeTab === 'telemetry' && (
                    <div className="absolute inset-0 overflow-y-auto p-2 space-y-1 bg-zinc-950 font-mono text-[10px]" ref={scrollRef}>
                        {steps.map((log: AgentStep) => (
                            <div
                                key={log.id}
                                ref={(el) => { itemRefs.current[log.id] = el; }}
                                className={cn(
                                    "border-l-2 pl-2 py-1 transition-colors group cursor-pointer",
                                    selectedStepId === log.id ? "bg-white/10 border-primary" : "border-zinc-800 hover:bg-zinc-900/50"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                        "px-1 rounded text-[9px] font-bold",
                                        log.agent === 'planner' ? "text-amber-400 bg-amber-950/30" :
                                            log.agent === 'executor' ? "text-red-400 bg-red-950/30" :
                                                log.agent === 'researcher' ? "text-blue-400 bg-blue-950/30" :
                                                    "text-zinc-400 bg-zinc-900"
                                    )}>
                                        {log.agent?.toUpperCase() || 'SYSTEM'}
                                    </span>
                                    <span className="text-zinc-600 ml-auto">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="text-zinc-300 break-words leading-relaxed whitespace-pre-wrap">
                                    {log.content}
                                </div>
                                {/* Metrics Line */}
                                {((log as any).latencyMs || log.usage) && (
                                    <div className="flex gap-3 mt-1 text-[9px] text-zinc-600 opacity-50 group-hover:opacity-100 transition-opacity">
                                        {(log as any).latencyMs && <span className="flex items-center gap-0.5"><Activity size={8} /> {(log as any).latencyMs}ms</span>}
                                        {log.usage && <span>TOKENS: {log.usage.totalTokens}</span>}
                                        {log.usage?.cost && <span>${log.usage.cost.toFixed(4)}</span>}
                                    </div>
                                )}
                            </div>
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
        </div>
    );
}
