import { PrismaClient } from '@prisma/client';
import { evaluateStep, seedEvalPrerequisites } from '../lib/evaluator';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars from .env.local manually since we are running a script
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Starting Local Evaluation Test...');

    // 1. Seed Metrics
    console.log('   Seeding metrics...');
    await seedEvalPrerequisites();

    // 2. Create a Dummy Scenario & Step
    console.log('   Creating mock scenario...');
    const scenario = await prisma.scenario.create({
        data: {
            name: 'Test Scenario ' + Date.now(),
        }
    });

    const step = await prisma.agentStep.create({
        data: {
            scenarioId: scenario.id,
            agent: 'researcher',
            stepLabel: 'Test Step',
            stepType: 'output',
            content: 'The capital of France is Paris. It is known for the Eiffel Tower.',
            promptConsumed: 'What is the capital of France?',
            timestamp: BigInt(Date.now()),
        }
    });
    console.log(`   ✅ Created Step ID: ${step.id}`);

    // 3. Run Evaluation
    console.log('   🚀 Triggering Evaluation (Faithfulness)...');
    const result = await evaluateStep(step.id, 'Faithfulness');

    if (result) {
        console.log('\n   ✅ Evaluation Successful!');
        console.log('   ----------------------------------------');
        console.log(`   🎯 Score:     ${result.score}`);
        console.log(`   🤔 Reasoning: ${result.reasoning}`);
        console.log('   ----------------------------------------');
        console.log('   (Check your Supabase "evaluation_results" table to see if it appeared there!)');
    } else {
        console.error('   ❌ Evaluation returned null.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
