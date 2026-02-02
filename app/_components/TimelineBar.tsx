"use client";

import React from "react";
import { useAgentStore } from "../_store/useAgentStore";
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from "lucide-react";
import { cn } from "@/lib/utils";

export const TimelineBar = () => {
    const {
        currentScenario,
        currentStepIndex,
        isPlaying,
        play,
        pause,
        seekTo,
        nextStep,
        prevStep
    } = useAgentStore();

    if (!currentScenario || currentScenario.steps.length === 0) return null;

    const totalSteps = currentScenario.steps.length;
    const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

    return (
        <div className="h-16 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 flex items-center px-6 gap-6 z-50 animate-in slide-in-from-bottom-full duration-500">
            {/* Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => seekTo(0)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <SkipBack size={16} />
                </button>
                <button
                    onClick={prevStep}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <Rewind size={16} />
                </button>

                <button
                    onClick={isPlaying ? pause : play}
                    className="w-10 h-10 bg-primary text-black rounded-full flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"
                >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>

                <button
                    onClick={nextStep}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <FastForward size={16} />
                </button>
                <button
                    onClick={() => seekTo(totalSteps - 1)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <SkipForward size={16} />
                </button>
            </div>

            {/* Scrubber */}
            <div className="flex-1 flex flex-col justify-center gap-2">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <span>Step {currentStepIndex + 1} / {totalSteps}</span>
                    <span>{currentScenario.name || 'Unhalting Execution'}</span>
                </div>
                <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden group cursor-pointer"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = x / rect.width;
                        const step = Math.floor(pct * totalSteps);
                        seekTo(step);
                    }}
                >
                    {/* Tick Marks for Steps */}
                    <div className="absolute inset-0 flex justify-between px-0.5 opacity-0 group-hover:opacity-30 transition-opacity">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div key={i} className="w-px h-full bg-white/50" />
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </div>

            {/* Dynamic Status Display in Bar */}
            <div className="w-64 flex flex-col items-end">
                <div className="text-[10px] text-zinc-500 font-mono uppercase">Current Action</div>
                <div className="text-xs text-zinc-300 font-mono truncate max-w-full">
                    {currentScenario.steps[currentStepIndex]?.label || 'Idle'}
                </div>
            </div>
        </div>
    );
};
