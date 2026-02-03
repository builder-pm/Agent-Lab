"use client";

import React, { useState, useMemo } from "react";
import { AgentStep, AgentType, useAgentStore } from "../_store/useAgentStore";
import { X, Layers, Clock, Zap, Coins, ChevronRight, Binary, Fingerprint, Terminal, Brain, ArrowRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PyodideExecutor } from "./PyodideExecutor";

interface SessionDetailModalProps {
    agent: AgentType;
    steps: AgentStep[];
    onClose: () => void;
}

export const SessionDetailModal = ({ agent, steps, onClose }: SessionDetailModalProps) => {
    const { agentConfigs } = useAgentStore();
    const config = agentConfigs[agent];
    const [selectedStepIdx, setSelectedStepIdx] = useState(0);
    const selectedStep = steps[selectedStepIdx];
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLogs = () => {
        const logs = JSON.stringify(steps, null, 2);
        navigator.clipboard.writeText(logs);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Aggregate Metrics for header
    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];
    const sessionDuration = (lastStep.timestamp - firstStep.timestamp) || 0;
    const totalTokens = steps.reduce((acc, s) => acc + (s.usage?.totalTokens || 0), 0);
    const totalCost = steps.reduce((acc, s) => acc + (s.usage?.cost || 0), 0);

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-8" onClick={onClose}>
            <div
                className="w-full max-w-6xl h-full bg-[#09090b] border border-zinc-800 rounded-2xl shadow-[0_20px_100px_rgba(0,0,0,0.8)] flex overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* LEFT SIDEBAR: Step Navigator (Master) */}
                <div className="w-72 border-r border-zinc-800 flex flex-col bg-[#0c0c0e]">
                    <div className="p-6 border-b border-white/5 flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]", config.bgColor.replace('/20', ''))} />
                        <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-400">Step Protocol</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                        {steps.map((step, idx) => (
                            <button
                                key={step.id}
                                onClick={() => setSelectedStepIdx(idx)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                                    selectedStepIdx === idx
                                        ? "bg-white/5 ring-1 ring-white/10"
                                        : "hover:bg-white/5"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                    selectedStepIdx === idx ? "bg-primary text-black" : "bg-zinc-900 text-zinc-600 group-hover:text-zinc-400"
                                )}>
                                    <span className="text-[10px] font-black">{idx + 1}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className={cn(
                                        "text-[10px] font-bold uppercase truncate",
                                        selectedStepIdx === idx ? "text-white" : "text-zinc-500"
                                    )}>
                                        {step.label}
                                    </div>
                                    <div className="text-[8px] text-zinc-600 font-mono mt-0.5">
                                        {new Date(step.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                                {selectedStepIdx === idx && (
                                    <ChevronRight size={14} className="ml-auto text-primary" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-black/20">
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2">
                            <span>SESSION_AGGREGATE</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-zinc-900/50 p-2 rounded-lg border border-white/5">
                                <div className="text-[8px] text-zinc-600 uppercase mb-1">Duration</div>
                                <div className="text-white font-bold">{sessionDuration}ms</div>
                            </div>
                            <div className="bg-zinc-900/50 p-2 rounded-lg border border-white/5">
                                <div className="text-[8px] text-zinc-600 uppercase mb-1">Total Cost</div>
                                <div className="text-primary font-bold">${totalCost.toFixed(5)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT AREA: Enriched Telemetry (Detail) */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    {/* Detail Header */}
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter", config.bgColor, config.color)}>
                                    {config.name}
                                </span>
                                <span className="text-zinc-700 font-mono text-[10px] tracking-widest">STEP::{selectedStepIdx + 1}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{selectedStep.label}</h2>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Latency</div>
                                <div className="text-lg font-mono text-white">
                                    {selectedStep.usage ? (selectedStep.metadata?.latencyMs || 0).toFixed(0) : '0'}ms
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Tokens</div>
                                <div className="text-lg font-mono text-white">
                                    {(selectedStep.usage?.totalTokens || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button
                                    onClick={handleCopyLogs}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-all text-zinc-400 hover:text-white"
                                    title="Copy All Logs"
                                >
                                    {isCopied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                                </button>
                                <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-all">
                                    <X size={20} className="text-zinc-400" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-12 space-y-12 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                        {/* INPUT SECTION */}
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowRight size={14} className="text-zinc-500" />
                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Input Telemetry</h4>
                                <div className="h-px flex-1 bg-zinc-800 ml-2" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Fingerprint size={16} className="text-blue-400" />
                                            <span className="text-[10px] font-bold text-zinc-300">FROM: {selectedStep.inputFrom?.toUpperCase() || 'USER'}</span>
                                        </div>
                                        <div className="text-[9px] font-mono text-zinc-600">INPUT_TOKENS: {selectedStep.usage?.inputTokens || 0}</div>
                                    </div>
                                    <div className="text-sm text-zinc-400 font-sans leading-relaxed line-clamp-6 whitespace-pre-wrap italic">
                                        "{selectedStep.input || selectedStep.promptConsumed || 'No direct input trace captured.'}"
                                    </div>
                                </div>
                                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Terminal size={16} className="text-primary" />
                                        <span className="text-[10px] font-bold text-zinc-300 uppercase">Model Specification</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded text-[10px] font-bold">
                                                {selectedStep.modelInfo?.name || 'GPT-4o'}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                                                <span>Context Utilization</span>
                                                <span>{selectedStep.modelInfo?.contextLimit || '128k'} Max</span>
                                            </div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary/40" style={{ width: '8%' }} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                                                <span>Output Margin</span>
                                                <span>{selectedStep.modelInfo?.outputLimit || '4,096'} Max</span>
                                            </div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500/40" style={{ width: '12%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SYSTEM PROMPT & REASONING */}
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Binary size={14} className="text-zinc-500" />
                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Logic & Trace</h4>
                                <div className="h-px flex-1 bg-zinc-800 ml-2" />
                            </div>
                            <div className="space-y-6">
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 font-mono text-[11px]">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-zinc-500 uppercase tracking-tighter">System_Prompt_Configuration</span>
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-900" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-900" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-900" />
                                        </div>
                                    </div>
                                    <div className="text-zinc-500 leading-relaxed overflow-x-auto whitespace-pre max-h-48 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                        {selectedStep.systemPrompt || 'STATIC_OR_DYNAMIC_CONFIG'}
                                    </div>
                                </div>

                                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden group/reasoning">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/reasoning:opacity-30 transition-opacity">
                                        <Brain size={120} />
                                    </div>
                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <Brain size={18} className="text-purple-400" />
                                            <span className="text-[11px] font-bold text-zinc-200">INTERNAL_CHAIN_OF_THOUGHT</span>
                                        </div>
                                        <div className="text-[9px] font-mono text-purple-600">REASONING_TOKENS: {(selectedStep.usage?.reasoningTokens || selectedStep.metadata?.meta?.reasoningTokens || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="text-zinc-400 text-sm leading-relaxed space-y-3 relative z-10">
                                        {selectedStep.reasoning ? (
                                            <div className="prose prose-invert prose-sm max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {selectedStep.reasoning}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="italic text-zinc-600">No explicit chain-of-thought tokens recorded for this generation.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* FINAL OUTPUT */}
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowRight size={14} className="text-zinc-500 rotate-180" />
                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Step Output</h4>
                                <div className="h-px flex-1 bg-zinc-800 ml-2" />
                            </div>
                            <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Handover To:</span>
                                        <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                            {selectedStep.handoverTo?.toUpperCase() || 'USER'}
                                        </span>
                                    </div>
                                    <div className="text-[9px] font-mono text-zinc-600">OUTPUT_TOKENS: {selectedStep.usage?.outputTokens || 0}</div>
                                </div>
                                <div className="prose prose-invert prose-zinc max-w-none prose-sm">
                                    {selectedStep.metadata?.tool === 'code_interpreter' ? (
                                        <PyodideExecutor code={JSON.parse(selectedStep.content).code || selectedStep.content} autoRun={true} />
                                    ) : (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {selectedStep.content}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Bottom Status Bar */}
                    <div className="h-10 border-t border-white/5 bg-zinc-950 flex items-center px-8 justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                        <div className="flex items-center gap-4">
                            <span>Proto_ID: {selectedStep.id}</span>
                            <span>Fingerprint: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span>System_Synchronized</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
