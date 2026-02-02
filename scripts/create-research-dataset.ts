import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const prisma = new PrismaClient();

const RESEARCH_DATASET = [
    {
        prompt: "Who is the current CEO of Nvidia and what was their most recent quarterly revenue?",
        expectedOutput: "Jensen Huang",
        assertions: JSON.stringify(["contains:Jensen Huang", "contains:billion"])
    },
    {
        prompt: "Find 3 peer-reviewed papers about the impact of microplastics on human health published in 2024.",
        expectedOutput: "List of 3 papers from 2024",
        assertions: JSON.stringify(["contains:2024", "count:3"])
    },
    {
        prompt: "Compare the battery life of the latest iPhone vs latest Samsung Galaxy. Cite your sources.",
        expectedOutput: "Comparison with citations",
        assertions: JSON.stringify(["contains:http", "contains:iPhone", "contains:Galaxy"])
    },
    {
        prompt: "Search for the current weather in Tokyo and suggest 3 indoor activities based on that.",
        expectedOutput: "Tokyo weather + 3 activities",
        assertions: JSON.stringify(["contains:Tokyo", "count:3"])
    },
    {
        prompt: "What are the top 5 trending AI news stories from the last 24 hours?",
        expectedOutput: "5 AI news stories",
        assertions: JSON.stringify(["count:5", "contains:AI"])
    }
];

async function main() {
    console.log('🌱 Creating Research Agent Benchmark Dataset...');

    const dataset = await prisma.dataset.create({
        data: {
            name: 'Research Agent Benchmark',
            description: 'A suite of multi-step retrieval and synthesis tasks for testing researcher agents.',
        }
    });

    console.log(`   ✅ Created Dataset: ${dataset.name} (${dataset.id})`);

    const cases = await prisma.testCase.createMany({
        data: RESEARCH_DATASET.map(c => ({
            datasetId: dataset.id,
            prompt: c.prompt,
            expectedOutput: c.expectedOutput,
            assertions: c.assertions
        }))
    });

    console.log(`   ✅ Added ${cases.count} test cases.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
