-- Run this in Supabase SQL Editor
-- Project: https://eeagdzfpdgteuujdcfwu.supabase.co

CREATE TABLE IF NOT EXISTS agent_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Query metadata
    scenario_id TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    
    -- Agent step data
    step_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    step_type TEXT NOT NULL,
    step_label TEXT,
    
    -- Content
    input_content TEXT,
    output_content TEXT,
    prompt_consumed TEXT,
    
    -- Token usage
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Performance
    latency_ms INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    
    -- Model info
    model_name TEXT,
    execution_mode TEXT,
    
    -- Handover
    handover_from TEXT,
    handover_reason TEXT
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_queries_scenario ON agent_queries(scenario_id);
CREATE INDEX IF NOT EXISTS idx_agent_queries_created ON agent_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_queries_agent ON agent_queries(agent);
