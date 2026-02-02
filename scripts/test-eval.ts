import { PrismaClient } from '@prisma/client';
import { evaluateScenarioResult } from '../lib/evaluator';
import dotenv from 'dotenv';

// Load env vars from .env.local manually since we are running a script
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Starting Local Evaluation Test...');

    // 1. Create a Dummy Scenario & Step
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

    // 2. Create or get a Judge
    let judge = await prisma.judge.findFirst({ where: { type: 'LLM' } });
    if (!judge) {
        judge = await prisma.judge.create({
            data: {
                name: 'Default LLM Judge',
                type: 'LLM',
                config: 'You are an AI judge. Grade the answer on a scale of 0.0 to 1.0.'
            }
        });
    }
    console.log(`   ✅ Using Judge: ${judge.name}`);

    // 3. Run Evaluation
    console.log('   🚀 Triggering Evaluation...');
    const result = await evaluateScenarioResult(
        scenario.id,
        judge.id,
        'What is the capital of France?',
        'Paris is the capital of France'
    );

    if (result) {
        console.log('\n   ✅ Evaluation Successful!');
        console.log('   ----------------------------------------');
        console.log(`   🎯 Score:     ${result.score}`);
        console.log(`   🤔 Reasoning: ${result.reasoning}`);
        console.log('   ----------------------------------------');
    } else {
        console.error('   ❌ Evaluation returned null.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
