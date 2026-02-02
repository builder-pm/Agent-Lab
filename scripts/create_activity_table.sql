-- Create user_activity table for auditing
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id), -- Null for anonymous
    ip_address TEXT,
    event_type TEXT NOT NULL,               -- 'login', 'auth_attempt', 'query', etc.
    details JSONB DEFAULT '{}'::jsonb,     -- Flexible metadata (e.g., query prompt, error msg)
    status TEXT DEFAULT 'success',          -- 'success', 'failure'
    user_agent TEXT
);

-- Indexing for analysis
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_event ON user_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at DESC);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON user_activity
    USING (auth.jwt() ->> 'role' = 'service_role');
