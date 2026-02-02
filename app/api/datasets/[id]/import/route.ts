import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { cases } = body; // Expects array of { prompt, expectedOutput }

        if (!cases || !Array.isArray(cases)) {
            return NextResponse.json({ error: 'Invalid format: cases array required' }, { status: 400 });
        }

        const created = await prisma.testCase.createMany({
            data: cases.map((c: any) => ({
                datasetId: id,
                prompt: c.prompt,
                expectedOutput: c.expectedOutput || '',
                assertions: c.assertions ? JSON.stringify(c.assertions) : null
            }))
        });

        return NextResponse.json({ success: true, count: created.count });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
