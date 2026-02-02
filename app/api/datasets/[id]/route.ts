import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const dataset = await prisma.dataset.findUnique({
            where: { id },
            include: { 
                cases: {
                    include: {
                        scenarios: {
                            take: 2,
                            orderBy: { createdAt: 'desc' },
                            include: { evaluations: true }
                        }
                    }
                }, 
                runs: { orderBy: { createdAt: 'desc' } } 
            }
        });

        if (!dataset) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });

        return NextResponse.json(dataset);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.dataset.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
