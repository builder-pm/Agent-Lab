"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../_context/AuthContext';
import { supabaseClient } from '@/lib/supabase-client';
import { LogIn, LogOut, User as UserIcon, Shield } from 'lucide-react';

export function AuthButton() {
    const { user, signInWithGoogle, signOut, isLoading } = useAuth();
    const [usage, setUsage] = useState<{ remaining: number; limit: number } | null>(null);

    // Fetch usage info (we'll implement an endpoint for this)
    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const { data: { session: currentSession } } = await supabaseClient.auth.getSession();

                const headers: HeadersInit = {};
                if (currentSession?.access_token) {
                    headers['Authorization'] = `Bearer ${currentSession.access_token}`;
                }

                const res = await fetch('/api/usage', { headers });
                if (res.ok) {
                    const data = await res.json();
                    setUsage(data);
                }
            } catch (err) {
                console.error('Failed to fetch usage:', err);
            }
        };

        fetchUsage();
        // Refresh usage info every minute or on state change
        const interval = setInterval(fetchUsage, 60000);
        return () => clearInterval(interval);
    }, [user]);

    if (isLoading) {
        return (
            <div className="h-8 w-24 bg-muted animate-pulse rounded border-2 border-border" />
        );
    }

    if (!user) {
        return (
            <div className="flex items-center gap-4">
                {usage && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-700/50 rounded text-[10px] font-mono">
                        <Shield size={10} className="text-zinc-400" />
                        <span className="text-zinc-400">GUEST:</span>
                        <span className={usage.remaining === 0 ? 'text-red-400' : 'text-primary'}>
                            {usage.remaining}/{usage.limit}
                        </span>
                    </div>
                )}
                <button
                    onClick={signInWithGoogle}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-black font-bold text-xs border-2 border-black hover:bg-zinc-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                >
                    <LogIn size={14} /> SIGN IN
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            {usage && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-mono">
                    <Shield size={10} className="text-primary" />
                    <span className="text-zinc-400">PRO:</span>
                    <span className={usage.remaining === 0 ? 'text-red-400' : 'text-primary'}>
                        {usage.remaining}/{usage.limit}
                    </span>
                </div>
            )}
            <div className="flex items-center gap-3 pl-3 border-l-2 border-border">
                <div className="flex items-center gap-2">
                    {user.user_metadata.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt={user.email || ''}
                            className="w-6 h-6 rounded-full border border-border"
                        />
                    ) : (
                        <div className="w-6 h-6 bg-primary flex items-center justify-center rounded-full text-black">
                            <UserIcon size={14} />
                        </div>
                    )}
                    <span className="text-[11px] font-bold font-space-mono hidden sm:inline">
                        {user.email?.split('@')[0].toUpperCase()}
                    </span>
                </div>
                <button
                    onClick={signOut}
                    className="p-1.5 hover:bg-muted rounded transition-colors text-zinc-400 hover:text-primary"
                    title="Sign Out"
                >
                    <LogOut size={14} />
                </button>
            </div>
        </div>
    );
}
