import { supabase } from './supabase';

const GUEST_LIMIT = 3;
const PRO_LIMIT = 15;
const MASTER_LIMIT = 1000;

// Demo account email (stored in env for security)
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@agentlab.pro';

export async function checkRateLimit(userId: string | null, ipAddress: string, userEmail?: string | null) {
    if (!supabase) return { allowed: true, remaining: 999, limit: 999 };

    const today = new Date().toISOString().split('T')[0];

    // Determine limit based on user type
    let limit = GUEST_LIMIT;
    if (userId) {
        // Check if this is the master demo account
        const isMaster = userEmail && userEmail.toLowerCase() === DEMO_EMAIL.toLowerCase();

        // Debugging logs to help identify why demo account might fail
        if (userEmail) {
            console.log(`[Rate Limit] User ID: ${userId}, Email: ${userEmail}, Demo Email: ${DEMO_EMAIL}, Match: ${isMaster}`);
        }

        if (isMaster) {
            limit = MASTER_LIMIT;
        } else {
            limit = PRO_LIMIT;
        }
    }

    // Try to find existing usage record for today
    let query = supabase
        .from('user_usage')
        .select('query_count')
        .eq('reset_date', today);

    if (userId) {
        query = query.eq('user_id', userId);
    } else {
        query = query.eq('ip_address', ipAddress);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Database error checking rate limit:', error);
        return { allowed: true, remaining: 0, limit }; // Fail open but log
    }

    const currentCount = data?.query_count || 0;
    const remaining = Math.max(0, limit - currentCount);

    return {
        allowed: remaining > 0,
        remaining,
        limit,
        currentCount
    };
}

export async function incrementUsage(userId: string | null, ipAddress: string) {
    if (!supabase) return;

    const today = new Date().toISOString().split('T')[0];

    // Use an upsert-like logic
    // Supabase doesn't have a simple atomic increment in a single call without RPC
    // So we'll use a simple approach for now, assuming low concurrency

    let query = supabase
        .from('user_usage')
        .select('id, query_count')
        .eq('reset_date', today);

    if (userId) {
        query = query.eq('user_id', userId);
    } else {
        query = query.eq('ip_address', ipAddress);
    }

    const { data } = await query.single();

    if (data) {
        const { error } = await supabase
            .from('user_usage')
            .update({
                query_count: data.query_count + 1,
                last_query_at: new Date().toISOString()
            })
            .eq('id', data.id);
        if (error) console.error("RateLimit Update Error:", error);
    } else {
        const { error } = await supabase
            .from('user_usage')
            .insert({
                user_id: userId,
                ip_address: ipAddress,
                query_count: 1,
                reset_date: today
            });
        if (error) console.error("RateLimit Insert Error:", error);
    }
}
