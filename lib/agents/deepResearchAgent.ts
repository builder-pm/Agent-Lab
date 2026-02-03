
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { AgentConfig, AgentInterface, AgentEvent } from './types';
import {
    sanitizeInput, truncateToLimit, formatChatHistory, extractReasoning,
    withRetry, persistStep, pickModel
} from './base';
import { LinearAgent } from './linearAgent'; // Use existing helper methods or class if needed

// Reuse Jina logic (should be imported from tools but defining here for now)
const JINA_API_KEY = process.env.JINA_API_KEY;
async function jinaSearch(query: string, maxResults: number = 5): Promise<{ title: string; url: string; description: string; }[]> {
    if (!JINA_API_KEY) return [];
    try {
        const res = await fetch(`https://s.jina.ai/?${new URLSearchParams({ q: query })}`, {
            headers: { 'Authorization': `Bearer ${JINA_API_KEY}`, 'Accept': 'application/json', 'X-Respond-With': 'no-content' },
        });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        return (data.data || []).slice(0, maxResults).map((r: any) => ({
            title: r.title || 'No title', url: r.url || '', description: r.description || r.content || '',
        }));
    } catch (e) { return []; }
}
async function jinaScrape(url: string): Promise<any> {
    if (!JINA_API_KEY) return { markdown: '' };
    try {
        const res = await fetch(`https://r.jina.ai/${url}`, { headers: { 'Authorization': `Bearer ${JINA_API_KEY}` } });
        const data = await res.json();
        return { title: data.data?.title || '', markdown: data.data?.content || '' };
    } catch (e) { return { markdown: '' }; }
}

const openrouter = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY });
let counter = 0;
function sid(suffix: string) { return `deep-${Date.now()}-${++counter}-${suffix}`; }

export class DeepResearchAgent implements AgentInterface {
    constructor(private config: AgentConfig) { }

    async *stream(params: { prompt: string; chatHistory: any[] }): AsyncGenerator<AgentEvent, void, unknown> {
        const { isLabsEnabled } = this.config;
        const scenarioId = this.config.scenarioId || '';
        const reqContext = { userPrompt: params.prompt, executionMode: 'deep', modelName: '' };

        // 1. PLANNER (MAP PHASE)
        const pId = sid('planner');
        const pModel = pickModel('planner', this.config);
        reqContext.modelName = pModel;
        yield { type: 'step_start', stepId: pId, input: params.prompt, agent: 'deep-planner', meta: { modelInfo: { name: pModel } } };

        const systemPrompt = `You are a Lead Research Strategist.
Goal: Break down the user's complex query into 3-5 distinct, non-overlapping research sub-queries.
Return JSON ONLY:
{
  "subQueries": [
    { "query": "string", "rationale": "string", "source": "web" | "academic" }
  ],
  "complexity": "high",
  "standaloneInput": "rewritten user prompt"
}

IMPORTANT: If the user request is simple (e.g. basic math "2+2", greetings, or general knowledge) and does NOT require external research, return "subQueries": [].`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Query: ${sanitizeInput(params.prompt)}\nHistory: ${formatChatHistory(params.chatHistory)}` }
        ];

        const t0 = Date.now();
        const { text: planJson, usage: pUsage } = await withRetry(() => generateText({ model: openrouter.chat(pModel), messages: messages as any }));
        const ms = Date.now() - t0;
        let plan: any;
        try {
            const cleanJson = planJson.replace(/```json|```/g, '').trim();
            plan = JSON.parse(cleanJson);
        } catch (e) {
            plan = { subQueries: [{ query: params.prompt, rationale: 'Fallback plan', source: 'web' }] };
        }

        yield { type: 'step_finish', stepId: pId, output: `Plan: ${plan.subQueries.length} streams`, agent: 'deep-planner', meta: { plan }, latencyMs: ms, usage: pUsage };
        await persistStep(scenarioId, { id: pId, agent: 'deep-planner', stepLabel: 'Map Strategy', stepType: 'output', content: planJson, latencyMs: ms, inputTokens: (pUsage as any)?.promptTokens, outputTokens: (pUsage as any)?.completionTokens }, reqContext);

        // 2. PARALLEL EXECUTION (WORKER PHASE)
        const parallelGroupId = crypto.randomUUID();
        const summaries: string[] = [];

        yield { type: 'step_start', stepId: sid('parallel-start'), input: 'Starting Parallel Execution', agent: 'orchestrator' };

        // We can't really yield from inside Promise.all easily if we want to stream updates PER branch.
        // Solution: Create an array of tasks and use a helper to yield events as they happen?
        // Actually, for the generator, we might need to serialize them or just run them and yield the results.
        // Better: Run them and push events to a local queue, then yield everything? 
        // Or just await each Promise.all result and then yield the summary. 
        // For accurate UI feedback, we want to know when each starts/ends.
        // Valid for V1: Just yield "Starting 3 branches", do the work, yield "Finished".
        // V2 (Better): Use a specialized iterator for parallel? 
        // Let's stick to V1 for simplicity in this turn, but emit START events for all first.

        const tasks = plan.subQueries.map(async (q: any, idx: number) => {
            const branchLabel = `Query ${idx + 1}: ${q.query.slice(0, 15)}...`;
            const rId = sid(`worker-${idx}`);
            // Note: We can't yield here. We must record logs/persist silently or append to a shared log array.
            // But we WANT the UI to show them.
            // Constraint: Generator is single-threaded synchronous yield.
            // Strategy: We can't stream parallel events in real-time easily without complex buffering.
            // COMPROMISE: We will execute them fully, then yield a "Bulk Update" event or yield them sequentially in the stream (which defeats the UI purpose of real-time parallel updates, but the backend work IS parallel).
            // Actually, `yield` pauses execution. `Promise.all` doesn't pause. 
            // Correct pattern:

            const rModel = pickModel('researcher', this.config);
            // 1. Search
            let results: any[] = [];
            let scraped = '';
            if (q.source === 'web') {
                results = await jinaSearch(q.query);
                // Persist Search Call
                await persistStep(scenarioId, {
                    id: sid(`search-${idx}`), agent: 'worker', stepLabel: `Search: ${q.query}`, stepType: 'tool_call',
                    content: JSON.stringify(results), isParallel: true, parallelGroup: parallelGroupId, parallelLabel: branchLabel
                }, reqContext);
            }

            // 2. Summarize (LLM)
            const summaryPrompt = `You are a researcher. Query: "${q.query}". Rationale: "${q.rationale}".
            Analyze these search results:
            ${JSON.stringify(results.slice(0, 3))}
            
            Write a concise (max 200 words) summary of the FINDINGS. 
            Focus on facts. Cite urls like [Title](URL).`;

            const wT0 = Date.now();
            const { text: summary, usage: wUsage } = await withRetry(() => generateText({ model: openrouter.chat(rModel), messages: [{ role: 'user', content: summaryPrompt }] }));
            const wMs = Date.now() - wT0;

            // Persist Summary
            await persistStep(scenarioId, {
                id: rId, agent: 'worker', stepLabel: `Summary: ${q.rationale}`, stepType: 'output',
                content: summary, isParallel: true, parallelGroup: parallelGroupId, parallelLabel: branchLabel,
                latencyMs: wMs, inputTokens: (wUsage as any)?.promptTokens, outputTokens: (wUsage as any)?.completionTokens
            }, reqContext);

            return { query: q.query, summary, latencyMs: wMs };
        });

        // Execute Parallel
        const branchResults = await Promise.all(tasks);

        // Notify UI of "Stack" (We send one event representing the group? No, the UI expects individual events if we want tabs)
        // Since we can't stream them in real-time easily, we will emit them NOW as a "Replay" of what happened.
        // This is acceptable. The computation was parallel, the reporting is sequential-burst.

        for (const [idx, res] of branchResults.entries()) {
            summaries.push(`### Source ${idx + 1}: ${res.query}\n${res.summary}`);
            // Emit a UI event so the "Stack" appears
            yield {
                type: 'step_finish',
                stepId: sid(`worker-finish-${idx}`),
                output: res.summary,
                agent: 'worker',
                isParallel: true,
                parallelGroup: parallelGroupId, // This triggers the stack log
                label: `Query ${idx + 1}`
            };
        }

        yield { type: 'step_finish', stepId: sid('parallel-end'), output: 'Parallel Search Complete', agent: 'orchestrator' };

        // 3. AGGREGATOR (REDUCE PHASE)
        const sId = sid('aggregator');
        const sModel = pickModel('synthesizer', this.config);
        reqContext.modelName = sModel;

        yield { type: 'step_start', stepId: sId, input: 'Aggregating Research...', agent: 'aggregator' };

        const aggPrompt = `You are a Deep Research Analyst.
User Goal: "${params.prompt}"

Here are reports from multiple field researchers:

${summaries.join('\n\n')}

Synthesize these into a comprehensive answer.
- Resolve conflicts.
- Use [1], [2] citations.
- If "Labs" is enabled, include Python code for charts if data permits.
${isLabsEnabled ? '**LABS ENABLED**: You may generate python plotting code.' : ''}
`;

        if (summaries.length === 0) {
            // Direct Answer Mode
            yield { type: 'step_finish', stepId: sid('parallel-skip'), output: 'Task identified as simple. Skipping research.', agent: 'orchestrator' };
            const aggPromptSimple = `You are a helpful assistant.
User Goal: "${params.prompt}"

This task was identified as simple and did not require external research.
Please answer the user's question directly and concisely.`;

            reqContext.modelName = sModel;
            const sT0 = Date.now();
            const { text: finalAns, usage: sUsage } = await withRetry(() => generateText({ model: openrouter.chat(sModel), messages: [{ role: 'user', content: aggPromptSimple }] }));
            const sMs = Date.now() - sT0;
            yield { type: 'step_finish', stepId: sId, output: finalAns, agent: 'aggregator', usage: sUsage, latencyMs: sMs };
            await persistStep(scenarioId, {
                id: sId, agent: 'aggregator', stepLabel: 'Direct Answer', stepType: 'output',
                content: finalAns, latencyMs: sMs, inputTokens: (sUsage as any)?.promptTokens, outputTokens: (sUsage as any)?.completionTokens
            }, reqContext);
            return;
        }

        const sT0 = Date.now();
        const { text: finalAns, usage: sUsage } = await withRetry(() => generateText({ model: openrouter.chat(sModel), messages: [{ role: 'user', content: aggPrompt }] }));
        const sMs = Date.now() - sT0;
        const { reasoning, cleanText } = extractReasoning(finalAns);

        yield { type: 'step_finish', stepId: sId, output: cleanText, agent: 'aggregator', usage: sUsage, meta: { reasoning }, latencyMs: sMs };
        // yield { type: 'finish', content: cleanText };
        await persistStep(scenarioId, {
            id: sId, agent: 'aggregator', stepLabel: 'Final Report', stepType: 'output',
            content: finalAns, latencyMs: sMs, inputTokens: (sUsage as any)?.promptTokens, outputTokens: (sUsage as any)?.completionTokens
        }, reqContext);
    }
}
