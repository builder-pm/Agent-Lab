import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const judges = await prisma.judge.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(judges);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, type, config } = await req.json();
        
        if (!name || !type) {
            return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 });
        }

        const judge = await prisma.judge.create({
            data: { name, type, config }
        });

        return NextResponse.json(judge);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
