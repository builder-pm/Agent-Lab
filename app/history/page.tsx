"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Calendar, ArrowRight, CheckCircle, Split, Search } from "lucide-react";
import { BrutalBadge } from "@/components/ui/brutal";
import { cn } from "@/lib/utils";

interface Scenario {
    id: string;
    name: string;
    createdAt: string;
    _count: { steps: number };
}

export default function HistoryPage() {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchScenarios();
    }, []);

    const fetchScenarios = async () => {
        try {
            const res = await fetch("/api/scenarios");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setScenarios(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(s => s !== id));
        } else {
            if (selectedIds.length >= 2) {
                // Remove first, add new
                setSelectedIds([selectedIds[1], id]);
            } else {
                setSelectedIds([...selectedIds, id]);
            }
        }
    };

    const filteredScenarios = scenarios.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col font-sans bg-background">
            {/* Header */}
            <header className="h-14 border-b-4 border-border bg-card flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="font-bold text-lg font-space-grotesk tracking-tight flex items-baseline gap-2 text-primary">
                        SESSION HISTORY
                        <BrutalBadge className="text-[10px] px-1.5 py-0.5 bg-black text-white border-white">ARCHIVE</BrutalBadge>
                    </h1>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search sessions..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-200 focus:border-primary outline-none w-64"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    
                    {/* Selection Action Bar */}
                    <div className={cn(
                        "sticky top-0 z-20 bg-zinc-900/90 backdrop-blur border border-primary/50 p-4 rounded-lg flex items-center justify-between transition-all duration-300 transform",
                        selectedIds.length > 0 ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
                    )}>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                            <CheckCircle size={16} className="text-primary" />
                            {selectedIds.length} Selected
                            <span className="text-zinc-500 font-normal text-xs ml-2">(Select 2 to compare)</span>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setSelectedIds([])}
                                className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white"
                            >
                                CLEAR
                            </button>
                            {selectedIds.length === 2 && (
                                <Link
                                    href={`/compare?base=${selectedIds[1]}&candidate=${selectedIds[0]}`} // Newest as candidate typically
                                    className="flex items-center gap-2 px-4 py-1.5 bg-primary text-black text-xs font-bold hover:bg-primary/90 rounded"
                                >
                                    <Split size={14} /> COMPARE_RUNS
                                </Link>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 text-zinc-600 animate-pulse font-mono">LOADING_ARCHIVE...</div>
                    ) : filteredScenarios.length === 0 ? (
                        <div className="text-center py-20 text-zinc-500 font-mono">NO_SESSIONS_FOUND</div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredScenarios.map((s) => {
                                const isSelected = selectedIds.includes(s.id);
                                return (
                                    <div 
                                        key={s.id}
                                        onClick={() => toggleSelection(s.id)}
                                        className={cn(
                                            "group flex items-center justify-between p-4 border rounded cursor-pointer transition-all",
                                            isSelected 
                                                ? "bg-primary/10 border-primary" 
                                                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                isSelected ? "bg-primary border-primary" : "border-zinc-700 bg-black group-hover:border-zinc-500"
                                            )}>
                                                {isSelected && <CheckCircle size={12} className="text-black" />}
                                            </div>
                                            <div>
                                                <h3 className={cn("font-bold text-sm", isSelected ? "text-primary" : "text-zinc-200")}>
                                                    {s.name || "Untitled Session"}
                                                </h3>
                                                <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1 font-mono">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} /> {new Date(s.createdAt).toLocaleString()}
                                                    </span>
                                                    <span>{s._count.steps} steps</span>
                                                    <span>ID: {s.id.slice(-6)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link 
                                                href={`/compare?base=${s.id}&candidate=${s.id}`} 
                                                className="p-2 text-zinc-500 hover:text-white"
                                                onClick={(e) => e.stopPropagation()}
                                                title="View Trace"
                                            >
                                                <FileText size={16} />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
