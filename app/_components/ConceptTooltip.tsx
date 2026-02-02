"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConceptTooltipProps {
    term: string;
    definition: string;
    children?: React.ReactNode;
    className?: string;
}

export const ConceptTooltip = ({ term, definition, children, className }: ConceptTooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <span
            className={cn("relative group cursor-help inline-flex items-center gap-1", className)}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children || <span className="border-b border-dotted border-zinc-500 hover:border-primary transition-colors">{term}</span>}
            {/* Optional Info Icon if no children provided to wrap */}
            {!children && <Info size={10} className="text-zinc-500 group-hover:text-primary transition-colors" />}

            {/* Tooltip Popup */}
            <div className={cn(
                "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl z-50 pointer-events-none transition-all duration-200 origin-bottom",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 translate-y-1"
            )}>
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                    {term}
                </div>
                <div className="text-[9px] text-zinc-300 leading-relaxed font-mono">
                    {definition}
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-700" />
            </div>
        </span>
    );
};
