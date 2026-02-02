import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const datasets = await prisma.dataset.findMany({
            include: { 
                _count: { 
                    select: { cases: true, runs: true } 
                } 
            },
            orderBy: { updatedAt: 'desc' }
        });
        return NextResponse.json(datasets);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, cases } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const dataset = await prisma.dataset.create({
            data: {
                name,
                description,
                cases: {
                    create: (cases || []).map((c: any) => ({
                        prompt: c.prompt,
                        expectedOutput: c.expectedOutput,
                        assertions: c.assertions ? JSON.stringify(c.assertions) : null
                    }))
                }
            },
            include: { cases: true }
        });

        return NextResponse.json(dataset);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
