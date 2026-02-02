"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart2, TrendingUp, DollarSign, Activity, Zap } from "lucide-react";
import { BrutalBadge } from "@/components/ui/brutal";

interface AnalyticsData {
    summary: {
        totalRuns: number;
        totalScenarios: number;
        totalEvals: number;
        avgScore: number;
        totalCost: number;
        totalTokens: number;
    };
    latencyTrend: { date: string; latency: number; cost: number }[];
    recentRuns: any[];
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/analytics")
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <div className="h-screen flex items-center justify-center font-mono animate-pulse">CRUNCHING_NUMBERS...</div>;
    if (!data) return <div className="h-screen flex items-center justify-center font-mono text-rose-500">NO_DATA_AVAILABLE</div>;

    const { summary, latencyTrend } = data;

    return (
        <div className="h-screen w-screen flex flex-col font-sans text-foreground bg-background overflow-hidden selection:bg-accent selection:text-black">
            {/* Header */}
            <header className="h-14 border-b-4 border-border bg-card flex items-center px-4 justify-between z-30 relative shadow-sm">
                <div className="flex items-center gap-2">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                         <div className="w-8 h-8 bg-foreground flex items-center justify-center text-background">
                            <ArrowLeft size={18} />
                        </div>
                    </Link>
                    <h1 className="font-bold text-lg font-space-grotesk tracking-tight flex items-baseline gap-2 text-primary">
                        MISSION CONTROL
                        <BrutalBadge className="text-[10px] px-1.5 py-0.5 bg-black text-white border-white">ANALYTICS</BrutalBadge>
                    </h1>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-8 font-space-mono">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard 
                            label="AVG_QUALITY_SCORE" 
                            value={(summary.avgScore * 100).toFixed(1) + "%"} 
                            icon={<Activity size={16} />} 
                            trend={summary.avgScore > 0.8 ? "positive" : "neutral"}
                        />
                        <KPICard 
                            label="TOTAL_COST" 
                            value={`$${summary.totalCost.toFixed(4)}`} 
                            icon={<DollarSign size={16} />} 
                        />
                        <KPICard 
                            label="TOTAL_RUNS" 
                            value={summary.totalRuns} 
                            icon={<BarChart2 size={16} />} 
                        />
                         <KPICard 
                            label="TOTAL_EVALS" 
                            value={summary.totalEvals} 
                            icon={<Zap size={16} />} 
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Latency Chart */}
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                            <h3 className="font-bold text-zinc-400 mb-6 flex items-center gap-2 text-sm uppercase">
                                <TrendingUp size={16} /> Latency Trend (Last 20 Runs)
                            </h3>
                            <div className="h-64 w-full">
                                <LineChart data={latencyTrend.map(d => d.latency / 1000)} color="#10b981" />
                            </div>
                        </div>

                        {/* Cost Chart */}
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                            <h3 className="font-bold text-zinc-400 mb-6 flex items-center gap-2 text-sm uppercase">
                                <DollarSign size={16} /> Cost per Run (Last 20 Runs)
                            </h3>
                            <div className="h-64 w-full">
                                <BarChart data={latencyTrend.map(d => d.cost)} color="#f59e0b" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function KPICard({ label, value, icon, trend }: any) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">{label}</span>
                <span className="text-zinc-600">{icon}</span>
            </div>
            <div className={cn("text-2xl font-bold font-space-grotesk", 
                trend === "positive" ? "text-emerald-400" : 
                trend === "negative" ? "text-rose-400" : "text-zinc-200"
            )}>
                {value}
            </div>
        </div>
    );
}

// Simple SVG Line Chart
function LineChart({ data, color }: { data: number[], color: string }) {
    if (data.length === 0) return <div className="h-full flex items-center justify-center text-zinc-600 text-xs">NO_DATA</div>;
    
    const max = Math.max(...data, 1);
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (val / max) * 100;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                vectorEffect="non-scaling-stroke"
            />
            {/* Area under curve */}
            <polygon
                fill={color}
                fillOpacity="0.1"
                points={`0,100 ${points} 100,100`}
            />
        </svg>
    );
}

// Simple SVG Bar Chart
function BarChart({ data, color }: { data: number[], color: string }) {
    if (data.length === 0) return <div className="h-full flex items-center justify-center text-zinc-600 text-xs">NO_DATA</div>;

    const max = Math.max(...data, 0.0001); // Avoid div by zero
    
    return (
        <svg viewBox={`0 0 ${data.length * 10} 100`} className="w-full h-full" preserveAspectRatio="none">
            {data.map((val, i) => {
                const height = (val / max) * 100;
                return (
                    <rect
                        key={i}
                        x={i * 10 + 2}
                        y={100 - height}
                        width="6"
                        height={height}
                        fill={color}
                        rx="1"
                    />
                );
            })}
        </svg>
    );
}

import { cn } from "@/lib/utils";
