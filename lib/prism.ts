import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import prisma from './db';
import { supabase } from './supabase';

// Message type for role-based prompts
type Message = { role: 'system' | 'user' | 'assistant'; content: string };

// Event types for the agent (unchanged — UI depends on these)
export type PrismEvent =
    | { type: 'step_start'; stepId: string; input: string; agent?: string; consumedPrompt?: string; isParallel?: boolean; parallelGroup?: string; isFastRoute?: boolean }
    | { type: 'tool_call'; tool: string; args: any; stepId: string }
    | { type: 'tool_result'; tool: string; result: any; stepId: string }
    | { type: 'step_finish'; stepId: string; output: string; usage?: any; latencyMs?: number }
    | { type: 'finish'; content: string }
    | { type: 'approval_requested'; agent: string; stepId: string };

// OpenRouter configuration
const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

const FAST_MODEL = 'nvidia/nemotron-nano-9b-v2:free';
const JINA_API_KEY = process.env.JINA_API_KEY;

// ---------------------------------------------------------------------------
// Context Management (FIX #1: Prevent unbounded context growth)
// ---------------------------------------------------------------------------

const MAX_CONTEXT_CHARS = 8000; // ~2000 tokens

interface AgentContext {
    userPrompt: string;
    chatHistory: string;
    plannerOutput: {
        searchQuery: string;
        focusAreas: string[];
        approach: string;
        expectedOutput: string;
        needsAnalysis: boolean;
    } | null;
    researcherOutput: string;
    analystOutput: string;
}

function truncateToLimit(text: string, limit: number): string {
    if (text.length <= limit) return text;
    return text.slice(0, limit - 100) + '\n\n[... truncated for context limit ...]';
}

function formatChatHistory(history: any[]): string {
    if (!history || history.length === 0) return '';

    const relevant = history.slice(-6); // Keep last 6 messages for context
    return relevant
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 500)}`)
        .join('\n');
}

// ---------------------------------------------------------------------------
// Prompt Injection Protection (FIX #11)
// ---------------------------------------------------------------------------

function sanitizeInput(input: string): string {
    // Wrap user input with clear delimiters
    return `<user_input>\n${input}\n</user_input>`;
}

// ---------------------------------------------------------------------------
// Retry Logic (FIX #7)
// ---------------------------------------------------------------------------

async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            console.error(`Attempt ${attempt}/${maxAttempts} failed:`, err.message);

            if (attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('All retry attempts failed');
}

// ---------------------------------------------------------------------------
// Jina AI APIs
// ---------------------------------------------------------------------------

async function jinaSearch(query: string, maxResults: number = 5): Promise<{
    title: string; url: string; description: string;
}[]> {
    if (!JINA_API_KEY) {
        return [{ title: 'Config Error', url: '', description: 'JINA_API_KEY missing in .env.local' }];
    }
    try {
        const res = await fetch(`https://s.jina.ai/?${new URLSearchParams({ q: query })}`, {
            headers: {
                'Authorization': `Bearer ${JINA_API_KEY}`,
                'Accept': 'application/json',
                'X-Respond-With': 'no-content',
            },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        return (data.data || []).slice(0, maxResults).map((r: any) => ({
            title: r.title || 'No title',
            url: r.url || '',
            description: r.description || r.content || '',
        }));
    } catch (err: any) {
        console.error('Jina search error:', err.message);
        return [{ title: 'Search Error', url: '', description: err.message }];
    }
}

async function jinaScrape(url: string): Promise<any> {
    if (!JINA_API_KEY) {
        return { success: false, error_message: 'JINA_API_KEY missing' };
    }
    try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                'Authorization': `Bearer ${JINA_API_KEY}`,
                'Accept': 'application/json',
            },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        return {
            title: data.data?.title || 'No Title',
            url,
            markdown: data.data?.content || '',
            media: data.data?.images || [],
            success: true,
            error_message: null,
        };
    } catch (err: any) {
        console.error('Jina scrape error:', err);
        return { success: false, url, error_message: err.message, markdown: '' };
    }
}

// ---------------------------------------------------------------------------
// Intent classification & plan parsing
// ---------------------------------------------------------------------------

const ANALYSIS_PATTERN = /compar|analyz|analys|chart|graph|plot|visualiz|pros?\s*(and|&|vs)\s*cons?|benchmark|evaluat|trend|statistic|rank|assess|review/i;
const URL_PATTERN = /https?:\/\/[^\s)>\]]+/;
const QUICK_PATTERN = /\b(quick(?:ly)?|fast|brief(?:ly)?|tl;?dr|short(?:ly)?|one.?liner|in a nutshell|just tell me|simple answer)\b/i;

function classifyIntent(prompt: string) {
    const urlMatch = prompt.match(URL_PATTERN);
    return {
        needsScrape: !!urlMatch,
        scrapeUrl: urlMatch ? urlMatch[0] : null,
        needsAnalysis: ANALYSIS_PATTERN.test(prompt),
        searchQuery: prompt.replace(URL_PATTERN, '').trim() || prompt,
    };
}

/** Parse structured fields from planner LLM output (FIX #5: Extract more fields) */
function parsePlanOutput(planText: string, fallbackPrompt: string) {
    const searchMatch = planText.match(/\*\*SEARCH_QUERY:\*\*\s*(.+)/i)
        || planText.match(/SEARCH_QUERY:\s*(.+)/i);
    const scrapeMatch = planText.match(/\*\*SCRAPE_URL:\*\*\s*(.+)/i)
        || planText.match(/SCRAPE_URL:\s*(.+)/i);
    const analysisMatch = planText.match(/\*\*NEEDS_ANALYSIS:\*\*\s*(yes|no)/i)
        || planText.match(/NEEDS_ANALYSIS:\s*(yes|no)/i);

    // NEW: Extract focus areas
    const focusAreasMatch = planText.match(/## Focus Areas\s*([\s\S]*?)(?=##|$)/i);
    const focusAreas = focusAreasMatch
        ? focusAreasMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim())
        : [];

    // NEW: Extract approach
    const approachMatch = planText.match(/## Approach\s*([\s\S]*?)(?=##|$)/i);
    const approach = approachMatch ? approachMatch[1].trim() : '';

    // NEW: Extract expected output
    const expectedMatch = planText.match(/## Expected Output\s*([\s\S]*?)(?=##|$)/i);
    const expectedOutput = expectedMatch ? expectedMatch[1].trim() : '';

    const scrapeUrl = scrapeMatch ? scrapeMatch[1].trim() : 'none';
    const urlInScrape = scrapeUrl.match(URL_PATTERN);

    return {
        searchQuery: searchMatch ? searchMatch[1].trim() : fallbackPrompt,
        needsScrape: !!urlInScrape,
        scrapeUrl: urlInScrape ? urlInScrape[0] : null,
        needsAnalysis: analysisMatch
            ? analysisMatch[1].toLowerCase() === 'yes'
            : ANALYSIS_PATTERN.test(fallbackPrompt),
        focusAreas,
        approach,
        expectedOutput,
    };
}

interface ExecutionPlan {
    searchQuery: string;
    needsScrape: boolean;
    scrapeUrl: string | null;
    needsAnalysis: boolean;
    planText: string;
    isQuick: boolean;
    focusAreas: string[];
    approach: string;
    expectedOutput: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let counter = 0;
function sid(suffix: string) { return `step-${Date.now()}-${++counter}-${suffix}`; }

// Request context type for per-request data (replaces global mutable state)
interface RequestContext {
    userPrompt: string;
    executionMode: string;
    modelName: string;
}

/** DB persistence — blocks to ensure data integrity */
function persist(scenarioId: string, data: Record<string, any>, ctx: RequestContext) {
    // SQLite persistence (existing)
    const dbPromise = prisma.agentStep.create({
        data: {
            scenarioId,
            agent: '',
            stepLabel: '',
            stepType: 'output',
            content: '',
            timestamp: BigInt(Date.now()),
            ...data,
        }
    }).catch((e: any) => console.error('SQLite persist error:', e));

    // Supabase persistence (new)
    const sbPromise = persistToSupabase({
        scenarioId,
        userPrompt: ctx.userPrompt,
        stepId: data.id || '',
        agent: data.agent || '',
        stepType: data.stepType || 'output',
        stepLabel: data.stepLabel || '',
        inputContent: data.promptConsumed || null,
        outputContent: data.content || '',
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        latencyMs: data.latencyMs || 0,
        cost: data.cost || 0,
        modelName: ctx.modelName,
        executionMode: ctx.executionMode,
        handoverFrom: data.handoverFrom || null,
        handoverReason: data.handoverReason || null,
    });

    return Promise.all([dbPromise, sbPromise]);
}

/** Persist to Supabase with full metadata */
async function persistToSupabase(data: {
    scenarioId: string;
    userPrompt: string;
    stepId: string;
    agent: string;
    stepType: string;
    stepLabel: string;
    inputContent: string | null;
    outputContent: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cost: number;
    modelName: string;
    executionMode: string;
    handoverFrom: string | null;
    handoverReason: string | null;
}) {
    // Skip if Supabase is not configured
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('agent_queries')
            .insert({
                scenario_id: data.scenarioId,
                user_prompt: data.userPrompt,
                step_id: data.stepId,
                agent: data.agent,
                step_type: data.stepType,
                step_label: data.stepLabel,
                input_content: data.inputContent,
                output_content: data.outputContent?.slice(0, 10000), // Limit size
                prompt_consumed: data.inputContent?.slice(0, 10000),
                input_tokens: data.inputTokens,
                output_tokens: data.outputTokens,
                total_tokens: data.inputTokens + data.outputTokens,
                latency_ms: data.latencyMs,
                cost: data.cost,
                model_name: data.modelName,
                execution_mode: data.executionMode,
                handover_from: data.handoverFrom,
                handover_reason: data.handoverReason,
            });

        if (error) {
            console.error('Supabase persist error:', error.message);
        }
    } catch (e: any) {
        console.error('Supabase persist exception:', e.message);
    }
}

// ---------------------------------------------------------------------------
// Message Builders (FIX #3: Role separation)
// ---------------------------------------------------------------------------

function buildPlannerMessages(systemPrompt: string, userPrompt: string, chatHistory: string): Message[] {
    const messages: Message[] = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];

    if (chatHistory) {
        messages.push({
            role: 'user',
            content: `Previous conversation context:\n${chatHistory}`
        });
        messages.push({
            role: 'assistant',
            content: 'I understand the previous context. What would you like me to help with now?'
        });
    }

    messages.push({
        role: 'user',
        content: sanitizeInput(userPrompt)
    });

    return messages;
}

function buildResearcherMessages(
    systemPrompt: string,
    toolData: string,
    userPrompt: string,
    planContext: { focusAreas: string[]; approach: string } | null
): Message[] {
    let contextSection = '';
    if (planContext && (planContext.focusAreas.length > 0 || planContext.approach)) {
        contextSection = `\n\nResearch Focus:\n`;
        if (planContext.approach) {
            contextSection += `Strategy: ${planContext.approach}\n`;
        }
        if (planContext.focusAreas.length > 0) {
            contextSection += `Key areas to cover:\n${planContext.focusAreas.map(f => `- ${f}`).join('\n')}\n`;
        }
    }

    return [
        {
            role: 'system',
            content: systemPrompt
        },
        {
            role: 'user',
            content: `Here is the raw data from web search/scraping:\n\n${truncateToLimit(toolData, 20000)}${contextSection}\n\nOriginal question: ${sanitizeInput(userPrompt)}\n\nProvide key findings with citations.`
        }
    ];
}

function buildAnalystMessages(
    systemPrompt: string,
    researchOutput: string,
    userPrompt: string,
    planContext: { expectedOutput: string } | null
): Message[] {
    let formatGuidance = '';
    if (planContext?.expectedOutput) {
        formatGuidance = `\n\nRequested output format: ${planContext.expectedOutput}`;
    }

    return [
        {
            role: 'system',
            content: systemPrompt
        },
        {
            role: 'user',
            content: `Research findings to analyze:\n\n${truncateToLimit(researchOutput, 15000)}\n\nOriginal question: ${sanitizeInput(userPrompt)}${formatGuidance}\n\nProvide structured analysis.`
        }
    ];
}

function buildSynthesizerMessages(
    systemPrompt: string,
    researchOutput: string,
    analystOutput: string | null,
    userPrompt: string,
    chatHistory: string
): Message[] {
    const messages: Message[] = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];

    let contextContent = `Research findings:\n${truncateToLimit(researchOutput, 10000)}`;

    if (analystOutput) {
        contextContent += `\n\nAnalysis:\n${truncateToLimit(analystOutput, 2000)}`;
    }

    if (chatHistory) {
        contextContent += `\n\nConversation context:\n${truncateToLimit(chatHistory, 1000)}`;
    }

    messages.push({
        role: 'user',
        content: `${contextContent}\n\nUser's question: ${sanitizeInput(userPrompt)}\n\nProvide the final answer.`
    });

    return messages;
}

// ---------------------------------------------------------------------------
// Agent Factory
// ---------------------------------------------------------------------------

export function createAgent(config: any) {
    const agentConfigs = config.agentConfigs || {};
    const modelTiering = config.modelTiering || false;
    const executionMode = config.executionMode || 'linear';
    const existingScenarioId = config.scenarioId;

    /** Pick model: if tiering is on, always use the fast free model */
    function pickModel(agentType: string): string {
        if (modelTiering) return FAST_MODEL;
        return agentConfigs[agentType]?.selectedModel || FAST_MODEL;
    }

    return {
        stream: async function* (params: { prompt: string; chatHistory: any[] }) {
            // Per-request context (no global mutable state)
            const requestContext: RequestContext = {
                userPrompt: params.prompt,
                executionMode: executionMode,
                modelName: pickModel('synthesizer'),
            };

            // FIX #2: Actually use chat history
            const chatHistoryStr = formatChatHistory(params.chatHistory);

            // Initialize context tracking
            const agentContext: AgentContext = {
                userPrompt: params.prompt,
                chatHistory: chatHistoryStr,
                plannerOutput: null,
                researcherOutput: '',
                analystOutput: '',
            };

            // Use existing scenario if provided, otherwise create new
            let scenarioId = existingScenarioId || '';

            if (!scenarioId) {
                try {
                    const s = await prisma.scenario.create({
                        data: {
                            name: params.prompt.slice(0, 50) + (params.prompt.length > 50 ? '...' : ''),
                            steps: { create: [] },
                        },
                    });
                    scenarioId = s.id;
                } catch (err: any) {
                    console.error('Failed to create scenario:', err);
                    throw new Error(`Database initialization failed: ${err.message}`);
                }
            }

            // ================================================================
            // PLANNER — LLM-based (detailed) or deterministic (quick)
            // ================================================================
            let plan: ExecutionPlan;
            const isQuick = QUICK_PATTERN.test(params.prompt) || executionMode === 'turbo';

            if (isQuick) {
                // ---------- QUICK PATH: deterministic routing (0 ms) ----------
                const intent = classifyIntent(params.prompt);
                const qPipeline = ['researcher'];
                if (intent.needsAnalysis && executionMode !== 'turbo') qPipeline.push('analyst');
                qPipeline.push('synthesizer');

                plan = {
                    searchQuery: intent.searchQuery,
                    needsScrape: intent.needsScrape,
                    scrapeUrl: intent.scrapeUrl,
                    needsAnalysis: intent.needsAnalysis,
                    planText: `Fast-route: ${qPipeline.join(' → ')}${intent.needsScrape ? ` | scrape ${intent.scrapeUrl}` : ` | search "${intent.searchQuery}"`}`,
                    isQuick: true,
                    focusAreas: [],
                    approach: '',
                    expectedOutput: '',
                };

                const pId = sid('planner');
                yield { type: 'step_start', stepId: pId, input: params.prompt, agent: 'planner', consumedPrompt: plan.planText, isFastRoute: true } as any;
                yield { type: 'step_finish', stepId: pId, output: plan.planText, agent: 'planner', latencyMs: 0 } as any;
                await persist(scenarioId, {
                    id: pId,
                    agent: 'planner',
                    stepLabel: 'Fast Route',
                    stepType: 'output',
                    content: plan.planText,
                    latencyMs: 0
                }, requestContext);

            } else {
                // ---------- DETAILED PATH: LLM planner creates a full plan ----------
                const pCfg = agentConfigs.planner;
                const pId = sid('planner');
                const pT0 = Date.now();

                yield { type: 'step_start', stepId: pId, input: params.prompt, agent: 'planner', consumedPrompt: params.prompt } as any;

                const plannerSystemPrompt = pCfg?.systemPrompt || `You are a strategic research planner. Analyze the user's query and create a detailed execution plan.

Your plan MUST include these structured fields at the top (one per line, exactly as shown):
**SEARCH_QUERY:** <an optimized web search query>
**SCRAPE_URL:** <URL if provided, otherwise "none">
**NEEDS_ANALYSIS:** <yes or no>

Then write:

## Approach
Describe the overall strategy.

## Focus Areas
- List 3-5 specific angles to investigate

## Expected Output
Describe the ideal answer format.`;

                const plannerMessages = buildPlannerMessages(plannerSystemPrompt, params.prompt, chatHistoryStr);

                const { text: planOutput, usage: pUsage } = await withRetry(() =>
                    generateText({
                        model: openrouter.chat(pickModel('planner')),
                        messages: plannerMessages,
                    })
                );
                const pMs = Date.now() - pT0;

                yield { type: 'step_finish', stepId: pId, output: planOutput, agent: 'planner', usage: pUsage, latencyMs: pMs } as any;

                // Parse structured fields and focus areas
                const fallbackIntent = classifyIntent(params.prompt);
                const parsed = parsePlanOutput(planOutput, params.prompt);

                plan = {
                    searchQuery: parsed.searchQuery || fallbackIntent.searchQuery,
                    needsScrape: parsed.needsScrape || fallbackIntent.needsScrape,
                    scrapeUrl: parsed.scrapeUrl || fallbackIntent.scrapeUrl,
                    needsAnalysis: parsed.needsAnalysis,
                    planText: planOutput,
                    isQuick: false,
                    focusAreas: parsed.focusAreas,
                    approach: parsed.approach,
                    expectedOutput: parsed.expectedOutput,
                };

                // Store for downstream agents
                agentContext.plannerOutput = {
                    searchQuery: plan.searchQuery,
                    focusAreas: plan.focusAreas,
                    approach: plan.approach,
                    expectedOutput: plan.expectedOutput,
                    needsAnalysis: plan.needsAnalysis,
                };

                await persist(scenarioId, {
                    id: pId,
                    agent: 'planner', stepLabel: 'Detailed Plan', stepType: 'output',
                    content: plan.planText, promptConsumed: JSON.stringify(plannerMessages),
                    inputTokens: (pUsage as any)?.promptTokens || 0,
                    outputTokens: (pUsage as any)?.completionTokens || 0,
                    latencyMs: pMs,
                }, requestContext);
            }

            // Build pipeline from plan
            const pipeline = ['researcher'];
            if (plan.needsAnalysis && executionMode !== 'turbo') pipeline.push('analyst');
            pipeline.push('synthesizer');

            // ================================================================
            // EXECUTOR → RESEARCHER routing (deterministic, 0 ms)
            // ================================================================
            const eId1 = sid('executor');
            yield { type: 'step_start', stepId: eId1, input: 'Routing…', agent: 'executor', isFastRoute: true } as any;
            yield { type: 'step_finish', stepId: eId1, output: 'RESEARCHER', agent: 'executor', latencyMs: 0 } as any;
            await persist(scenarioId, { id: eId1, agent: 'executor', stepLabel: 'Routing', stepType: 'action', content: 'RESEARCHER', latencyMs: 0 }, requestContext);

            // ================================================================
            // RESEARCHER — 1 Jina call + 1 LLM call
            // ================================================================
            const rCfg = agentConfigs.researcher;
            const rId = sid('researcher');
            const rT0 = Date.now();

            yield { type: 'step_start', stepId: rId, input: 'Researching…', agent: 'researcher', consumedPrompt: params.prompt } as any;

            // Tool selection: scrape if URL present, otherwise search using plan's query
            let toolData = '';
            if (plan.needsScrape && plan.scrapeUrl) {
                yield { type: 'tool_call', tool: 'jina_scraper', args: { url: plan.scrapeUrl }, stepId: rId, agent: 'researcher' } as any;
                const result = await jinaScrape(plan.scrapeUrl);
                yield { type: 'tool_result', tool: 'jina_scraper', result, stepId: rId, agent: 'researcher' } as any;
                toolData = `[SCRAPED ${plan.scrapeUrl}]:\nTitle: ${result.title}\n${(result.markdown || '').slice(0, 4000)}\n`;
            } else {
                yield { type: 'tool_call', tool: 'jina_search', args: { query: plan.searchQuery }, stepId: rId, agent: 'researcher' } as any;
                const results = await jinaSearch(plan.searchQuery);
                yield { type: 'tool_result', tool: 'jina_search', result: results, stepId: rId, agent: 'researcher' } as any;
                toolData = results.map((r, i) => `${i + 1}. ${r.title} — ${r.url}\n   ${r.description}`).join('\n') + '\n';
            }

            const researcherSystemPrompt = rCfg?.systemPrompt || `You are a research assistant. Extract the most relevant facts from the provided data.

Rules:
1. Cite sources using markdown links: [Source Title](URL)
2. Use bullet points for clarity
3. Keep response under 500 words
4. If data is insufficient, explicitly state what's missing`;

            // FIX #6: Pass planner context to researcher
            const researcherMessages = buildResearcherMessages(
                researcherSystemPrompt,
                toolData,
                params.prompt,
                agentContext.plannerOutput
            );

            const { text: researchOut, usage: rUsage } = await withRetry(() =>
                generateText({
                    model: openrouter.chat(pickModel('researcher')),
                    messages: researcherMessages,
                })
            );
            const rMs = Date.now() - rT0;

            yield { type: 'step_finish', stepId: rId, output: researchOut, agent: 'researcher', usage: rUsage, latencyMs: rMs } as any;
            agentContext.researcherOutput = researchOut;
            await persist(scenarioId, {
                id: rId,
                agent: 'researcher', stepLabel: 'Research', stepType: 'output',
                content: researchOut, promptConsumed: JSON.stringify(researcherMessages),
                inputTokens: (rUsage as any)?.promptTokens || 0,
                outputTokens: (rUsage as any)?.completionTokens || 0,
                latencyMs: rMs,
            }, requestContext);

            // ================================================================
            // ANALYST — conditional, 1 LLM call (skipped in turbo mode)
            // ================================================================
            if (pipeline.includes('analyst')) {
                const eId2 = sid('executor');
                yield { type: 'step_start', stepId: eId2, input: 'Routing…', agent: 'executor', isFastRoute: true } as any;
                yield { type: 'step_finish', stepId: eId2, output: 'ANALYST', agent: 'executor', latencyMs: 0 } as any;
                await persist(scenarioId, { id: eId2, agent: 'executor', stepLabel: 'Routing', stepType: 'action', content: 'ANALYST', latencyMs: 0 }, requestContext);

                const aCfg = agentConfigs.analyst;
                const aId = sid('analyst');
                const aT0 = Date.now();

                yield { type: 'step_start', stepId: aId, input: 'Analyzing…', agent: 'analyst', consumedPrompt: researchOut } as any;

                const analystSystemPrompt = aCfg?.systemPrompt || `You are a data analyst. Structure the research findings into actionable insights.

Guidelines:
- Use comparison tables when comparing 2+ items
- Use pros/cons lists for evaluation questions
- Use ranked lists for "best of" questions
- Flag any assumptions or data gaps
- Keep analysis focused and under 400 words`;

                const analystMessages = buildAnalystMessages(
                    analystSystemPrompt,
                    researchOut,
                    params.prompt,
                    agentContext.plannerOutput
                );

                const { text: analysisOut, usage: aUsage } = await withRetry(() =>
                    generateText({
                        model: openrouter.chat(pickModel('analyst')),
                        messages: analystMessages,
                    })
                );
                const aMs = Date.now() - aT0;

                yield { type: 'step_finish', stepId: aId, output: analysisOut, agent: 'analyst', usage: aUsage, latencyMs: aMs } as any;
                agentContext.analystOutput = analysisOut;
                await persist(scenarioId, {
                    id: aId,
                    agent: 'analyst', stepLabel: 'Analysis', stepType: 'output',
                    content: analysisOut, promptConsumed: JSON.stringify(analystMessages),
                    inputTokens: (aUsage as any)?.promptTokens || 0,
                    outputTokens: (aUsage as any)?.completionTokens || 0,
                    latencyMs: aMs,
                }, requestContext);
            }

            // ================================================================
            // SYNTHESIZER — final LLM call
            // ================================================================
            const eId3 = sid('executor');
            yield { type: 'step_start', stepId: eId3, input: 'Routing…', agent: 'executor', isFastRoute: true } as any;
            yield { type: 'step_finish', stepId: eId3, output: 'SYNTHESIZER', agent: 'executor', latencyMs: 0 } as any;
            await persist(scenarioId, { id: eId3, agent: 'executor', stepLabel: 'Routing', stepType: 'action', content: 'SYNTHESIZER', latencyMs: 0 }, requestContext);

            const sCfg = agentConfigs.synthesizer;
            const sId = sid('synthesizer');
            const sT0 = Date.now();

            yield { type: 'step_start', stepId: sId, input: 'Synthesizing…', agent: 'synthesizer', consumedPrompt: agentContext.researcherOutput } as any;

            const synthesizerSystemPrompt = sCfg?.systemPrompt || `You are a helpful assistant delivering the final answer.

Rules:
- Start directly with the answer, no preamble
- Never mention internal agents or processes
- Be concise but comprehensive
- Include a brief summary or key takeaway at the end`;

            const synthesizerMessages = buildSynthesizerMessages(
                synthesizerSystemPrompt,
                agentContext.researcherOutput,
                agentContext.analystOutput || null,
                params.prompt,
                chatHistoryStr
            );

            const { text: finalOut, usage: sUsage } = await withRetry(() =>
                generateText({
                    model: openrouter.chat(pickModel('synthesizer')),
                    messages: synthesizerMessages,
                })
            );
            const sMs = Date.now() - sT0;

            yield { type: 'step_finish', stepId: sId, output: finalOut, agent: 'synthesizer', usage: sUsage, latencyMs: sMs } as any;
            yield { type: 'finish', content: finalOut, usage: sUsage, agent: 'synthesizer', stepId: sId } as any;
            await persist(scenarioId, {
                id: sId,
                agent: 'synthesizer', stepLabel: 'Final Synthesis', stepType: 'output',
                content: finalOut, promptConsumed: JSON.stringify(synthesizerMessages),
                inputTokens: (sUsage as any)?.promptTokens || 0,
                outputTokens: (sUsage as any)?.completionTokens || 0,
                latencyMs: sMs,
            }, requestContext);
        }
    };
}
