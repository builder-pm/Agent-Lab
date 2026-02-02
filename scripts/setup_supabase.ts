// Script to create agent_queries table in Supabase
// Run with: npx ts-node scripts/setup_supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eeagdzfpdgteuujdcfwu.supabase.co';
const supabaseKey = 'sb_secret_L_hFcHlFzwso-Vxj8XwrxQ_D7zE4YaT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
    console.log('Creating agent_queries table in Supabase...');

    // Try inserting a test record to check if table exists
    const { error: testError } = await supabase
        .from('agent_queries')
        .select('id')
        .limit(1);

    if (testError && testError.message.includes('does not exist')) {
        console.log('Table does not exist. Please run the following SQL in Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS agent_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    scenario_id TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    step_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    step_type TEXT NOT NULL,
    step_label TEXT,
    input_content TEXT,
    output_content TEXT,
    prompt_consumed TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    model_name TEXT,
    execution_mode TEXT,
    handover_from TEXT,
    handover_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_queries_scenario ON agent_queries(scenario_id);
CREATE INDEX IF NOT EXISTS idx_agent_queries_created ON agent_queries(created_at DESC);
        `);
        return;
    }

    if (testError) {
        console.error('Error checking table:', testError.message);
        return;
    }

    console.log('✅ agent_queries table already exists!');

    // Insert a test record
    const { error: insertError } = await supabase
        .from('agent_queries')
        .insert({
            scenario_id: 'test-setup',
            user_prompt: 'Setup test',
            step_id: 'test-001',
            agent: 'system',
            step_type: 'test',
            step_label: 'Setup Verification',
            input_tokens: 0,
            output_tokens: 0,
            latency_ms: 0,
            model_name: 'test',
            execution_mode: 'test'
        });

    if (insertError) {
        console.error('Error inserting test record:', insertError.message);
    } else {
        console.log('✅ Test record inserted successfully!');
    }
}

createTable().catch(console.error);
