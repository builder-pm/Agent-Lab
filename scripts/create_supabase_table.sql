-- Run this in Supabase SQL Editor
-- Project: https://eeagdzfpdgteuujdcfwu.supabase.co

-- ==========================================
-- AGENT LAB SCHEMA SETUP
-- ==========================================

-- Create dedicated schema
CREATE SCHEMA IF NOT EXISTS agentlab;

-- ==========================================
-- TABLE 1: user_usage (Rate Limiting)
-- ==========================================
CREATE TABLE IF NOT EXISTS agentlab.user_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    query_count INTEGER DEFAULT 0,
    last_query_at TIMESTAMPTZ DEFAULT now(),
    reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_user_daily UNIQUE(user_id, reset_date),
    CONSTRAINT unique_ip_daily UNIQUE(ip_address, reset_date)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_reset ON agentlab.user_usage(reset_date);
CREATE INDEX IF NOT EXISTS idx_user_usage_user ON agentlab.user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_ip ON agentlab.user_usage(ip_address);

ALTER TABLE agentlab.user_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON agentlab.user_usage
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- TABLE 2: user_activity (Audit Logging)
-- ==========================================
CREATE TABLE IF NOT EXISTS agentlab.user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    event_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'success',
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON agentlab.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_event ON agentlab.user_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON agentlab.user_activity(created_at DESC);

ALTER TABLE agentlab.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON agentlab.user_activity
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- TABLE 3: agent_queries (Telemetry)
-- ==========================================
CREATE TABLE IF NOT EXISTS agentlab.agent_queries (
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

CREATE INDEX IF NOT EXISTS idx_agent_queries_scenario ON agentlab.agent_queries(scenario_id);
CREATE INDEX IF NOT EXISTS idx_agent_queries_created ON agentlab.agent_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_queries_agent ON agentlab.agent_queries(agent);

ALTER TABLE agentlab.agent_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON agentlab.agent_queries
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- Grant schema access to service role
-- ==========================================
GRANT USAGE ON SCHEMA agentlab TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA agentlab TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA agentlab TO service_role;
