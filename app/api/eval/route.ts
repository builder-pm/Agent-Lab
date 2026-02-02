import { NextRequest, NextResponse } from 'next/server';
import { evaluateScenarioResult } from '@/lib/evaluator';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { scenarioId, judgeId, testCasePrompt, expectedOutput } = await req.json();

        if (!scenarioId) {
            return NextResponse.json({ error: 'Missing scenarioId' }, { status: 400 });
        }

        // Get or create a default judge if not provided
        let judge = judgeId
            ? await prisma.judge.findUnique({ where: { id: judgeId } })
            : await prisma.judge.findFirst({ where: { type: 'LLM' } });

        if (!judge) {
            judge = await prisma.judge.create({
                data: {
                    name: 'Default LLM Judge',
                    type: 'LLM',
                    config: 'You are an AI judge. Grade the answer on a scale of 0.0 to 1.0.'
                }
            });
        }

        const result = await evaluateScenarioResult(scenarioId, judge.id, testCasePrompt, expectedOutput);

        if (!result) {
            return NextResponse.json({ error: 'Evaluation failed - no valid scenario or steps found' }, { status: 400 });
        }

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('Eval API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const stepId = searchParams.get('stepId');
    const scenarioId = searchParams.get('scenarioId');

    if (stepId) {
        const evals = await prisma.evaluationResult.findMany({
            where: { stepId },
            include: { metric: true, judge: true }
        });
        return NextResponse.json(evals);
    }

    if (scenarioId) {
        const evals = await prisma.evaluationResult.findMany({
            where: { scenarioId },
            include: { metric: true, judge: true }
        });
        return NextResponse.json(evals);
    }

    return NextResponse.json({ error: 'Missing stepId or scenarioId' }, { status: 400 });
}
