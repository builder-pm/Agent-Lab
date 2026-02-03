
import { supabase } from '../supabase';
import { AgentConfig, AgentEvent } from './types';
import prisma from '../db';

export const FAST_MODEL = 'nvidia/nemotron-nano-9b-v2:free';

export function pickModel(agentType: string, config: AgentConfig): string {
    if (config.modelTiering) return FAST_MODEL;
    return config.agentConfigs?.[agentType]?.selectedModel || FAST_MODEL;
}

export function truncateToLimit(text: string, limit: number): string {
    if (text.length <= limit) return text;
    return text.slice(0, limit - 100) + '\n\n[... truncated for context limit ...]';
}

export function formatChatHistory(history: any[]): string {
    if (!history || history.length === 0) return '';
    const relevant = history.slice(-6);
    return relevant
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 500)}`)
        .join('\n');
}

export function sanitizeInput(input: string): string {
    return `<user_input>\n${input}\n</user_input>`;
}

export function extractReasoning(text: string): { reasoning?: string; cleanText: string } {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
        return {
            reasoning: thinkMatch[1].trim(),
            cleanText: text.replace(/<think>[\s\S]*?<\/think>/, '').trim()
        };
    }
    return { cleanText: text };
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 1000,
    logError: (msg: string) => void = console.error
): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            logError(`Attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
            if (attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError || new Error('All retry attempts failed');
}

// Telemetry Persistence Wrapper
export async function persistStep(
    scenarioId: string,
    data: {
        id: string;
        agent: string;
        stepLabel: string;
        stepType: string;
        content: string;
        timestamp?: number;
        promptConsumed?: string;
        inputTokens?: number;
        outputTokens?: number;
        latencyMs?: number;
        cost?: number;
        handoverFrom?: string | null;
        handoverReason?: string | null;
        isParallel?: boolean;
        parallelGroup?: string;
        parallelLabel?: string;
    },
    ctx: { userPrompt: string; executionMode: string; modelName: string }
) {
    // 1. SQLite Persistence (Prisma)
    const dbPromise = prisma.agentStep.create({
        data: {
            id: data.id,
            scenarioId,
            agent: data.agent,
            stepLabel: data.stepLabel,
            stepType: data.stepType,
            content: data.content,
            timestamp: BigInt(data.timestamp || Date.now()),
            promptConsumed: data.promptConsumed,
            inputTokens: data.inputTokens || 0,
            outputTokens: data.outputTokens || 0,
            latencyMs: data.latencyMs || 0,
            cost: data.cost || 0.0,
            handoverFrom: data.handoverFrom,
            handoverReason: data.handoverReason,
            isParallel: data.isParallel || false,
            parallelGroup: data.parallelGroup,
            parallelLabel: data.parallelLabel
        }
    }).catch((e: any) => console.error('SQLite persist error:', e));

    // 2. Supabase Persistence
    const sbPromise = supabase ? supabase
        .from('agentlab.agent_queries')
        .insert({
            scenario_id: scenarioId,
            user_prompt: ctx.userPrompt,
            step_id: data.id,
            agent: data.agent,
            step_type: data.stepType,
            step_label: data.stepLabel,
            input_content: data.promptConsumed || null,
            output_content: data.content?.slice(0, 10000),
            prompt_consumed: data.promptConsumed?.slice(0, 10000),
            input_tokens: data.inputTokens || 0,
            output_tokens: data.outputTokens || 0,
            total_tokens: (data.inputTokens || 0) + (data.outputTokens || 0),
            latency_ms: data.latencyMs || 0,
            cost: data.cost || 0,
            model_name: ctx.modelName,
            execution_mode: ctx.executionMode,
            handover_from: data.handoverFrom || null,
            handover_reason: data.handoverReason || null,
        })
        .then(({ error }) => { if (error) console.error('Supabase persist error:', error.message); })
        : Promise.resolve();

    return Promise.all([dbPromise, sbPromise]);
}
