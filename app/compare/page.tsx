"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Coins, Hash, AlertTriangle, CheckCircle, AlignCenterHorizontal } from "lucide-react";
import { BrutalBadge } from "@/components/ui/brutal";
import { cn } from "@/lib/utils";

interface Step {
    id: string;
    agent: string;
    stepLabel: string;
    content: string;
    timestamp: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

interface Scenario {
    id: string;
    name: string;
    steps: Step[];
    evaluations: any[];
}

interface AlignedRow {
    base: Step | null;
    candidate: Step | null;
}

export default function ComparePage() {
    const searchParams = useSearchParams();
    const baseId = searchParams.get("base");
    const candidateId = searchParams.get("candidate");

    const [base, setBase] = useState<Scenario | null>(null);
    const [candidate, setCandidate] = useState<Scenario | null>(null);
    const [alignedSteps, setAlignedSteps] = useState<AlignedRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (baseId && candidateId) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [baseId, candidateId]);

    const fetchData = async () => {
        try {
            const [res1, res2] = await Promise.all([
                fetch(`/api/scenarios/${baseId}`),
                fetch(`/api/scenarios/${candidateId}`)
            ]);
            
            if (res1.ok && res2.ok) {
                const b = await res1.json();
                const c = await res2.json();
                setBase(b);
                setCandidate(c);
                setAlignedSteps(alignSteps(b.steps, c.steps));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center font-mono animate-pulse">PREPARING_ARENA...</div>;
    
    if (!baseId || !candidateId) {
        return (
            <div className="h-full flex flex-col items-center justify-center font-mono space-y-4">
                <div className="text-zinc-500 font-bold text-lg">MISSING_COMBATANTS</div>
                <p className="text-zinc-600 text-sm">Please select two runs from the History or Gym to compare.</p>
                <Link href="/history" className="px-4 py-2 bg-primary text-black font-bold rounded hover:opacity-80 transition-opacity">
                    GO_TO_HISTORY
                </Link>
            </div>
        );
    }

    if (!base || !candidate) return <div className="h-full flex items-center justify-center font-mono text-rose-500">INVALID_MATCHUP</div>;

    // Calculate Totals
    const getTotals = (s: Scenario) => s.steps.reduce((acc, step) => ({
        tokens: acc.tokens + step.inputTokens + step.outputTokens,
        cost: acc.cost + step.cost,
        latency: acc.latency + step.latencyMs
    }), { tokens: 0, cost: 0, latency: 0 });

    const baseStats = getTotals(base);
    const candStats = getTotals(candidate);

    const isSingleMode = baseId === candidateId;

    return (
        <div className="h-full w-full flex flex-col font-sans text-foreground bg-background overflow-hidden selection:bg-accent selection:text-black">
            {/* Header */}
            <header className="h-14 border-b-4 border-border bg-card flex items-center px-4 justify-between z-30 relative shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="font-bold text-lg font-space-grotesk tracking-tight flex items-baseline gap-2 text-primary">
                        {isSingleMode ? "TRACE INSPECTOR" : "THE ARENA"}
                        <BrutalBadge className="text-[10px] px-1.5 py-0.5 bg-black text-white border-white">
                            {isSingleMode ? "SINGLE_VIEW" : "DIFF_VIEW"}
                        </BrutalBadge>
                    </h1>
                </div>
                {!isSingleMode && (
                    <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
                       <AlignCenterHorizontal size={14} /> 
                       <span>{alignedSteps.length} STEPS (ALIGNED)</span>
                    </div>
                )}
            </header>

            {/* Scoreboard */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 shrink-0 font-mono text-xs">
                <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8">
                    <MetricCard 
                        label="LATENCY" 
                        icon={<Clock size={14} />} 
                        base={baseStats.latency / 1000} 
                        candidate={isSingleMode ? 0 : candStats.latency / 1000} 
                        unit="s" 
                        invert={true}
                        single={isSingleMode}
                    />
                    <MetricCard 
                        label="TOTAL_COST" 
                        icon={<Coins size={14} />} 
                        base={baseStats.cost} 
                        candidate={isSingleMode ? 0 : candStats.cost} 
                        unit="$" 
                        invert={true}
                        single={isSingleMode}
                    />
                    <MetricCard 
                        label="TOKENS" 
                        icon={<Hash size={14} />} 
                        base={baseStats.tokens} 
                        candidate={isSingleMode ? 0 : candStats.tokens} 
                        unit="" 
                        invert={true}
                        single={isSingleMode}
                    />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-zinc-950">
                {isSingleMode ? (
                    // SINGLE TRACE MODE
                    <div className="max-w-3xl mx-auto p-8 space-y-6">
                        <div className="text-center font-bold text-zinc-500 text-xs uppercase tracking-widest mb-8">
                            TRACE ID: {base.id}
                        </div>
                        {base.steps.map((step, i) => (
                            <StepCard key={step.id} step={step} index={i} />
                        ))}
                    </div>
                ) : (
                    // DUAL COMPARISON MODE
                    <>
                        <div className="grid grid-cols-2 sticky top-0 z-10 border-b border-zinc-800">
                             <div className="p-3 bg-zinc-950 text-center font-bold text-zinc-500 text-xs uppercase tracking-widest border-r border-zinc-800">
                                BASE RUN ({base.id.slice(-6)})
                            </div>
                            <div className="p-3 bg-zinc-900/50 text-center font-bold text-primary text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                CANDIDATE RUN ({candidate.id.slice(-6)})
                                <span className="bg-primary text-black px-1 rounded text-[9px]">NEW</span>
                            </div>
                        </div>

                        <div className="max-w-[1920px] mx-auto">
                            {alignedSteps.map((row, i) => (
                                <div key={i} className="grid grid-cols-2 border-b border-zinc-800/50 hover:bg-zinc-900/20 transition-colors group">
                                    <div className="p-4 border-r border-zinc-800/50 min-w-0">
                                        {row.base ? (
                                            <StepCard step={row.base} index={base.steps.indexOf(row.base)} />
                                        ) : (
                                            <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-900 rounded opacity-20 text-zinc-600 font-mono text-xs uppercase p-8">
                                                (No Step)
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-zinc-900/10 min-w-0">
                                        {row.candidate ? (
                                            <StepCard 
                                                step={row.candidate} 
                                                index={candidate.steps.indexOf(row.candidate)} 
                                                isCandidate 
                                                comparisonStep={row.base} 
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-900 rounded opacity-20 text-zinc-600 font-mono text-xs uppercase p-8">
                                                (No Step)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

// --- Logic ---

function alignSteps(baseSteps: Step[], candSteps: Step[]): AlignedRow[] {
    const aligned: AlignedRow[] = [];
    let i = 0, j = 0;
    const LOOKAHEAD = 3; // How far to search for a match

    while (i < baseSteps.length || j < candSteps.length) {
        const b = baseSteps[i];
        const c = candSteps[j];

        // 1. End of list handling
        if (!b) { 
            aligned.push({ base: null, candidate: c });
            j++; 
            continue; 
        }
        if (!c) { 
            aligned.push({ base: b, candidate: null });
            i++; 
            continue; 
        }

        // 2. Direct Match
        if (isMatch(b, c)) {
            aligned.push({ base: b, candidate: c });
            i++; j++;
            continue;
        }

        // 3. Mismatch - Look ahead
        // Does 'b' appear later in candidate?
        let foundBInCand = -1;
        for (let k = 1; k <= LOOKAHEAD; k++) {
            if (j + k < candSteps.length && isMatch(b, candSteps[j + k])) {
                foundBInCand = k;
                break;
            }
        }

        // Does 'c' appear later in base?
        let foundCInBase = -1;
        for (let k = 1; k <= LOOKAHEAD; k++) {
            if (i + k < baseSteps.length && isMatch(baseSteps[i + k], c)) {
                foundCInBase = k;
                break;
            }
        }

        if (foundBInCand !== -1 && (foundCInBase === -1 || foundBInCand < foundCInBase)) {
            // Candidate inserted extra steps before 'b'
            // Emit gap for base, consume candidate
            aligned.push({ base: null, candidate: c });
            j++;
        } else if (foundCInBase !== -1) {
            // Base inserted extra steps before 'c'
            // Emit base, gap for candidate
            aligned.push({ base: b, candidate: null });
            i++;
        } else {
            // No match found nearby, assume modified step
            aligned.push({ base: b, candidate: c });
            i++; j++;
        }
    }

    return aligned;
}

function isMatch(s1: Step, s2: Step) {
    return s1.agent === s2.agent && s1.stepLabel === s2.stepLabel;
}

// Simple Word Diff
function diffWords(oldText: string, newText: string) {
    const oldWords = oldText.split(/\b/);
    const newWords = newText.split(/\b/);
    // This is a naive heuristic diff for visualization
    // A proper diff lib would be better but keeping it dep-free for now.
    // Actually, for simplicity and stability without a lib, let's just highlight 
    // the whole block if different, OR strictly added/removed at end.
    // ...
    // Better approach: Use a very simple LCS (Longest Common Subsequence) based diff.
    // For now, I'll use a simplified token matching.
    
    // Fallback: If texts are vastly different, return whole newText as added.
    if (Math.abs(oldWords.length - newWords.length) > newWords.length / 2) {
         return [{ type: 'changed', value: newText }];
    }

    // Since implementing a full Myers diff algorithm here is too verbose,
    // I will use a simple "highlight new content" approach if it's an append,
    // or just plain text if it's a total rewrite.
    // Wait, let's at least try to highlight exact matches vs non-matches.
    
    return [{ type: 'normal', value: newText }]; // Placeholder to be replaced by render logic below
}

// --- Components ---

function MetricCard({ label, icon, base, candidate, unit, invert }: any) {
    const diff = candidate - base;
    const pct = base === 0 ? 0 : (diff / base) * 100;
    const isGood = invert ? diff <= 0 : diff >= 0;
    const fmt = (n: number) => unit === '$' ? `$${n.toFixed(4)}` : unit === 's' ? `${n.toFixed(2)}s` : n.toLocaleString();

    return (
        <div className="flex items-center justify-between bg-black/20 p-2 rounded border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500">
                {icon} <span>{label}</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-zinc-500 line-through decoration-zinc-700 decoration-2">{fmt(base)}</div>
                <div className="text-zinc-200 font-bold">{fmt(candidate)}</div>
                <div className={cn("px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-1", isGood ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                    {isGood ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                    {diff > 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
            </div>
        </div>
    );
}

function StepCard({ step, index, isCandidate, comparisonStep }: any) {
    // Basic diffing view if comparison provided
    const isDifferent = comparisonStep && comparisonStep.content !== step.content;

    return (
        <div className={cn("border rounded p-3 text-xs font-mono h-full flex flex-col", isCandidate ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950 border-zinc-800")}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500">#{index + 1}</span>
                    <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px] uppercase", 
                        step.agent === 'planner' ? 'bg-violet-500/20 text-violet-400' :
                        step.agent === 'researcher' ? 'bg-cyan-500/20 text-cyan-400' :
                        'bg-zinc-700 text-zinc-300'
                    )}>
                        {step.agent}
                    </span>
                    <span className="text-zinc-400 font-bold">{step.stepLabel}</span>
                </div>
                <span className={cn("transition-colors", isDifferent ? "text-amber-400 font-bold" : "text-zinc-600")}>
                    {(step.latencyMs / 1000).toFixed(2)}s
                </span>
            </div>
            <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed opacity-90 flex-1">
                {isDifferent && isCandidate ? (
                    <DiffView oldText={comparisonStep.content} newText={step.content} />
                ) : (
                    step.content
                )}
            </div>
        </div>
    );
}

// Simple Diff Component
function DiffView({ oldText, newText }: { oldText: string, newText: string }) {
    // Very basic word diff
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);
    
    // If drastically different, just show new text in green
    if (Math.abs(oldWords.length - newWords.length) > newWords.length * 0.8) {
         return <span className="text-emerald-400 bg-emerald-950/30">{newText}</span>;
    }

    // Basic heuristic: Iterate new words, if match old, render normal. If not, render green.
    // This is NOT a real diff (Myers), but "Show what is new".
    // Real diff is too complex for a single file snippet without libs.
    // So we will stick to: Highlighting lines that changed.
    
    const lines = newText.split('\n');
    const oldLines = oldText.split('\n');

    return (
        <span>
            {lines.map((line, i) => {
                const isNew = !oldLines.includes(line);
                return (
                    <div key={i} className={cn(isNew ? "bg-emerald-950/50 text-emerald-300" : "")}>
                        {line}
                    </div>
                )
            })}
        </span>
    );
}
