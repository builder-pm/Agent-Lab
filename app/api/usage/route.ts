import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Get user from auth header
        const authHeader = request.headers.get('Authorization');
        let userId: string | null = null;
        let userEmail: string | null = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
            userEmail = user?.email || null;
        }

        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const { remaining, limit } = await checkRateLimit(userId, ip, userEmail);

        return Response.json({ remaining, limit });
    } catch (error) {
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
