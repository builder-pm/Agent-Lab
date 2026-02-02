import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const scenarios = await prisma.scenario.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { steps: true }
                }
            }
        });
        return NextResponse.json(scenarios);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
