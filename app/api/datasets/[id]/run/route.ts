import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createAgent } from '@/lib/prism';
import { evaluateScenarioResult } from '@/lib/evaluator';

export const maxDuration = 300; // Allow 5 minutes for batch runs

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: datasetId } = await params;
        const { agentConfigs, executionMode, modelTiering } = await req.json();

        // 1. Fetch Dataset & Cases
        const dataset = await prisma.dataset.findUnique({
            where: { id: datasetId },
            include: { cases: true }
        });

        if (!dataset || dataset.cases.length === 0) {
            return NextResponse.json({ error: 'Dataset empty or not found' }, { status: 400 });
        }

        // 2. Create Test Run Record
        const testRun = await prisma.testRun.create({
            data: {
                datasetId: dataset.id,
                status: 'running',
                configSnapshot: JSON.stringify({
                    agentConfigs,
                    executionMode,
                    modelTiering
                })
            }
        });

        // 3. Fetch Active Judges (for now, run all)
        const judges = await prisma.judge.findMany();

        // 4. Spawn Scenarios (Fire & Forget with Concurrency)
        (async () => {
            console.log(`🚀 Starting Test Run ${testRun.id} for ${dataset.cases.length} cases`);
            
            const BATCH_SIZE = 3;
            for (let i = 0; i < dataset.cases.length; i += BATCH_SIZE) {
                const chunk = dataset.cases.slice(i, i + BATCH_SIZE);
                
                await Promise.all(chunk.map(async (testCase) => {
                    try {
                        // Create Scenario linked to this TestRun
                        const scenario = await prisma.scenario.create({
                            data: {
                                name: `Test: ${testCase.prompt.substring(0, 40)}...`,
                                testRunId: testRun.id,
                                testCaseId: testCase.id
                            }
                        });

                        // Initialize Agent
                        const agent = createAgent({
                            agentConfigs,
                            executionMode,
                            modelTiering,
                            scenarioId: scenario.id
                        });

                        // Run the agent
                        const stream = agent.stream({
                            prompt: testCase.prompt,
                            chatHistory: []
                        });

                        for await (const _ of stream) {
                            // Persist happens automatically via Prism (now awaited)
                        }

                        // AUTO-EVALUATION
                        if (judges.length > 0) {
                            await Promise.all(judges.map(judge => 
                                evaluateScenarioResult(
                                    scenario.id, 
                                    judge.id, 
                                    testCase.prompt, 
                                    testCase.expectedOutput || undefined
                                )
                            ));
                        }

                    } catch (err) {
                        console.error(`❌ Failed case ${testCase.id}:`, err);
                    }
                }));
            }

            // Mark Run as Completed
            await prisma.testRun.update({
                where: { id: testRun.id },
                data: { status: 'completed', completedAt: new Date() }
            });
            console.log(`✅ Test Run ${testRun.id} completed.`);
        })();

        return NextResponse.json({ success: true, runId: testRun.id, message: 'Batch run started in background' });

    } catch (error: any) {
        console.error('Batch run error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
