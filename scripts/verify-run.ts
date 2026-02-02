import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RUN_ID = 'cml4xs30h0001bws4joksqt0v';

async function main() {
    console.log(`🔎 Verifying Scenarios for Run: ${RUN_ID}`);
    const scenarios = await prisma.scenario.findMany({
        where: { testRunId: RUN_ID },
        include: { steps: true }
    });

    console.log(`✅ Found ${scenarios.length} scenarios.`);
    scenarios.forEach(s => {
        console.log(`   - [${s.id}] ${s.name} (${s.steps.length} steps)`);
    });
}

main()
    .finally(() => prisma.$disconnect());
