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
        .from('agentlab.agent_queries')
        .select('id')
        .limit(1);

    if (testError && testError.message.includes('does not exist')) {
        console.log('Schema or table does not exist. Please run the consolidation SQL script in scripts/create_supabase_table.sql');
        return;
    }

    if (testError) {
        console.error('Error checking table:', testError.message);
        return;
    }

    console.log('✅ agentlab.agent_queries table exists!');

    // Insert a test record
    const { error: insertError } = await supabase
        .from('agentlab.agent_queries')
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
