"use client";

import React, { useState } from 'react';
import { useAuth } from '../_context/AuthContext';
import { X, Mail, Lock, User, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGuestContinue: () => void;
}

export function LoginModal({ isOpen, onClose, onGuestContinue }: LoginModalProps) {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, isLoading } = useAuth();
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (mode === 'signin') {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleAuth = async () => {
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-zinc-950 border-2 border-zinc-800 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-zinc-800">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center rounded">
                            <Sparkles size={20} className="text-black" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-space-grotesk text-white">Welcome to Agent Lab</h2>
                            <p className="text-xs text-zinc-400">Sign in to unlock 15 daily queries</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Error Display */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleAuth}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black font-bold text-sm border-2 border-black hover:bg-zinc-100 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-zinc-950 text-zinc-500 uppercase tracking-wider">or</span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-3">
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border-2 border-zinc-700 text-white placeholder-zinc-500 text-sm focus:border-primary focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                minLength={6}
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border-2 border-zinc-700 text-white placeholder-zinc-500 text-sm focus:border-primary focus:outline-none transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-black font-bold text-sm border-2 border-black hover:bg-primary/90 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                            <ChevronRight size={16} />
                        </button>
                    </form>

                    {/* Toggle Sign In / Sign Up */}
                    <p className="text-center text-sm text-zinc-400">
                        {mode === 'signin' ? (
                            <>
                                Don't have an account?{' '}
                                <button
                                    onClick={() => setMode('signup')}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    onClick={() => setMode('signin')}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </div>

                {/* Guest Footer */}
                <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800">
                    <button
                        onClick={onGuestContinue}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors group"
                    >
                        <User size={16} />
                        Continue as Guest
                        <span className="text-xs text-zinc-500 group-hover:text-zinc-400">(3 free queries)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
