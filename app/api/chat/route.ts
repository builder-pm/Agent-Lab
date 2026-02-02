import { NextRequest } from 'next/server';
import { createAgent } from '@/lib/prism';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const messages = body.messages || [];
        const userMessage = messages[messages.length - 1]?.content || '';
        const model = body.model || 'meta-llama/llama-3.3-70b-instruct:free';

        // --- Rate Limiting Logic ---
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

        // Get user from auth header if present
        const authHeader = request.headers.get('Authorization');
        let userId: string | null = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            // We need a server-side supabase client here to verify the token
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
        }

        const { checkRateLimit, incrementUsage } = await import('@/lib/rate-limit');
        const { logActivity } = await import('@/lib/activity');
        const { allowed, remaining, limit } = await checkRateLimit(userId, ip);

        if (!allowed) {
            await logActivity({
                userId,
                ipAddress: ip,
                eventType: 'rate_limited',
                status: 'failure',
                details: { limit, remaining, model, prompt: userMessage.slice(0, 100) },
                userAgent: request.headers.get('user-agent') || undefined
            });

            return new Response(JSON.stringify({
                error: 'Rate limit exceeded',
                remaining,
                limit,
                message: userId
                    ? 'You have reached your daily limit of 15 queries. Please try again tomorrow.'
                    : 'Anonymous users are limited to 3 queries per day. Sign in with Google for 15 queries!'
            }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // --- End Rate Limiting Logic ---

        // Log the query attempt (start)
        await logActivity({
            userId,
            ipAddress: ip,
            eventType: 'query',
            details: { model, prompt: userMessage.slice(0, 100) },
            userAgent: request.headers.get('user-agent') || undefined
        });

        if (!userMessage) {
            return new Response(JSON.stringify({ error: 'No prompt provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const agentConfigs = body.agentConfigs || {};
        const executionMode = body.executionMode || 'linear';
        const modelTiering = body.modelTiering || false;

        // Create the agent with the selected model
        const agent = createAgent({
            name: 'AgentLab Demo',
            description: 'An educational AI agent for demonstrating agentic workflows.',
            agentConfigs: agentConfigs,
            executionMode: executionMode,
            modelTiering: modelTiering,
        });

        // Create a readable stream for the response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // Record the query usage
                    await incrementUsage(userId, ip);

                    // Stream events from the agent
                    for await (const event of agent.stream({
                        prompt: userMessage,
                        chatHistory: messages.slice(0, -1)
                    })) {
                        // Send each event as a newline-delimited JSON
                        const data = JSON.stringify(event) + '\n';
                        controller.enqueue(encoder.encode(data));
                    }
                } catch (error) {
                    console.error('Agent stream error:', error);
                    const errorEvent = JSON.stringify({
                        type: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    }) + '\n';
                    controller.enqueue(encoder.encode(errorEvent));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
