import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import prisma from './db';
import { supabase } from './supabase';

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

const DEFAULT_JUDGE_MODEL = 'google/gemini-2.0-flash-001';

export type EvalResult = {
    score: number;
    reasoning: string;
};

// ... seedEvalPrerequisites removed or kept minimal if needed ...

export async function evaluateScenarioResult(scenarioId: string, judgeId: string, testCasePrompt?: string, expectedOutput?: string): Promise<EvalResult | null> {
    const scenario = await prisma.scenario.findUnique({
        where: { id: scenarioId },
        include: { steps: { orderBy: { timestamp: 'asc' } } }
    });

    const judge = await prisma.judge.findUnique({ where: { id: judgeId } });

    if (!scenario || !judge || scenario.steps.length === 0) return null;

    // Get final output (last step with content)
    const finalStep = scenario.steps.reverse().find(s => s.stepType === 'output' || s.content);
    if (!finalStep) return null;

    let score = 0;
    let reasoning = "Evaluation failed";

    if (judge.type === 'HEURISTIC') {
        // Simple Regex / Keyword Match
        try {
            const config = JSON.parse(judge.config || '{}');
            const pattern = config.pattern;
            if (pattern) {
                const regex = new RegExp(pattern, 'i');
                const matched = regex.test(finalStep.content);
                score = matched ? 1 : 0;
                reasoning = matched ? `Matched pattern "${pattern}"` : `Did not match pattern "${pattern}"`;
            }
        } catch (e) {
            reasoning = "Invalid Heuristic Config";
        }
    } else {
        // LLM Judge
        const systemPrompt = judge.config || `You are an AI judge. Grade the answer on a scale of 0.0 to 1.0.`;

        const userPrompt = `
TEST CASE PROMPT: "${testCasePrompt || 'N/A'}"
EXPECTED OUTPUT: "${expectedOutput || 'N/A'}"

ACTUAL AGENT OUTPUT:
"${finalStep.content}"

Evaluate the actual output against the expected output.
Provide your response in JSON format: { "score": number, "reasoning": "string" }
`;

        try {
            const { text } = await generateText({
                model: openrouter.chat(DEFAULT_JUDGE_MODEL), // We use a fixed smart model to ACT as the judge
                system: systemPrompt,
                prompt: userPrompt,
            });

            const res = JSON.parse(text) as EvalResult;
            score = res.score;
            reasoning = res.reasoning;
        } catch (error) {
            console.error('LLM Judge Error:', error);
            return null;
        }
    }

    // Persist Result
    // We need a dummy metric for now or create one dynamically if we want to link it properly.
    // For simplicity, we just use a "General" metric or look one up.
    let metric = await prisma.evaluationMetric.findFirst({ where: { name: 'General' } });
    if (!metric) {
        metric = await prisma.evaluationMetric.create({
            data: { name: 'General', type: 'scale_1_5' }
        });
    }

    const savedResult = await prisma.evaluationResult.create({
        data: {
            metricId: metric.id,
            scenarioId: scenario.id,
            judgeId: judge.id,
            score,
            reasoning,
        }
    });

    return { score, reasoning };
}