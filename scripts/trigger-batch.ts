
const DATASET_ID = 'cml4xp7j60000bw1g4wfwgwks'; // From previous step
const API_URL = 'http://localhost:3000/api/datasets';

const MOCK_AGENT_CONFIG = {
    executionMode: 'linear',
    modelTiering: false,
    agentConfigs: {
        planner: { selectedModel: 'nvidia/nemotron-nano-9b-v2:free' },
        researcher: { selectedModel: 'nvidia/nemotron-nano-9b-v2:free' },
        analyst: { selectedModel: 'nvidia/nemotron-nano-9b-v2:free' },
        synthesizer: { selectedModel: 'nvidia/nemotron-nano-9b-v2:free' },
    }
};

async function main() {
    console.log(`🚀 Triggering Batch Run for Dataset: ${DATASET_ID}`);

    try {
        // Note: In a real script we might look up the ID dynamically, but we'll use the one we just created.
        const response = await fetch(`${API_URL}/${DATASET_ID}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(MOCK_AGENT_CONFIG)
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        console.log('✅ Batch Run Started Successfully!');
        console.log('--------------------------------------------------');
        console.log(`🆔 Run ID:   ${data.runId}`);
        console.log(`📢 Message:  ${data.message}`);
        console.log('--------------------------------------------------');
        console.log('⏳ The agents are now running in the background on the server.');
        console.log('   Check the "Scenarios" table or the App UI to see them appear.');

    } catch (error) {
        console.error('❌ Failed to trigger batch run:', error);
    }
}

main();
