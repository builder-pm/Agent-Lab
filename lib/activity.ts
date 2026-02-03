import { supabase } from './supabase';

export type ActivityEventType = 'login' | 'auth_attempt' | 'logout' | 'query' | 'rate_limited';

interface LogActivityParams {
    userId?: string | null;
    ipAddress?: string;
    eventType: ActivityEventType;
    details?: Record<string, any>;
    status?: 'success' | 'failure';
    userAgent?: string;
}

export async function logActivity({
    userId = null,
    ipAddress,
    eventType,
    details = {},
    status = 'success',
    userAgent
}: LogActivityParams) {
    if (!supabase) return;

    try {
        await supabase
            .from('agentlab.user_activity')
            .insert({
                user_id: userId,
                ip_address: ipAddress,
                event_type: eventType,
                details,
                status,
                user_agent: userAgent
            });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
