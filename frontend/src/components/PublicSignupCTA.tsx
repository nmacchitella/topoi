'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';

export default function PublicSignupCTA() {
    const { isAuthenticated } = useStore();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Show after a short delay to not be too aggressive
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (isAuthenticated || isDismissed || !isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slide-up">
            <div className="max-w-4xl mx-auto bg-dark-card border border-gray-700 rounded-xl shadow-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
                {/* Background gradient effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-600" />

                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold text-white mb-1">
                        Discover more with Topoi
                    </h3>
                    <p className="text-gray-400 text-sm">
                        Join to create your own collections, save places, and share with friends.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Link
                        href="/login"
                        className="flex-1 md:flex-none py-2.5 px-5 rounded-lg bg-dark-lighter hover:bg-gray-700 text-white font-medium transition-colors text-center border border-gray-600"
                    >
                        Log In
                    </Link>
                    <Link
                        href="/signup"
                        className="flex-1 md:flex-none py-2.5 px-5 rounded-lg bg-primary hover:bg-blue-600 text-white font-medium transition-colors text-center shadow-lg shadow-blue-900/20"
                    >
                        Sign Up
                    </Link>
                </div>

                <button
                    onClick={() => setIsDismissed(true)}
                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
                    aria-label="Close"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
