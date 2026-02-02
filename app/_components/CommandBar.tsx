"use client";

import React, { useState } from "react";
import { Send, Clock, Zap } from "lucide-react";
import { useAgentStore } from "../_store/useAgentStore";

export const CommandBar = () => {
    const [prompt, setPrompt] = useState("");
    const { runScenario, isStreaming, toggleConsole } = useAgentStore();

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
            className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl p-3 flex items-center gap-3 shadow-2xl transition-all duration-300 hover:border-[#CAFF58]/30"
        >
            <div className="flex items-center gap-4 px-3 py-1 border-r border-zinc-700 text-zinc-500 mr-1 shrink-0">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold" title="Average response time">
                    <Clock size={12} className="text-[#CAFF58]" />
                    12s
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold" title="Estimated cost">
                    <Zap size={12} className="text-[#CAFF58]" />
                    $0.002
                </div>
            </div>

            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask a question, paste a URL to scrape, or 'Compare X vs Y'..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-200 text-sm placeholder:text-zinc-500 font-sans"
                disabled={isStreaming}
            />

            <button
                type="submit"
                disabled={isStreaming || !prompt.trim()}
                title="Send message and open command center"
                className={`bg-[#CAFF58] text-black p-2.5 rounded-lg flex items-center justify-center transition-all hover:bg-[#b8e64f] disabled:opacity-30 disabled:cursor-not-allowed`}
            >
                <Send size={16} />
            </button>
        </form>
    );
};
