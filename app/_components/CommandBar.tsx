"use client";

import React, { useState, useEffect } from "react";
import { Send, Clock, Zap, FlaskConical, Gauge, Brain } from "lucide-react";
import { useAgentStore } from "../_store/useAgentStore";
import { cn } from "@/lib/utils";

export const CommandBar = () => {
    const [prompt, setPrompt] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const {
        runScenario,
        isStreaming,
        toggleConsole,
        executionMode,
        setExecutionMode,
        isLabsEnabled,
        toggleLabs
    } = useAgentStore();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !isStreaming) {
            toggleConsole(); // Open the console first
            runScenario(prompt);
            setPrompt("");
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl p-2 flex items-center gap-3 shadow-2xl transition-all duration-300 hover:border-[#CAFF58]/30 max-w-4xl mx-auto w-full"
        >
            {/* Mode Toggle */}
            <div className="flex bg-zinc-950/50 p-1 rounded-lg border border-zinc-800 shrink-0">
                <button
                    type="button"
                    onClick={() => setExecutionMode('turbo')}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                        mounted && executionMode === 'turbo'
                            ? "bg-[#CAFF58] text-black shadow-lg"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                    title="Fast: Direct routing, lower latency"
                >
                    <Gauge size={12} />
                    FAST
                </button>
                <button
                    type="button"
                    onClick={() => setExecutionMode('linear')}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                        mounted && executionMode === 'linear'
                            ? "bg-zinc-800 text-white border border-zinc-700"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                    title="Reasoning: Multi-agent planning and analysis"
                >
                    <Brain size={12} />
                    REASONING
                </button>
            </div>

            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-200 text-sm placeholder:text-zinc-600 font-sans px-2"
                disabled={isStreaming}
            />

            <div className="flex items-center gap-2">
                {/* Labs Toggle */}
                <button
                    type="button"
                    onClick={toggleLabs}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                        mounted && isLabsEnabled
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : "bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700"
                    )}
                    title="Labs: Enable Python chart generation"
                >
                    <FlaskConical size={14} className={mounted && isLabsEnabled ? "animate-pulse" : ""} />
                    LABS
                </button>

                <button
                    type="submit"
                    disabled={isStreaming || !prompt.trim()}
                    title="Send message"
                    className={`bg-[#CAFF58] text-black p-2.5 rounded-lg flex items-center justify-center transition-all hover:bg-[#b8e64f] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg active:scale-95`}
                >
                    <Send size={16} />
                </button>
            </div>
        </form>
    );
};

