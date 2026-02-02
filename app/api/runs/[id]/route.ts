import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: runId } = await params;

        const run = await prisma.testRun.findUnique({
            where: { id: runId },
            include: {
                _count: {
                    select: { scenarios: true }
                },
                dataset: {
                    include: {
                        _count: {
                            select: { cases: true }
                        }
                    }
                }
            }
        });

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        const completed = run._count.scenarios;
        const total = run.dataset._count.cases;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

        return NextResponse.json({
            id: run.id,
            status: run.status,
            completed,
            total,
            progress
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
