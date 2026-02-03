import React, { useState } from 'react';
import { ChevronDown, ExternalLink, Link as LinkIcon, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentStep } from '../_store/useAgentStore';

interface SourcesAccordionProps {
    steps: AgentStep[];
}

export const SourcesAccordion = ({ steps }: SourcesAccordionProps) => {
    const [isOpen, setIsOpen] = useState(false);

    // Extract all tool_result contents from 'worker' or 'researcher' steps that used 'jina_search'
    const sources: { title: string; url: string; description: string }[] = [];
    const seenUrls = new Set<string>();

    steps.forEach(step => {
        // Deep Research (worker) or Linear (researcher) tool outputs
        if (
            (step.agent === 'worker' || step.agent === 'researcher') &&
            step.type === 'action' && step.label.includes('jina_search') || ((step.type as string) === 'tool_call' && step.content.includes('jina_search'))
        ) {
            // Usually the NEXT step is the result
            // But here we might look for 'tool_result' or 'output' steps if they contain JSON lists
            // Actually, in our current architecture:
            // Linear: tool_result step has content = JSON string
            // Deep: We persisted 'tool_call' with content = JSON string of results (see deepResearchAgent.ts)
        }
    });

    // Strategy 2: Scan ALL steps for content that looks like Jina search results JSON
    steps.forEach(step => {
        try {
            if (!step.content || step.type === 'input') return;
            // quick check for json-like
            if (step.content.trim().startsWith('[') && step.content.includes('"url":')) {
                const data = JSON.parse(step.content);
                if (Array.isArray(data)) {
                    data.forEach((item: any) => {
                        if (item.url && item.title && !seenUrls.has(item.url)) {
                            seenUrls.add(item.url);
                            sources.push({
                                title: item.title,
                                url: item.url,
                                description: item.description || ''
                            });
                        }
                    });
                }
            }
        } catch (e) {
            // ignore parse errors
        }
    });

    if (sources.length === 0) return null;

    return (
        <div className="mt-4 border-t border-zinc-800 pt-2 w-full max-w-3xl">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors w-full p-2 rounded hover:bg-zinc-900/50"
            >
                <Globe size={14} />
                <span className="uppercase font-bold tracking-wider">External Sources</span>
                <span className="bg-zinc-800 text-zinc-400 px-1.5 rounded-[4px] text-[9px]">{sources.length}</span>
                <ChevronDown size={14} className={cn("ml-auto transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    {sources.map((source, i) => (
                        <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col gap-1 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
                        >
                            <div className="flex items-start gap-2">
                                <LinkIcon size={12} className="text-zinc-500 mt-1 shrink-0 group-hover:text-blue-400" />
                                <span className="text-xs font-medium text-zinc-300 line-clamp-1 group-hover:text-blue-300 transition-colors">
                                    {source.title}
                                </span>
                                <ExternalLink size={10} className="ml-auto text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {source.description && (
                                <span className="text-[10px] text-zinc-500 line-clamp-2 pl-5">
                                    {source.description}
                                </span>
                            )}
                            <span className="text-[9px] text-zinc-600 pl-5 truncate font-mono">
                                {new URL(source.url).hostname}
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};
