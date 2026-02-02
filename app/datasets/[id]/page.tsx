"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, FileText, Trash2, Upload, Loader2, CheckCircle, Split, Settings, X } from "lucide-react";
import { useAgentStore } from "@/app/_store/useAgentStore";
import { cn } from "@/lib/utils";

interface TestCase {
    id: string;
    prompt: string;
    expectedOutput: string | null;
    assertions: string | null;
    createdAt: string;
    scenarios?: {
        id: string;
        steps: {
            content: string;
            stepType: string;
        }[];
        evaluations: {
            score: number;
            reasoning: string | null;
            judgeId: string;
        }[];
    }[];
}

interface DatasetDetail {
    id: string;
    name: string;
    description: string;
    cases: TestCase[];
    runs: any[];
}

export default function DatasetDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { agentConfigs, executionMode, modelTiering } = useAgentStore();
    const [dataset, setDataset] = useState<DatasetDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [currentRunId, setCurrentRunId] = useState<string | null>(null);
    const [runProgress, setRunProgress] = useState(0);
    const [importData, setImportData] = useState(""); 
    const [viewingConfig, setViewingConfig] = useState<string | null>(null); 
    
    // Modal State
    const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
    const [editingCase, setEditingCase] = useState<TestCase | null>(null);
    const [caseForm, setCaseForm] = useState({ prompt: "", expectedOutput: "", assertions: "" });

    useEffect(() => {
        if (id) fetchDataset();
    }, [id]);

    // Polling Effect for Progress
    useEffect(() => {
        if (!isRunning || !currentRunId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/runs/${currentRunId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRunProgress(data.progress);
                    if (data.status === 'completed' || data.status === 'failed') {
                        setIsRunning(false);
                        setCurrentRunId(null);
                        fetchDataset(); // Refresh to see results
                        if (data.status === 'completed') alert("Batch Run Completed! ✅");
                    }
                }
            } catch (error) {
                console.error("Polling error", error);
            }
        }, 1000); // Poll every second

        return () => clearInterval(interval);
    }, [isRunning, currentRunId]);

    const fetchDataset = async () => {
        try {
            const res = await fetch(`/api/datasets/${id}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setDataset(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRunBatch = async () => {
        if (!dataset || dataset.cases.length === 0) return;
        setIsRunning(true);
        setRunProgress(0);
        
        try {
            const res = await fetch(`/api/datasets/${id}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentConfigs,
                    executionMode,
                    modelTiering
                }),
            });
            
            if (res.ok) {
                const data = await res.json();
                setCurrentRunId(data.runId); // Start polling
                // Don't alert here, let the progress bar show it.
            } else {
                alert("Failed to start run");
                setIsRunning(false);
            }
        } catch (e) {
            console.error(e);
            alert("Error starting run");
            setIsRunning(false);
        }
    };

    const handleImport = async () => {
        try {
            let cases = [];
            try {
                cases = JSON.parse(importData);
                if (!Array.isArray(cases)) throw new Error("Must be an array");
            } catch (e) {
                alert("Invalid JSON format. Expected an array of objects: [{ \"prompt\": \"...\", \"expectedOutput\": \"...\" }]");
                return;
            }

            const res = await fetch(`/api/datasets/${id}/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cases }),
            });

            if (res.ok) {
                setImportData("");
                setIsImporting(false);
                fetchDataset();
            }
        } catch (err) {
            console.error(err);
            alert("Import failed");
        }
    };

    // Case Management
    const openCaseModal = (testCase?: TestCase) => {
        if (testCase) {
            setEditingCase(testCase);
            setCaseForm({ 
                prompt: testCase.prompt, 
                expectedOutput: testCase.expectedOutput || "", 
                assertions: testCase.assertions || "" 
            });
        } else {
            setEditingCase(null);
            setCaseForm({ prompt: "", expectedOutput: "", assertions: "" });
        }
        setIsCaseModalOpen(true);
    };

    const saveCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCase) {
                // Update
                await fetch(`/api/testcases/${editingCase.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(caseForm),
                });
            } else {
                // Create
                await fetch(`/api/datasets/${id}/cases`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(caseForm),
                });
            }
            setIsCaseModalOpen(false);
            fetchDataset();
        } catch (err) {
            console.error(err);
            alert("Failed to save case");
        }
    };

    const deleteCase = async (caseId: string) => {
        if (!confirm("Delete this test case?")) return;
        try {
            await fetch(`/api/testcases/${caseId}`, { method: "DELETE" });
            fetchDataset();
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) return <div className="p-10 text-center font-mono animate-pulse">LOADING_DATASET...</div>;
    if (!dataset) return <div className="p-10 text-center font-mono text-rose-500">DATASET_NOT_FOUND</div>;

    return (
        <div className="h-full w-full flex flex-col font-sans text-foreground bg-background overflow-hidden selection:bg-accent selection:text-black">
            {/* Header */}
            <header className="h-14 border-b-4 border-border bg-card flex items-center px-4 justify-between z-30 relative shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg font-space-grotesk tracking-tight flex items-baseline gap-2 text-primary uppercase">
                            {dataset.name}
                        </h1>
                        <span className="text-[10px] text-zinc-500 font-mono leading-none">{dataset.id}</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    {isRunning ? (
                         <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded min-w-[140px]">
                            <Loader2 size={12} className="animate-spin text-emerald-400" />
                            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden w-20">
                                <div 
                                    className="h-full bg-emerald-400 transition-all duration-300 ease-out" 
                                    style={{ width: `${runProgress}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400">{runProgress}%</span>
                         </div>
                    ) : (
                        <button 
                            onClick={handleRunBatch}
                            disabled={dataset.cases.length === 0}
                            className="flex items-center gap-2 text-xs font-bold font-mono bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 border border-zinc-700 transition-colors text-zinc-300 disabled:opacity-50"
                        >
                            <Play size={12} className="text-emerald-400" />
                            RUN_BATCH
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-auto p-8 font-space-mono">
                <div className="max-w-4xl mx-auto">
                    
                    {/* Toolbar */}
                    <div className="flex justify-between items-end mb-6">
                        <div className="text-sm text-zinc-500 max-w-lg">
                            {dataset.description || "No description provided."}
                            {/* Show recent runs if any */}
                            {dataset.runs && dataset.runs.length > 0 && (
                                <div className="mt-2 text-xs text-emerald-500 flex items-center gap-1">
                                    <CheckCircle size={10} /> 
                                    Last Run: {new Date(dataset.runs[0].createdAt).toLocaleString()} 
                                    ({dataset.runs[0].status})
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => openCaseModal()}
                                className="flex items-center gap-2 text-xs font-bold bg-primary text-black border border-primary px-4 py-2 hover:bg-primary/90 transition-colors"
                            >
                                + NEW_CASE
                            </button>
                            <button
                                onClick={() => setIsImporting(!isImporting)}
                                className="flex items-center gap-2 text-xs font-bold bg-zinc-900 text-zinc-400 border border-zinc-700 px-4 py-2 hover:bg-zinc-800 transition-colors"
                            >
                                <Upload size={14} /> IMPORT_JSON
                            </button>
                        </div>
                    </div>

                    {/* Import Area */}
                    {isImporting && (
                        <div className="mb-8 bg-zinc-900 border border-zinc-700 p-4 rounded-lg animate-in fade-in slide-in-from-top-4">
                            <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Paste JSON Array</label>
                            <textarea
                                value={importData}
                                onChange={(e) => setImportData(e.target.value)}
                                className="w-full h-40 bg-black border border-zinc-800 p-3 text-xs font-mono text-zinc-300 focus:border-primary outline-none resize-none mb-3"
                                placeholder={`[\n  { \"prompt\": \"What is 2+2?\", \"expectedOutput\": \"4\" },\n  { \"prompt\": \"Capital of France?\", \"expectedOutput\": \"Paris\" }\n]`}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsImporting(false)}
                                    className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={!importData}
                                    className="px-4 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 disabled:opacity-50"
                                >
                                    CONFIRM_IMPORT
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Case Modal */}
                    {isCaseModalOpen && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                                <h3 className="text-lg font-bold text-white mb-4 uppercase flex items-center gap-2">
                                    <FileText size={18} className="text-primary" />
                                    {editingCase ? "Edit Test Case" : "New Test Case"}
                                </h3>
                                <form onSubmit={saveCase} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Input Prompt</label>
                                        <textarea
                                            required
                                            value={caseForm.prompt}
                                            onChange={(e) => setCaseForm({ ...caseForm, prompt: e.target.value })}
                                            className="w-full h-24 bg-black border border-zinc-800 p-3 text-sm focus:border-primary outline-none resize-none text-zinc-200"
                                            placeholder="What does the user say?"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Expected Output (Optional)</label>
                                        <textarea
                                            value={caseForm.expectedOutput}
                                            onChange={(e) => setCaseForm({ ...caseForm, expectedOutput: e.target.value })}
                                            className="w-full h-20 bg-black border border-zinc-800 p-3 text-sm focus:border-primary outline-none resize-none text-zinc-200"
                                            placeholder="The 'Golden Answer'..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Assertions (JSON Array)</label>
                                        <input
                                            type="text"
                                            value={caseForm.assertions}
                                            onChange={(e) => setCaseForm({ ...caseForm, assertions: e.target.value })}
                                            className="w-full bg-black border border-zinc-800 p-2 text-sm focus:border-primary outline-none text-zinc-200 font-mono"
                                            placeholder='e.g. ["contains:error", "latency<2000"]'
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCaseModalOpen(false)}
                                            className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white"
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-primary text-black text-xs font-bold hover:bg-primary/90"
                                        >
                                            SAVE_CASE
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Case List */}
                    {dataset.cases.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-xl">
                            <FileText size={48} className="mx-auto text-zinc-700 mb-4" />
                            <h3 className="text-zinc-400 font-bold text-lg">No Test Cases</h3>
                            <p className="text-zinc-600 text-sm mt-2">Create a new case or import a JSON list to start.</p>
                            <button
                                onClick={() => openCaseModal()}
                                className="mt-6 px-6 py-2 bg-primary text-black font-bold text-sm hover:opacity-90"
                            >
                                + CREATE_FIRST_CASE
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase px-4">
                                <span>Prompt</span>
                                <span>Expected Output / Assertions</span>
                            </div>
                            {dataset.cases.map((c, i) => {
                                const scenario = c.scenarios?.[0];
                                const latestEval = scenario?.evaluations?.[0];
                                const score = latestEval?.score;
                                const isPass = score !== undefined && score >= 0.7;
                                
                                // Get final output from scenario steps
                                const actualOutput = scenario?.steps?.reverse().find(s => s.stepType === 'output' || s.content)?.content;

                                return (
                                <div key={c.id} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded flex gap-4 group hover:border-zinc-700 transition-colors relative">
                                    <div className="text-zinc-500 font-bold text-xs pt-1 w-8">#{i + 1}</div>
                                    <div className="flex-1 cursor-pointer" onClick={() => openCaseModal(c)}>
                                        <div className="flex justify-between items-start">
                                            <div className="text-zinc-200 text-sm font-bold mb-2">{c.prompt}</div>
                                            {latestEval && (
                                                <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border ml-2 shrink-0", isPass ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                                                    {isPass ? "PASS" : "FAIL"} ({score?.toFixed(2)})
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                            {/* Left: Expected */}
                                            <div className="space-y-2">
                                                {(c.expectedOutput || c.assertions) && (
                                                    <div className="text-[10px] bg-black/50 p-3 border-l-2 border-primary/50 text-zinc-400 font-mono h-full">
                                                        <div className="text-[9px] font-bold text-zinc-600 mb-1 uppercase tracking-widest">Expected Configuration</div>
                                                        {c.expectedOutput && (
                                                            <div className="mb-2"><span className="text-emerald-500">EXPECT:</span> {c.expectedOutput}</div>
                                                        )}
                                                        {c.assertions && (
                                                            <div><span className="text-amber-500">ASSERT:</span> {c.assertions}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Actual Output from Run */}
                                            <div className="space-y-2">
                                                {actualOutput ? (
                                                    <div className="text-[10px] bg-zinc-950 p-3 border-l-2 border-zinc-700 text-zinc-300 font-mono h-full">
                                                        <div className="text-[9px] font-bold text-zinc-600 mb-1 uppercase tracking-widest">Actual Run Output</div>
                                                        <div className="line-clamp-4 group-hover:line-clamp-none transition-all">{actualOutput}</div>
                                                        
                                                        {latestEval?.reasoning && (
                                                            <div className="mt-3 pt-3 border-t border-zinc-800 text-zinc-500 italic">
                                                                <span className="text-primary/50 not-italic font-bold">JUDGE:</span> {latestEval.reasoning}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : scenario ? (
                                                    <div className="text-[10px] bg-zinc-950 p-3 border-l-2 border-zinc-800 text-zinc-600 font-mono h-full italic flex items-center">
                                                        Run in progress or no output captured...
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                                        {scenario && (
                                            <Link
                                                href={`/compare?base=${scenario.id}&candidate=${scenario.id}`}
                                                className="text-zinc-600 hover:text-primary p-1"
                                                title="View Full Trace"
                                            >
                                                <FileText size={14} />
                                            </Link>
                                        )}
                                        {c.scenarios && c.scenarios.length >= 2 && (
                                            <Link
                                                href={`/compare?base=${c.scenarios[1].id}&candidate=${c.scenarios[0].id}`}
                                                className="text-zinc-600 hover:text-primary p-1"
                                                title="Compare vs Previous Run"
                                            >
                                                <Split size={14} />
                                            </Link>
                                        )}
                                        <button 
                                            onClick={() => deleteCase(c.id)}
                                            className="text-zinc-600 hover:text-rose-500 p-1"
                                            title="Delete Case"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Run History Section */}
                    {dataset.runs && dataset.runs.length > 0 && (
                        <div className="mt-12 border-t border-zinc-800 pt-8">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FileText className="text-zinc-500" size={16} /> Run History
                            </h2>
                            <div className="space-y-2">
                                {dataset.runs.map((run: any, i: number) => (
                                    <div key={run.id} className="flex items-center justify-between bg-zinc-900/30 p-3 rounded border border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            <div className="text-xs font-mono text-zinc-500">{run.id.slice(-6)}</div>
                                            <div className="text-sm font-bold text-zinc-300">
                                                {new Date(run.createdAt).toLocaleString()}
                                            </div>
                                            <div className={cn("text-[10px] uppercase px-1.5 rounded font-bold", 
                                                run.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                                            )}>
                                                {run.status}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {run.configSnapshot && (
                                                <button
                                                    onClick={() => setViewingConfig(run.configSnapshot)}
                                                    className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                                                    title="View Run Configuration"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Config Viewer Modal */}
                    {viewingConfig && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl flex flex-col max-h-[80vh] shadow-2xl">
                                <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Settings size={16} className="text-primary" /> Run Configuration Snapshot
                                    </h3>
                                    <button onClick={() => setViewingConfig(null)} className="text-zinc-500 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-0">
                                    <pre className="text-xs font-mono text-zinc-400 p-4 leading-relaxed whitespace-pre-wrap">
                                        {JSON.stringify(JSON.parse(viewingConfig), null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}