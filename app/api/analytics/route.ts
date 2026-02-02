import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        // 1. Summary Counts
        const totalRuns = await prisma.testRun.count();
        const totalScenarios = await prisma.scenario.count();
        const totalEvals = await prisma.evaluationResult.count();

        // 2. Average Eval Score (Last 30 days)
        const avgScore = await prisma.evaluationResult.aggregate({
            _avg: { score: true },
            where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        });

        // 3. Cost & Tokens (Total)
        const resourceUsage = await prisma.agentStep.aggregate({
            _sum: { cost: true, totalTokens: true }
        });

        // 4. Trend Data (Last 10 Test Runs)
        const recentRuns = await prisma.testRun.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { scenarios: true } }
            }
        });

        // 5. Recent Scenarios for Latency Trend
        const recentScenarios = await prisma.scenario.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                steps: {
                    select: { latencyMs: true, cost: true }
                }
            }
        });

        // Transform for Charting
        const latencyTrend = recentScenarios.map(s => ({
            date: s.createdAt.toISOString(),
            latency: s.steps.reduce((acc, step) => acc + step.latencyMs, 0),
            cost: s.steps.reduce((acc, step) => acc + step.cost, 0)
        })).reverse();

        return NextResponse.json({
            summary: {
                totalRuns,
                totalScenarios,
                totalEvals,
                avgScore: avgScore._avg.score || 0,
                totalCost: resourceUsage._sum.cost || 0,
                totalTokens: resourceUsage._sum.totalTokens || 0
            },
            latencyTrend,
            recentRuns
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
