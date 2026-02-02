"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Play, RotateCcw, Loader2, Expand, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PyodideExecutorProps {
    code: string;
    autoRun?: boolean;
}

declare global {
    interface Window {
        loadPyodide: any;
        pyodide: any;
        pyodideInitPromise: Promise<any>;
    }
}

export const PyodideExecutor = ({ code, autoRun = true }: PyodideExecutorProps) => {
    const [status, setStatus] = useState<'loading' | 'ready' | 'running' | 'completed' | 'error'>('loading');
    const [output, setOutput] = useState<string[]>([]);
    const [plotImage, setPlotImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const hasRun = useRef(false);

    const handleDownload = () => {
        if (!plotImage) return;
        const link = document.createElement('a');
        link.href = plotImage;
        link.download = `chart-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        const initPyodide = async () => {
            try {
                // Singleton Promise Pattern
                if (!window.pyodideInitPromise) {
                    window.pyodideInitPromise = (async () => {
                        // 1. Load Script if needed
                        if (!window.loadPyodide) {
                            await new Promise<void>((resolve, reject) => {
                                const script = document.createElement('script');
                                script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"; // Fallback/Default to CDN for reliability
                                script.onload = () => resolve();
                                script.onerror = () => reject(new Error("Failed to load pyodide script"));
                                document.body.appendChild(script);
                            });
                        }

                        // 2. Load Environment
                        // @ts-ignore
                        const pyodide = await window.loadPyodide({
                            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
                        });

                        // 3. Load Packages
                        await pyodide.loadPackage(['matplotlib', 'numpy', 'pandas', 'micropip']);

                        // 4. Set Global
                        window.pyodide = pyodide;
                        return pyodide;
                    })();
                }

                await window.pyodideInitPromise;
                setStatus('ready');
            } catch (e: any) {
                console.error("Pyodide Init Error:", e);
                setStatus('error');
                setError(e.message);
            }
        };

        if (status === 'loading') {
            initPyodide();
        }
    }, [status]);

    // Helper: Dedent code (remove consistent leading whitespace)
    const dedent = (str: string): string => {
        const lines = str.split('\n');
        // Find minimum leading whitespace (ignoring empty lines)
        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim().length === 0) continue;
            const match = line.match(/^(\s*)/);
            if (match) {
                minIndent = Math.min(minIndent, match[1].length);
            }
        }
        if (minIndent === Infinity) minIndent = 0;
        return lines.map(line => line.slice(minIndent)).join('\n');
    };

    // Helper: Extract import names from Python code
    const extractImports = (pythonCode: string): string[] => {
        const imports: Set<string> = new Set();
        // Match 'import X' and 'from X import ...'
        const importRegex = /^(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
        let match;
        while ((match = importRegex.exec(pythonCode)) !== null) {
            imports.add(match[1]);
        }
        return Array.from(imports);
    };

    const runCode = async () => {
        if (!window.pyodide) return;
        setStatus('running');
        setOutput([])
        setPlotImage(null);
        setError(null);

        try {
            // Setup stdout capture
            window.pyodide.setStdout({ batched: (msg: string) => setOutput(prev => [...prev, msg]) });

            // Dedent the user code first
            const cleanCode = dedent(code);

            // Extract imports and try to install missing packages dynamically
            const requiredPackages = extractImports(cleanCode);
            const preloadedPackages = ['matplotlib', 'numpy', 'pandas', 'micropip'];
            const missingPackages = requiredPackages.filter(pkg => !preloadedPackages.includes(pkg));

            if (missingPackages.length > 0) {
                setOutput(prev => [...prev, `[Pyodide] Installing: ${missingPackages.join(', ')}...`]);
                const micropip = window.pyodide.pyimport("micropip");
                for (const pkg of missingPackages) {
                    try {
                        await micropip.install(pkg);
                    } catch (installErr: any) {
                        // Some packages may not exist in Pyodide, log and continue
                        setOutput(prev => [...prev, `[Pyodide] Warning: Could not install '${pkg}': ${installErr.message}`]);
                    }
                }
            }

            // Setup Matplotlib backend
            await window.pyodide.runPythonAsync(`
                import matplotlib
                matplotlib.use("Agg")
                import matplotlib.pyplot as plt
                import base64
                from io import BytesIO

                def setup_plot():
                    plt.figure(figsize=(6, 4))
                
                # Patch show() to be a no-op so we can capture the figure ourselves
                plt.show = lambda: None

                def get_plot_base64():
                    buf = BytesIO()
                    plt.savefig(buf, format='png', bbox_inches='tight')
                    buf.seek(0)
                    return base64.b64encode(buf.read()).decode('utf-8')
            `);

            // Execute User Code (now properly dedented)
            await window.pyodide.runPythonAsync(cleanCode);

            // Check if plot exists and get it
            const hasFig = await window.pyodide.runPythonAsync("len(plt.get_fignums()) > 0");
            if (hasFig) {
                const imgStr = await window.pyodide.runPythonAsync("get_plot_base64()");
                setPlotImage(`data:image/png;base64,${imgStr}`);
                await window.pyodide.runPythonAsync("plt.clf()");
            }

            setStatus('completed');
        } catch (e: any) {
            setStatus('error');
            setError(e.message);
        }
    };

    useEffect(() => {
        if (status === 'ready' && autoRun && !hasRun.current) {
            hasRun.current = true;
            runCode();
        }
    }, [status, autoRun]);

    return (
        <div className="w-full bg-[#1e1e1e] border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs my-2">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Terminal size={12} />
                    <span>Python Runtime</span>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'running' ? (
                        <span className="flex items-center gap-1 text-yellow-500">
                            <Loader2 size={10} className="animate-spin" />
                            Running...
                        </span>
                    ) : (
                        <button
                            onClick={runCode}
                            disabled={status === 'loading'}
                            className="text-primary hover:text-white disabled:opacity-50 flex items-center gap-1"
                        >
                            <Play size={10} /> Run
                        </button>
                    )}
                </div>
            </div>

            {/* Code View (Collapsed or limited?) - Let's show it */}
            <div className="p-3 bg-[#1e1e1e] text-zinc-300 border-b border-zinc-800 overflow-x-auto whitespace-pre-wrap max-h-32 scrollbar-thin scrollbar-thumb-zinc-700">
                {code}
            </div>

            {/* Output Area */}
            {(output.length > 0 || plotImage || error) && (
                <div className="p-3 bg-black space-y-2">
                    {output.length > 0 && (
                        <div className="text-zinc-400">
                            {output.map((line, i) => <div key={i}>{line}</div>)}
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 whitespace-pre-wrap border-l-2 border-red-500 pl-2">
                            {error}
                        </div>
                    )}

                    {plotImage && (
                        <div className="mt-2 relative group">
                            {/* Chart Container */}
                            <div className="bg-white rounded-md p-2 w-fit mx-auto relative">
                                <img src={plotImage} alt="Generated Plot" className="max-w-full h-auto" />

                                {/* Action Toolbar */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setIsExpanded(true)}
                                        className="p-1.5 bg-zinc-900/80 backdrop-blur-sm text-white rounded hover:bg-zinc-800 transition-colors"
                                        title="Expand"
                                    >
                                        <Expand size={14} />
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="p-1.5 bg-zinc-900/80 backdrop-blur-sm text-white rounded hover:bg-zinc-800 transition-colors"
                                        title="Download"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Fullscreen Modal */}
                            {isExpanded && (
                                <div
                                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8"
                                    onClick={() => setIsExpanded(false)}
                                >
                                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                                        <img
                                            src={plotImage}
                                            alt="Generated Plot (Expanded)"
                                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white p-4"
                                        />

                                        {/* Modal Actions */}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <button
                                                onClick={handleDownload}
                                                className="p-2 bg-[#CAFF58] text-black rounded-lg hover:bg-[#b8e650] transition-colors flex items-center gap-1.5 text-sm font-medium"
                                            >
                                                <Download size={16} />
                                                Download
                                            </button>
                                            <button
                                                onClick={() => setIsExpanded(false)}
                                                className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                                                title="Close"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {status === 'loading' && (
                <div className="p-2 text-zinc-500 text-[10px] text-center italic">
                    Initializing Pyodide Environment (Downloading modules)...
                </div>
            )}
        </div>
    );
};
