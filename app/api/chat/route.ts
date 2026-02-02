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
