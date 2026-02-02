import { NextRequest } from 'next/server';
import { logActivity, ActivityEventType } from '@/lib/activity';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventType, userId, details, status } = body;

        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const userAgent = request.headers.get('user-agent') || undefined;

        await logActivity({
            userId,
            ipAddress: ip,
            eventType: eventType as ActivityEventType,
            details: details || {},
            status: status || 'success',
            userAgent
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: 'Failed to log activity' }, { status: 500 });
    }
}
