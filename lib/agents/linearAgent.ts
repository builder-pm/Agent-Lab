
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import prisma from '../db';
import { AgentConfig, AgentInterface, AgentEvent } from './types';
import {
    sanitizeInput, truncateToLimit, formatChatHistory, extractReasoning,
    withRetry, persistStep, pickModel
} from './base';

// ---------------------------------------------------------------------------
// Jina Logic (Copied for now, should be in tools/jina.ts)
// ---------------------------------------------------------------------------
const JINA_API_KEY = process.env.JINA_API_KEY;

async function jinaSearch(query: string, maxResults: number = 5): Promise<{ title: string; url: string; description: string; }[]> {
    if (!JINA_API_KEY) return [{ title: 'Config Error', url: '', description: 'JINA_API_KEY missing' }];
    try {
        const res = await fetch(`https://s.jina.ai/?${new URLSearchParams({ q: query })}`, {
            headers: { 'Authorization': `Bearer ${JINA_API_KEY}`, 'Accept': 'application/json', 'X-Respond-With': 'no-content' },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        return (data.data || []).slice(0, maxResults).map((r: any) => ({
            title: r.title || 'No title', url: r.url || '', description: r.description || r.content || '',
        }));
    } catch (err: any) {
        console.error('Jina search error:', err.message);
        return [{ title: 'Search Error', url: '', description: err.message }];
    }
}

async function jinaScrape(url: string): Promise<any> {
    if (!JINA_API_KEY) return { success: false, error_message: 'JINA_API_KEY missing' };
    try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
            headers: { 'Authorization': `Bearer ${JINA_API_KEY}`, 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        return {
            title: data.data?.title || 'No Title', url, markdown: data.data?.content || '', media: data.data?.images || [], success: true, error_message: null,
        };
    } catch (err: any) {
        console.error('Jina scrape error:', err);
        return { success: false, url, error_message: err.message, markdown: '' };
    }
}

// ---------------------------------------------------------------------------
// Intent Logic
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

function parsePlanOutput(planText: string, fallbackPrompt: string) {
    const searchMatch = planText.match(/\*\*SEARCH_QUERY:\*\*\s*(.+)/i) || planText.match(/SEARCH_QUERY:\s*(.+)/i);
    const scrapeMatch = planText.match(/\*\*SCRAPE_URL:\*\*\s*(.+)/i) || planText.match(/SCRAPE_URL:\s*(.+)/i);
    const analysisMatch = planText.match(/\*\*NEEDS_ANALYSIS:\*\*\s*(yes|no)/i) || planText.match(/NEEDS_ANALYSIS:\s*(yes|no)/i);
    const complexityMatch = planText.match(/\*\*COMPLEXITY:\*\*\s*(Simple|Complex)/i) || planText.match(/COMPLEXITY:\s*(Simple|Complex)/i);
    const focusAreasMatch = planText.match(/## Focus Areas\s*([\s\S]*?)(?=##|$)/i);
    const focusAreas = focusAreasMatch ? focusAreasMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim()) : [];
    const approachMatch = planText.match(/## Approach\s*([\s\S]*?)(?=##|$)/i);
    const expectedMatch = planText.match(/## Expected Output\s*([\s\S]*?)(?=##|$)/i);
    const scrapeUrl = scrapeMatch ? scrapeMatch[1].trim() : 'none';
    const urlInScrape = scrapeUrl.match(URL_PATTERN);

    // Smart Defaults: If Search Query is literally "none", forced Complexity to Simple unless Analysis is needed
    let complexity = complexityMatch ? complexityMatch[1] : 'Complex';
    const searchQuery = searchMatch ? searchMatch[1].trim() : fallbackPrompt;
    const needsAnalysis = analysisMatch ? analysisMatch[1].toLowerCase() === 'yes' : ANALYSIS_PATTERN.test(fallbackPrompt);

    if (searchQuery.toLowerCase() === 'none' && !needsAnalysis) {
        complexity = 'Simple';
    }

    return {
        searchQuery,
        needsScrape: !!urlInScrape,
        scrapeUrl: urlInScrape ? urlInScrape[0] : null,
        needsAnalysis,
        complexity,
        focusAreas,
        approach: approachMatch ? approachMatch[1].trim() : '',
        expectedOutput: expectedMatch ? expectedMatch[1].trim() : '',
    };
}

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

let counter = 0;
function sid(suffix: string) { return `step-${Date.now()}-${++counter}-${suffix}`; }

// ---------------------------------------------------------------------------
// Linear Agent Implementation
// ---------------------------------------------------------------------------
export class LinearAgent implements AgentInterface {
    constructor(private config: AgentConfig) { }

    async *stream(params: { prompt: string; chatHistory: any[] }): AsyncGenerator<AgentEvent, void, unknown> {
        const { isLabsEnabled, agentMode, agentConfigs } = this.config;
        const executionMode = agentMode === 'linear' ? 'linear' : 'deep'; // Simplified, router handles turbo now
        const scenarioId = this.config.scenarioId || '';

        // Context Setup
        const reqContext = { userPrompt: params.prompt, executionMode, modelName: '' }; // modelName updated per step
        const chatHistoryStr = formatChatHistory(params.chatHistory);
        let plannerOutput: any = null;
        let researcherOutput = '';
        let analystOutput = '';

        // 1. DATABASE INIT (Assumption: Scenario created by factory or passed in)
        if (!scenarioId) throw new Error('ScenarioID required for LinearAgent');

        // 2. ROUTER & PLANNER
        const pId = sid('planner');
        let plan: any;
        let isSimplePath = false;

        // ROUTER STEP
        const rId = sid('router');
        const routerModel = pickModel('planner', this.config);
        yield { type: 'step_start', stepId: rId, input: 'Routing...', agent: 'router', meta: { modelInfo: { name: routerModel } } };

        const routerPrompt = `You are an intent classifier. Determine if the user's query requires external research or can be answered directly.
Rules:
- "Simple": Greetings, basic math, creative writing, roleplay, or general knowledge that DOES NOT require up-to-date info.
- "Research": Queries asking for facts, news, comparisons, documentation, or specific data.

Return JSON ONLY:
{ "type": "simple" | "research", "reasoning": "brief explanation" }`;

        const routerMessages = [
            { role: 'system', content: routerPrompt },
            { role: 'user', content: sanitizeInput(params.prompt) }
        ];

        let routeResult = { type: 'research', reasoning: 'Fallback' };
        try {
            const { text: rText } = await withRetry(() => generateText({ model: openrouter.chat(routerModel), messages: routerMessages as any }));
            const jsonMatch = rText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                routeResult = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Router failed', e);
        }

        yield { type: 'step_finish', stepId: rId, output: `Classified as: ${routeResult.type.toUpperCase()}`, agent: 'router', meta: { reasoning: routeResult.reasoning }, latencyMs: 0 };

        if (routeResult.type === 'simple') {
            isSimplePath = true;
            plan = {
                searchQuery: 'none', needsScrape: false, scrapeUrl: null,
                needsAnalysis: false, planText: 'Simple Query - Direct Response',
                complexity: 'Simple', focusAreas: [], approach: 'Direct Answer',
            };
            yield { type: 'step_start', stepId: pId, input: params.prompt, agent: 'planner', isFastRoute: true };
            yield { type: 'step_finish', stepId: pId, output: 'Skipping detailed planning for simple query.', agent: 'planner', latencyMs: 0 };
            await persistStep(scenarioId, { id: pId, agent: 'planner', stepLabel: 'Fast Route', stepType: 'output', content: plan.planText, latencyMs: 0 }, reqContext);
        } else {

            const pModel = pickModel('planner', this.config);
            reqContext.modelName = pModel;
            yield { type: 'step_start', stepId: pId, input: params.prompt, agent: 'planner', meta: { modelInfo: { name: pModel } } };

            const systemPrompt = agentConfigs?.planner?.systemPrompt || `You are a strategic research planner. Analyze the user's query and create a detailed execution plan.
Your plan MUST include these structured fields at the top (one per line, exactly as shown):
**SEARCH_QUERY:** <an optimized web search query or "none">
**SCRAPE_URL:** <URL if provided, otherwise "none">
**NEEDS_ANALYSIS:** <yes or no>
**COMPLEXITY:** <Simple or Complex>

**COMPLEXITY:** <Simple or Complex>

Rules for COMPLEXITY:
- "Simple": General knowledge, greetings, math (e.g. "2+2"), definitions, or direct questions not needing web search. MUST Set SEARCH_QUERY to "none".
- "Complex": Requires up-to-date info, data comparison, fact-checking, or deep explanation.

CRITICAL: You must use <think> tags to capture your reasoning process before generating the JSON plan. Example:
<think>
The user wants... I should search for...
</think>

Then write:
## Approach
Describe the overall strategy.
## Focus Areas
- List 3-5 specific angles to investigate
## Expected Output
Describe the ideal answer format.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...(chatHistoryStr ? [{ role: 'user', content: `Previous context:\n${chatHistoryStr}` }, { role: 'assistant', content: 'Understood.' }] : []),
                { role: 'user', content: sanitizeInput(params.prompt) }
            ];

            const t0 = Date.now();
            const { text, usage } = await withRetry(() => generateText({ model: openrouter.chat(pModel), messages: messages as any }));
            const ms = Date.now() - t0;
            const { reasoning, cleanText } = extractReasoning(text);
            const reasoningTokens = reasoning ? Math.ceil(reasoning.length / 4) : 0;

            yield { type: 'step_finish', stepId: pId, output: cleanText, agent: 'planner', latencyMs: ms, usage, meta: { reasoning, reasoningTokens } };
            await persistStep(scenarioId, { id: pId, agent: 'planner', stepLabel: 'Detailed Plan', stepType: 'output', content: cleanText, latencyMs: ms, promptConsumed: JSON.stringify(messages), inputTokens: (usage as any)?.promptTokens, outputTokens: (usage as any)?.completionTokens }, reqContext);

            const parsed = parsePlanOutput(text, params.prompt);
            plan = { ...parsed, planText: text, isQuick: false };
            plannerOutput = plan;
        }

        // Pipeline Logic
        let pipeline = ['researcher'];

        // Short-Circuit for Simple Queries (Planner Driven)
        let isSimple = plan.complexity === 'Simple';
        if (isSimple) {
            pipeline = []; // Skip Researcher/Analyst
            yield { type: 'step_start', stepId: sid('router'), input: 'Routing...', agent: 'router', isFastRoute: true };
            yield { type: 'step_finish', stepId: sid('router'), output: 'SHORT_CIRCUIT: Simple Query identified. Skipping Research.', agent: 'router', latencyMs: 0 };
        } else {
            // Standard Pipeline
            if ((plan.needsAnalysis || isLabsEnabled) && executionMode !== 'linear') pipeline.push('analyst');
        }
        pipeline.push('synthesizer');

        // ROUTING
        if (!isSimple) {
            const eId1 = sid('executor');
            yield { type: 'step_start', stepId: eId1, input: 'Routing...', agent: 'router', isFastRoute: true };
            yield { type: 'step_finish', stepId: eId1, output: 'RESEARCHER', agent: 'router', latencyMs: 0 };
            await persistStep(scenarioId, { id: eId1, agent: 'executor', stepLabel: 'Routing', stepType: 'action', content: 'RESEARCHER', latencyMs: 0 }, reqContext);
        }

        // 3. RESEARCHER
        let retries = 0;
        const MAX_RETRIES = 1;

        while (pipeline.includes('researcher')) {
            const rId = sid(retries > 0 ? 'researcher-retry' : 'researcher');
            const rModel = pickModel('researcher', this.config);
            reqContext.modelName = rModel;

            // Check if we need to replan (Feedback Loop)
            // ... (Logic handled inside the loop via break/continue)

            yield { type: 'step_start', stepId: rId, input: 'Researching...', agent: 'researcher', meta: { input: plan.searchQuery || params.prompt, modelInfo: { name: rModel } } };

            let toolData = '';
            if (plan.needsScrape && plan.scrapeUrl) {
                yield { type: 'tool_call', tool: 'jina_scraper', args: { url: plan.scrapeUrl }, stepId: rId, agent: 'researcher' };
                const res = await jinaScrape(plan.scrapeUrl);
                yield { type: 'tool_result', tool: 'jina_scraper', result: res, stepId: rId, agent: 'researcher' };
                toolData = `[SCRAPED ${plan.scrapeUrl}]:\nTitle: ${res.title}\n${(res.markdown || '').slice(0, 4000)}\n`;
            } else {
                yield { type: 'tool_call', tool: 'jina_search', args: { query: plan.searchQuery }, stepId: rId, agent: 'researcher' };
                const res = await jinaSearch(plan.searchQuery);
                yield { type: 'tool_result', tool: 'jina_search', result: res, stepId: rId, agent: 'researcher' };
                toolData = res.map((r: any, i: number) => `${i + 1}. ${r.title} — ${r.url}\n   ${r.description}`).join('\n') + '\n';
            }

            // FEEDBACK LOOP: Check for bad data
            const isDataPoor = toolData.length < 50 || toolData.includes('Title: Search Error') || (toolData.includes('No title') && toolData.length < 100);

            if (isDataPoor && retries < MAX_RETRIES) {
                retries++;
                yield { type: 'step_finish', stepId: rId, output: 'Result appears insufficient. Triggering Replanning...', agent: 'executor', latencyMs: 0, meta: { reasoning: 'Initial search yielded poor results.' } };

                // REPLANNING STEP
                const replanId = sid('re-planner');
                const replanPrompt = `Previous plan for "${params.prompt}" failed using query "${plan.searchQuery}". Result was: ${toolData.slice(0, 100)}...
    Create a NEW, BETTER plan.
    **SEARCH_QUERY:** <new query>
    **SCRAPE_URL:** <none>
    **NEEDS_ANALYSIS:** <yes/no>
    **COMPLEXITY:** Complex`;

                yield { type: 'step_start', stepId: replanId, input: 'Replanning due to poor data...', agent: 'planner' };

                const { text: newPlanText } = await withRetry(() => generateText({
                    model: openrouter.chat(pickModel('planner', this.config)),
                    messages: [{ role: 'system', content: 'You are a strategic planner. Recovery mode.' }, { role: 'user', content: replanPrompt }] as any
                }));

                const newParsed = parsePlanOutput(newPlanText, params.prompt);
                plan = { ...newParsed, planText: newPlanText, isQuick: false };
                yield { type: 'step_finish', stepId: replanId, output: newPlanText, agent: 'planner', latencyMs: 0 };

                // Continue loop to retry research with new plan
                continue;
            }

            // Proceed if data is good or max retries reached logic below...

            const rSystemPrompt = agentConfigs?.researcher?.systemPrompt || `You are a research assistant. Extract relevant facts.
Rules:
1. Cite sources [Source Title](URL)
2. Use bullets
3. Keep under 500 words
4. State if data is missing
5. Use <think> tags to plan your extraction strategy.`;

            let contextSection = '';
            if (plannerOutput && (plannerOutput.focusAreas.length > 0 || plannerOutput.approach)) {
                contextSection = `\n\nFocus Areas:\n${plannerOutput.focusAreas.join('\n')}\nStrategy: ${plannerOutput.approach}`;
            }

            const rMessages = [
                { role: 'system', content: rSystemPrompt },
                { role: 'user', content: `Raw Data:\n${truncateToLimit(toolData, 20000)}${contextSection}\n\nOriginal Question: ${sanitizeInput(params.prompt)}\n\nProvide findings.` }
            ];

            const rT0 = Date.now();
            const { text: rText, usage: rUsage } = await withRetry(() => generateText({ model: openrouter.chat(rModel), messages: rMessages as any }));
            const rMs = Date.now() - rT0;
            const { reasoning: rReason, cleanText: rClean } = extractReasoning(rText);
            const rReasonTokens = rReason ? Math.ceil(rReason.length / 4) : 0;

            yield { type: 'step_finish', stepId: rId, output: rClean, agent: 'researcher', latencyMs: rMs, usage: rUsage, meta: { reasoning: rReason, reasoningTokens: rReasonTokens } };
            await persistStep(scenarioId, { id: rId, agent: 'researcher', stepLabel: 'Research', stepType: 'output', content: rText, latencyMs: rMs, promptConsumed: JSON.stringify(rMessages), inputTokens: (rUsage as any)?.promptTokens, outputTokens: (rUsage as any)?.completionTokens }, reqContext);
            researcherOutput = rText;

            // Break the loop if successful
            break;
        }

        // 4. ANALYST
        if (pipeline.includes('analyst')) {
            const eId2 = sid('executor');
            yield { type: 'step_finish', stepId: eId2, output: 'ANALYST', agent: 'executor', latencyMs: 0 }; // Skipping start event for brevity

            const aId = sid('analyst');
            const aModel = pickModel('analyst', this.config);
            reqContext.modelName = aModel;
            yield { type: 'step_start', stepId: aId, input: 'Analyzing...', agent: 'analyst', meta: { modelInfo: { name: aModel } } };

            const aSystemPrompt = agentConfigs?.analyst?.systemPrompt || `You are a data analyst. Structure findings into insights.
Guidelines:
- Use markdown tables
- Pros/Cons
- Under 400 words
- Use <think> tags to analyze the data relationships before writing the report.`;

            let labsGuidance = '';
            if (isLabsEnabled) {
                labsGuidance = `\n\n**LABS ENABLED**: Generate Python code (matplotlib/plotly) to visualize data. Wrap code in \`\`\`python ... \`\`\`.`;
            }

            const aMessages = [
                { role: 'system', content: aSystemPrompt },
                { role: 'user', content: `Findings:\n${truncateToLimit(researcherOutput, 15000)}\n\nQuestion: ${sanitizeInput(params.prompt)}${labsGuidance}` }
            ];

            const aT0 = Date.now();
            const { text: aText, usage: aUsage } = await withRetry(() => generateText({ model: openrouter.chat(aModel), messages: aMessages as any }));
            const aMs = Date.now() - aT0;
            const { reasoning: aReason, cleanText: aClean } = extractReasoning(aText);
            const aReasonTokens = aReason ? Math.ceil(aReason.length / 4) : 0;

            yield { type: 'step_finish', stepId: aId, output: aClean, agent: 'analyst', latencyMs: aMs, usage: aUsage, meta: { reasoning: aReason, reasoningTokens: aReasonTokens } };
            await persistStep(scenarioId, { id: aId, agent: 'analyst', stepLabel: 'Analysis', stepType: 'output', content: aText, latencyMs: aMs, promptConsumed: JSON.stringify(aMessages), inputTokens: (aUsage as any)?.promptTokens, outputTokens: (aUsage as any)?.completionTokens }, reqContext);
            analystOutput = aText;
        }

        // 5. SYNTHESIZER
        const sId = sid('synthesizer');
        const sModel = pickModel('synthesizer', this.config);
        reqContext.modelName = sModel;
        yield { type: 'step_start', stepId: sId, input: 'Synthesizing...', agent: 'synthesizer', meta: { modelInfo: { name: sModel } } };

        const sSystemPrompt = agentConfigs?.synthesizer?.systemPrompt || `You are a helpful assistant.
Rules:
- Start directly with answer
- Concise but comprehensive
- Use <think> tags to synthesize the different parts before the final answer.`;

        const sMessages = [
            { role: 'system', content: sSystemPrompt },
            { role: 'user', content: `Research:\n${truncateToLimit(researcherOutput, 10000)}\n\nAnalysis:\n${truncateToLimit(analystOutput, 2000)}\n\nContext:\n${truncateToLimit(chatHistoryStr, 1000)}\n\nQuestion: ${sanitizeInput(params.prompt)}` }
        ];

        const sT0 = Date.now();
        const { text: sText, usage: sUsage } = await withRetry(() => generateText({ model: openrouter.chat(sModel), messages: sMessages as any }));
        const sMs = Date.now() - sT0;
        const { reasoning: sReason, cleanText: sClean } = extractReasoning(sText);
        const sReasonTokens = sReason ? Math.ceil(sReason.length / 4) : 0;

        yield { type: 'step_finish', stepId: sId, output: sClean, agent: 'synthesizer', latencyMs: sMs, usage: sUsage, meta: { reasoning: sReason, reasoningTokens: sReasonTokens } };
        // yield { type: 'finish', content: sClean, usage: sUsage, agent: 'synthesizer', stepId: sId };
        await persistStep(scenarioId, { id: sId, agent: 'synthesizer', stepLabel: 'Final Synthesis', stepType: 'output', content: sText, latencyMs: sMs, promptConsumed: JSON.stringify(sMessages), inputTokens: (sUsage as any)?.promptTokens, outputTokens: (sUsage as any)?.completionTokens }, reqContext);
    }
}
