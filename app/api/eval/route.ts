import { NextRequest, NextResponse } from 'next/server';
import { evaluateStep, seedEvalPrerequisites } from '@/lib/evaluator';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { stepId, scenarioId, metrics } = await req.json();

        // Ensure metrics/judges are seeded
        await seedEvalPrerequisites();

        if (stepId) {
            const results = [];
            for (const metric of (metrics || ['Faithfulness', 'Relevancy'])) {
                const res = await evaluateStep(stepId, metric);
                if (res) results.push({ metric, ...res });
            }
            return NextResponse.json({ success: true, results });
        }

        if (scenarioId) {
            // Evaluate all steps in a scenario
            const steps = await prisma.agentStep.findMany({
                where: { scenarioId },
                select: { id: true }
            });

            const allResults = [];
            for (const step of steps) {
                for (const metric of (metrics || ['Faithfulness', 'Relevancy'])) {
                    const res = await evaluateStep(step.id, metric);
                    if (res) allResults.push({ stepId: step.id, metric, ...res });
                }
            }
            return NextResponse.json({ success: true, results: allResults });
        }

        return NextResponse.json({ error: 'Missing stepId or scenarioId' }, { status: 400 });
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
