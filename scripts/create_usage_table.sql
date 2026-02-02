-- Create user_usage table for rate limiting
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id), -- Null for anonymous users
    ip_address TEXT,                        -- For anonymous tracking
    query_count INTEGER DEFAULT 0,
    last_query_at TIMESTAMPTZ DEFAULT now(),
    reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique record per user/ip per day
    CONSTRAINT unique_user_daily UNIQUE(user_id, reset_date),
    CONSTRAINT unique_ip_daily UNIQUE(ip_address, reset_date)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_usage_reset ON user_usage(reset_date);
CREATE INDEX IF NOT EXISTS idx_user_usage_user ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_ip ON user_usage(ip_address);

-- RLS (Row Level Security) - allow service role but protect from direct public access if needed
-- For now, we'll use the service role key from the API side to manage this.
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON user_usage
    USING (auth.jwt() ->> 'role' = 'service_role');
