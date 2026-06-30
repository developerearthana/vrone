"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[App Error]", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="bg-card border border-border rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {error.message || "An unexpected error occurred on this page."}
                    </p>
                    {error.digest && (
                        <p className="text-[11px] text-muted-foreground/60 mt-2 font-mono">ID: {error.digest}</p>
                    )}
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Try again
                    </button>
                    <a
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground text-sm font-semibold rounded-lg hover:bg-muted transition-colors"
                    >
                        <Home className="w-4 h-4" /> Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}
