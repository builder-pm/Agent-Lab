import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const scenario = await prisma.scenario.findUnique({
            where: { id },
            include: { 
                steps: { orderBy: { timestamp: 'asc' } },
                evaluations: { include: { metric: true } }
            }
        });

        if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });

        // Serialize BigInts
        const serialized = JSON.parse(JSON.stringify(scenario, (key, value) =>
            typeof value === 'bigint' ? Number(value) : value
        ));

        return NextResponse.json(serialized);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
