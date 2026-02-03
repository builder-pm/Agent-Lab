"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase-client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isGuest: boolean;
    showLoginModal: boolean;
    showCreditExhausted: boolean;
    setShowLoginModal: (show: boolean) => void;
    setShowCreditExhausted: (show: boolean) => void;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showCreditExhausted, setShowCreditExhausted] = useState(false);

    useEffect(() => {
        // Get initial session
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            // Show login modal if no user and not already a guest
            if (!session?.user) {
                const wasGuest = localStorage.getItem('agent-lab-guest') === 'true';
                if (wasGuest) {
                    setIsGuest(true);
                } else {
                    setShowLoginModal(true);
                }
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            // Hide modals on successful auth
            if (session?.user) {
                setShowLoginModal(false);
                setShowCreditExhausted(false);
                setIsGuest(false);
                localStorage.removeItem('agent-lab-guest');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) throw error;
    };

    const signInWithEmail = async (email: string, password: string) => {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
    };

    const signUpWithEmail = async (email: string, password: string) => {
        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        setIsGuest(false);
        localStorage.removeItem('agent-lab-guest');
        setShowLoginModal(true);
    };

    const continueAsGuest = () => {
        setIsGuest(true);
        setShowLoginModal(false);
        localStorage.setItem('agent-lab-guest', 'true');
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            isLoading,
            isGuest,
            showLoginModal,
            showCreditExhausted,
            setShowLoginModal,
            setShowCreditExhausted,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            continueAsGuest
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
