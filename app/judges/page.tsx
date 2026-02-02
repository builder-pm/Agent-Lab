"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gavel, Plus, Settings, Trash2, Edit2, Save, X } from "lucide-react";
import { BrutalBadge } from "@/components/ui/brutal";
import { cn } from "@/lib/utils";

interface Judge {
    id: string;
    name: string;
    type: 'LLM' | 'HUMAN' | 'HEURISTIC';
    config: string;
}

export default function JudgesPage() {
    const [judges, setJudges] = useState<Judge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
    
    // Form State
    const [formData, setFormData] = useState({ name: "", type: "LLM", config: "" });

    useEffect(() => {
        fetchJudges();
    }, []);

    const fetchJudges = async () => {
        try {
            const res = await fetch("/api/judges");
            const data = await res.json();
            setJudges(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (judge?: Judge) => {
        if (judge) {
            setEditingJudge(judge);
            setFormData({ name: judge.name, type: judge.type, config: judge.config || "" });
        } else {
            setEditingJudge(null);
            setFormData({ name: "", type: "LLM", config: "You are an expert AI evaluator. Grade the response on a scale of 0 to 1 based on..." });
        }
        setIsModalOpen(true);
    };

    const saveJudge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingJudge) {
                await fetch(`/api/judges/${editingJudge.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });
            } else {
                await fetch("/api/judges", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });
            }
            setIsModalOpen(false);
            fetchJudges();
        } catch (e) {
            console.error(e);
            alert("Failed to save judge");
        }
    };

    const deleteJudge = async (id: string) => {
        if (!confirm("Are you sure you want to delete this judge?")) return;
        try {
            await fetch(`/api/judges/${id}`, { method: "DELETE" });
            fetchJudges();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col font-sans text-foreground bg-background overflow-hidden selection:bg-accent selection:text-black">
             {/* Header */}
            <header className="h-14 border-b-4 border-border bg-card flex items-center px-4 justify-between z-30 relative shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                         <div className="w-8 h-8 bg-foreground flex items-center justify-center text-background">
                            <ArrowLeft size={18} />
                        </div>
                    </Link>
                    <h1 className="font-bold text-lg font-space-grotesk tracking-tight flex items-baseline gap-2 text-primary">
                        THE COURTROOM
                        <BrutalBadge className="text-[10px] px-1.5 py-0.5 bg-black text-white border-white">JUDGES</BrutalBadge>
                    </h1>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-2 text-xs font-bold font-mono bg-primary text-black px-3 py-1.5 border border-primary hover:bg-primary/90 transition-colors"
                >
                    <Plus size={12} /> NEW_JUDGE
                </button>
            </header>

            <main className="flex-1 overflow-auto p-8 font-space-mono">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {judges.map((judge) => (
                        <div key={judge.id} className="group bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-primary/50 transition-colors relative flex flex-col h-64">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Gavel size={16} className="text-zinc-500 group-hover:text-primary transition-colors" />
                                        <h3 className="font-bold text-lg text-zinc-200">{judge.name}</h3>
                                    </div>
                                    <span className="text-[10px] font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                        {judge.type}
                                    </span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openModal(judge)}
                                        className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => deleteJudge(judge.id)}
                                        className="p-1.5 bg-zinc-800 rounded hover:bg-rose-500/20 text-zinc-300 hover:text-rose-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-black/50 p-3 rounded border border-zinc-800/50 text-xs text-zinc-500 font-mono overflow-hidden relative">
                                <div className="absolute inset-0 p-3 whitespace-pre-wrap">
                                    {judge.config ? judge.config.slice(0, 300) + (judge.config.length > 300 ? "..." : "") : "No configuration."}
                                </div>
                            </div>
                        </div>
                    ))}

                    {judges.length === 0 && !isLoading && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                            <Gavel size={48} className="mx-auto text-zinc-700 mb-4" />
                            <h3 className="text-zinc-500 font-bold">No Judges Appointed</h3>
                            <p className="text-zinc-600 text-sm mt-2">Create your first LLM Judge to evaluate your agents.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Gavel size={20} className="text-primary" />
                                {editingJudge ? "Edit Judge" : "Appoint New Judge"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={saveJudge} className="space-y-4 flex-1 flex flex-col min-h-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Judge Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black border border-zinc-800 p-2 text-sm focus:border-primary outline-none text-zinc-200"
                                        placeholder="e.g. The Strict Critic"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full bg-black border border-zinc-800 p-2 text-sm focus:border-primary outline-none text-zinc-200"
                                    >
                                        <option value="LLM">LLM (AI Model)</option>
                                        <option value="HEURISTIC">Heuristic (Regex)</option>
                                        <option value="HUMAN">Human Review</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                                    {formData.type === 'LLM' ? "System Prompt / Grading Rubric" : "Configuration JSON"}
                                </label>
                                <textarea
                                    required
                                    value={formData.config}
                                    onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                                    className="flex-1 bg-black border border-zinc-800 p-4 text-xs font-mono focus:border-primary outline-none resize-none text-zinc-300 leading-relaxed"
                                    placeholder={formData.type === 'LLM' ? "You are a judge..." : "{ \"pattern\": \"...\" }"}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2 bg-primary text-black text-xs font-bold hover:bg-primary/90"
                                >
                                    <Save size={14} /> SAVE_JUDGE
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
