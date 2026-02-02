"use client";

import React, { useState } from "react";
import { X, Save, Shield, Terminal, Zap, Maximize2 } from "lucide-react";
import { useAgentStore, AgentType } from "../_store/useAgentStore";
import { AVAILABLE_MODELS } from "../_store/useAgentStore";
import { cn } from "@/lib/utils";

interface PrismHUDProps {
    agentId: AgentType;
    onClose: () => void;
}

export const PrismHUD = ({ agentId, onClose }: PrismHUDProps) => {
    const { agentConfigs, updateAgentConfig } = useAgentStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const config = agentConfigs[agentId];

    if (!config) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
                onClick={onClose}
            />

            {/* HUD Central Card */}
            <div className={cn(
                "w-full brutal-card bg-card p-6 relative pointer-events-auto shadow-[20px_20px_0_0_rgba(0,0,0,1)] flex flex-col gap-6 overflow-y-auto max-h-full scrollbar-hide transition-all duration-300",
                isExpanded ? "max-w-[95vw] h-[90vh]" : "max-w-2xl px-6"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between border-b-4 border-border pb-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-primary flex-shrink-0 flex items-center justify-center text-black brutal-border">
                            <Shield size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold uppercase tracking-tighter truncate">
                                {agentId} Configuration
                            </h2>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                                Edit System Prompt & Model Settings
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        {isExpanded && (
                            <button onClick={() => setIsExpanded(false)} className="px-3 py-1 bg-zinc-800 text-xs font-mono text-zinc-400 hover:text-white">
                                EXIT_FULLSCREEN
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 brutal-border transition-colors h-10 w-10 flex items-center justify-center"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Configuration Grid */}
                <div className={cn("grid gap-8 transition-all", isExpanded ? "grid-cols-1 md:grid-cols-[300px_1fr] h-full" : "grid-cols-1 md:grid-cols-2")}>
                    {/* Role & Model */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-primary mb-2 block tracking-widest">
                                Role / Identity
                            </label>
                            <input
                                type="text"
                                value={config.role}
                                onChange={(e) => updateAgentConfig(agentId, { role: e.target.value })}
                                className="w-full bg-muted border-2 border-border p-2 text-xs font-space-grotesk focus:border-primary outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase text-primary mb-2 block tracking-widest">
                                Model
                            </label>
                            <select
                                value={config.selectedModel}
                                onChange={(e) => updateAgentConfig(agentId, { selectedModel: e.target.value })}
                                className="w-full bg-muted border-2 border-border p-2 text-xs font-mono focus:border-primary outline-none cursor-pointer"
                            >
                                {AVAILABLE_MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Token Limits */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block tracking-widest">
                                    Context (Input)
                                </label>
                                <input
                                    type="number"
                                    value={config.maxInputTokens || 128000}
                                    onChange={(e) => updateAgentConfig(agentId, { maxInputTokens: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-muted border-2 border-border p-2 text-xs font-mono focus:border-primary outline-none text-zinc-300"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block tracking-widest">
                                    Max Tokens (Output)
                                </label>
                                <input
                                    type="number"
                                    value={config.maxOutputTokens}
                                    onChange={(e) => updateAgentConfig(agentId, { maxOutputTokens: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-muted border-2 border-border p-2 text-xs font-mono focus:border-primary outline-none text-zinc-300"
                                />
                            </div>
                        </div>




                        {/* Available Tools */}
                        <div>
                            <label className="text-[10px] font-bold uppercase text-primary mb-2 block tracking-widest">
                                Available Tools
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {(config.tools || []).map((tool, i) => (
                                    <div key={i} className="bg-muted border border-border px-2 py-1 text-[10px] font-mono flex items-center gap-2 text-zinc-300">
                                        <Zap size={10} className="text-yellow-400" />
                                        {tool}
                                    </div>
                                ))}
                                <button className="px-2 py-1 bg-zinc-800 border border-border text-zinc-400 text-[10px] hover:text-white transition-colors">
                                    + LINK
                                </button>
                            </div>
                        </div>

                        {/* Guardrails (Moved to left col in expanded mode) */}
                        <div className={isExpanded ? "block" : "hidden"}>
                            <label className="text-[10px] font-bold uppercase text-primary mb-2 block tracking-widest">
                                Guardrails
                            </label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {config.guardrails.map((g, i) => (
                                    <div key={i} className="bg-black/40 border border-border px-2 py-1 text-[10px] font-mono flex items-center gap-2">
                                        <Shield size={10} className="text-primary" />
                                        {g}
                                    </div>
                                ))}
                                <button className="px-2 py-1 bg-primary text-black text-[10px] font-bold hover:opacity-80 transition-opacity">
                                    + ADD_RULE
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-2 flex flex-col h-full">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase text-primary block tracking-widest">
                                System Instructions
                            </label>
                            {!isExpanded && (
                                <button onClick={() => setIsExpanded(true)} className="flex items-center gap-1 text-[9px] font-mono text-zinc-400 hover:text-primary">
                                    <Maximize2 size={10} /> EXPAND
                                </button>
                            )}
                        </div>
                        <textarea
                            value={config.systemPrompt}
                            onChange={(e) => updateAgentConfig(agentId, { systemPrompt: e.target.value })}
                            className={cn(
                                "w-full bg-muted border-2 border-border p-4 text-xs font-mono focus:border-primary outline-none resize-none leading-relaxed overflow-auto",
                                isExpanded ? "flex-1 text-sm bg-zinc-950" : "min-h-[120px]"
                            )}
                        />
                    </div>
                </div>

                {/* Guardrails (Original position for condensed mode) */}
                <div className={!isExpanded ? "block" : "hidden"}>
                    <label className="text-[10px] font-bold uppercase text-primary mb-2 block tracking-widest">
                        Guardrails
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {config.guardrails.map((g, i) => (
                            <div key={i} className="bg-black/40 border border-border px-2 py-1 text-[10px] font-mono flex items-center gap-2">
                                <Shield size={10} className="text-primary" />
                                {g}
                            </div>
                        ))}
                        <button className="px-2 py-1 bg-primary text-black text-[10px] font-bold hover:opacity-80 transition-opacity">
                            + ADD_RULE
                        </button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border-2 border-border text-xs font-bold uppercase hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 brutal-button-primary text-xs"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
