
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

async function testReasoning() {
    console.log('Testing model reasoning...');
    const modelName = 'meta-llama/llama-3.3-70b-instruct:free'; // Or whatever model is being used
    console.log(`Model: ${modelName}`);

    try {
        const { text, usage } = await generateText({
            model: openrouter.chat(modelName),
            messages: [
                { role: 'system', content: 'You are a helpful assistant. Think step-by-step before answering. Use <think> tags for your reasoning.' },
                { role: 'user', content: 'Why is the sky blue?' }
            ]
        });

        console.log('\n--- Output ---');
        console.log(text);
        console.log('\n--- Usage ---');
        console.log(usage);

        const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
            console.log('\n✅ <think> tags found!');
            console.log(thinkMatch[1]);
        } else {
            console.log('\n❌ No <think> tags found in output.');
        }

    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

testReasoning();
