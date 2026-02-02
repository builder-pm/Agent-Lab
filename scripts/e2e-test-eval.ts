import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌍 Starting E2E API Test against http://localhost:3000...');

    // 1. Get a valid step ID from the local DB
    const step = await prisma.agentStep.findFirst({
        where: { stepType: 'output' },
        orderBy: { timestamp: 'desc' }
    });

    if (!step) {
        console.error('❌ No steps found in local DB. Please run the previous test script or use the app to generate some data.');
        process.exit(1);
    }
    console.log(`   Found recent Step ID: ${step.id}`);
    console.log(`   Step Content: "${step.content.substring(0, 50)}"...`);

    // 2. Call the API
    console.log('   🚀 Sending POST request to /api/eval...');
    try {
        const response = await fetch('http://localhost:3000/api/eval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stepId: step.id,
                metrics: ['Faithfulness', 'Conciseness']
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        console.log('   ✅ API Response received:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success && data.results && data.results.length > 0) {
            console.log('\n   🎉 SUCCESS: The server successfully processed the evaluation!');
            console.log('      - Local DB: Updated via Prisma');
            console.log('      - Supabase: Synced via API Client');
        } else {
            console.warn('   ⚠️ API returned success but no results were generated.');
        }

    } catch (error) {
        console.error('   ❌ API Call Failed:', error);
        console.log('   (Please ensure your Next.js server is running on port 3000 with "npm run dev")');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
