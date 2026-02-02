import { supabase } from './supabase';

const GUEST_LIMIT = 3;
const PRO_LIMIT = 15;

export async function checkRateLimit(userId: string | null, ipAddress: string) {
    if (!supabase) return { allowed: true, remaining: 999, limit: 999 };

    const today = new Date().toISOString().split('T')[0];
    const limit = userId ? PRO_LIMIT : GUEST_LIMIT;

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
        await supabase
            .from('user_usage')
            .update({
                query_count: data.query_count + 1,
                last_query_at: new Date().toISOString()
            })
            .eq('id', data.id);
    } else {
        await supabase
            .from('user_usage')
            .insert({
                user_id: userId,
                ip_address: ipAddress,
                query_count: 1,
                reset_date: today
            });
    }
}
