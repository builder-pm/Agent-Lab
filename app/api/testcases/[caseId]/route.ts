import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId } = await params;
        const { prompt, expectedOutput, assertions } = await req.json();

        const testCase = await prisma.testCase.update({
            where: { id: caseId },
            data: {
                prompt,
                expectedOutput,
                assertions
            }
        });

        return NextResponse.json(testCase);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
    try {
        const { caseId } = await params;
        await prisma.testCase.delete({
            where: { id: caseId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
