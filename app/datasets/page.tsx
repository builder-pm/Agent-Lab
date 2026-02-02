"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Database, Plus, ChevronRight, FileText, Upload, Trash2, ArrowLeft } from "lucide-react";
import { BrutalBadge } from "@/components/ui/brutal";

interface Dataset {
    id: string;
    name: string;
    description: string;
    updatedAt: string;
    _count: { cases: number; runs: number };
}

export default function DatasetsPage() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState("");
    const [newDatasetDesc, setNewDatasetDesc] = useState("");

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            const res = await fetch("/api/datasets");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setDatasets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/datasets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newDatasetName, description: newDatasetDesc }),
            });
            if (res.ok) {
                setNewDatasetName("");
                setNewDatasetDesc("");
                setIsCreating(false);
                fetchDatasets();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Prevent link navigation
        if (!confirm("Are you sure you want to delete this dataset?")) return;
        try {
            await fetch(`/api/datasets/${id}`, { method: "DELETE" });
            fetchDatasets();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="h-full w-full flex flex-col font-sans text-foreground bg-background overflow-hidden selection:bg-accent selection:text-black">
            {/* Header */}
            <header className="h-14 border-b-4 border-border bg-card flex items-center px-4 justify-between z-30 relative shadow-sm">
                <div className="flex items-center gap-2">
                    <h1 className="font-bold text-lg font-space-grotesk tracking-tight flex items-baseline gap-2 text-primary">
                        THE GYM
                        <BrutalBadge className="text-[10px] px-1.5 py-0.5 bg-black text-white border-white">DATASETS</BrutalBadge>
                    </h1>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-8 font-space-mono">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                <Database className="text-primary" /> Training Sets
                            </h2>
                            <p className="text-zinc-500 text-sm">Manage test cases and golden datasets for regression testing.</p>
                        </div>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 bg-primary text-black px-4 py-2 font-bold hover:bg-primary/90 transition-colors border-2 border-primary hover:border-white"
                        >
                            <Plus size={16} /> NEW_DATASET
                        </button>
                    </div>

                    {isCreating && (
                        <form onSubmit={handleCreate} className="mb-8 bg-zinc-900 border border-zinc-700 p-6 rounded-lg animate-in fade-in slide-in-from-top-4">
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Dataset Name</label>
                                    <input
                                        type="text"
                                        value={newDatasetName}
                                        onChange={(e) => setNewDatasetName(e.target.value)}
                                        className="w-full bg-black border border-zinc-700 p-2 text-sm focus:border-primary outline-none text-white"
                                        placeholder="e.g. Smoke Tests v1"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Description</label>
                                    <input
                                        type="text"
                                        value={newDatasetDesc}
                                        onChange={(e) => setNewDatasetDesc(e.target.value)}
                                        className="w-full bg-black border border-zinc-700 p-2 text-sm focus:border-primary outline-none text-white"
                                        placeholder="Optional description..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newDatasetName}
                                        className="px-4 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 disabled:opacity-50"
                                    >
                                        CREATE_DATASET
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {isLoading ? (
                        <div className="text-center py-20 text-zinc-600 animate-pulse">LOADING_DATASETS...</div>
                    ) : datasets.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-xl">
                            <Database size={48} className="mx-auto text-zinc-700 mb-4" />
                            <h3 className="text-zinc-400 font-bold text-lg">No Datasets Found</h3>
                            <p className="text-zinc-600 text-sm mt-2">Create your first dataset to start benchmarking.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {datasets.map((d) => (
                                <Link
                                    key={d.id}
                                    href={`/datasets/${d.id}`}
                                    className="group block bg-zinc-900/50 border border-zinc-800 p-4 hover:border-primary/50 transition-all hover:bg-zinc-900"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-zinc-200 group-hover:text-primary transition-colors mb-1">
                                                {d.name}
                                            </h3>
                                            <p className="text-sm text-zinc-500 mb-4">{d.description || "No description provided."}</p>
                                            <div className="flex items-center gap-4 text-xs text-zinc-600">
                                                <span className="flex items-center gap-1">
                                                    <FileText size={12} /> {d._count.cases} CASES
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Upload size={12} /> {d._count.runs} RUNS
                                                </span>
                                                <span className="text-zinc-700">|</span>
                                                <span>UPDATED {new Date(d.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={(e) => handleDelete(e, d.id)}
                                                className="p-2 text-zinc-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Dataset"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <ChevronRight className="text-zinc-700 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
