"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Log activity via API
                fetch('/api/activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventType: 'login',
                        userId: session.user.id
                    })
                });
                router.push('/');
            } else if (session) {
                router.push('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-background text-foreground font-space-mono">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-bold animate-pulse">AUTHENTICATING...</p>
        </div>
    );
}
