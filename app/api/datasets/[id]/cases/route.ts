import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: datasetId } = await params;
        const { prompt, expectedOutput, assertions } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const testCase = await prisma.testCase.create({
            data: {
                datasetId,
                prompt,
                expectedOutput,
                assertions
            }
        });

        return NextResponse.json(testCase);
    } catch (error: any) {
        console.error('Create Case Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
