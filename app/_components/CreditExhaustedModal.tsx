"use client";

import React from 'react';
import { Clock, LogIn, Sparkles } from 'lucide-react';

interface CreditExhaustedModalProps {
    isOpen: boolean;
    onSignIn: () => void;
    onClose: () => void;
}

export function CreditExhaustedModal({ isOpen, onSignIn, onClose }: CreditExhaustedModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm mx-4 bg-zinc-950 border-2 border-zinc-800 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="p-6 text-center border-b border-zinc-800">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30 rounded-full flex items-center justify-center">
                        <Clock size={32} className="text-orange-400" />
                    </div>
                    <h2 className="text-xl font-bold font-space-grotesk text-white mb-2">
                        Daily Limit Reached
                    </h2>
                    <p className="text-sm text-zinc-400">
                        You've used all 3 guest queries for today.
                    </p>
                </div>

                {/* Options */}
                <div className="p-6 space-y-3">
                    {/* Sign In Option */}
                    <button
                        onClick={onSignIn}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary text-black font-bold text-sm border-2 border-black hover:bg-primary/90 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <LogIn size={18} />
                        Sign In for 15 Daily Queries
                    </button>

                    {/* Come Back Tomorrow */}
                    <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-zinc-400 hover:text-white text-sm font-medium transition-colors border border-zinc-700 hover:border-zinc-600"
                    >
                        <Clock size={16} />
                        Come Back Tomorrow
                    </button>
                </div>

                {/* Pro Tip */}
                <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800">
                    <div className="flex items-start gap-2 text-xs text-zinc-500">
                        <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                        <p>
                            <span className="text-primary font-medium">Pro tip:</span> Sign in with Google or Email to unlock 15 queries daily — completely free!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
