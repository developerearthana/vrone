"use client"

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Logo } from '@/components/ui/logo';
import { useRouter } from 'next/navigation';
import { getRoleDashboardHref as getRoleRedirect } from '@/lib/dashboard-route';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        fetch('/api/health').catch(() => { /* ignore */ });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsPending(true);
        try {
            const result = await signIn('credentials', { email, password, redirect: false });
            if (result?.error) {
                setError('Invalid email or password.');
                return;
            }
            if (result?.ok) {
                const sessionRes = await fetch('/api/auth/session');
                const session = await sessionRes.json();
                window.location.href = getRoleRedirect(session?.user?.role || 'staff');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden p-4">

            {/* ── Abstract geological background art ── */}
            <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">

                {/* Top-right: large organic mineral blob */}
                <svg
                    className="absolute -right-24 -top-24 h-[580px] w-[580px] text-primary"
                    viewBox="0 0 400 400"
                    fill="currentColor"
                    fillOpacity="0.07"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M220,18 C270,5 345,48 368,118 C391,188 368,265 308,308 C248,351 162,356 105,308 C48,260 28,175 58,110 C88,45 130,5 180,8 Z" />
                </svg>
                {/* Second layer — outline ring on top of blob */}
                <svg
                    className="absolute -right-24 -top-24 h-[580px] w-[580px] text-primary"
                    viewBox="0 0 400 400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.10"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M200,40 C248,20 318,58 340,120 C362,182 344,252 290,292 C236,332 158,336 108,292 C58,248 44,170 72,112 C100,54 140,20 180,28 Z" />
                    <path d="M200,70 C240,52 298,84 316,138 C334,192 318,252 272,284 C226,316 158,320 116,284 C74,248 62,180 86,130 C110,80 148,52 178,58 Z" />
                </svg>

                {/* Bottom-left: concentric topographic rings */}
                <svg
                    className="absolute -bottom-16 -left-20 h-[480px] w-[480px] text-primary"
                    viewBox="0 0 300 300"
                    fill="none"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <ellipse cx="140" cy="200" rx="130" ry="90" strokeWidth="1.2" strokeOpacity="0.09" />
                    <ellipse cx="140" cy="200" rx="104" ry="72" strokeWidth="1.0" strokeOpacity="0.07" />
                    <ellipse cx="140" cy="200" rx="78"  ry="54" strokeWidth="0.8" strokeOpacity="0.055" />
                    <ellipse cx="140" cy="200" rx="52"  ry="36" strokeWidth="0.7" strokeOpacity="0.04" />
                    <ellipse cx="140" cy="200" rx="28"  ry="19" strokeWidth="0.6" strokeOpacity="0.03" />
                    <ellipse cx="140" cy="200" rx="12"  ry="8"  strokeWidth="0.5" strokeOpacity="0.025" />
                </svg>

                {/* Top-left: crystalline facet structure */}
                <svg
                    className="absolute -left-8 top-12 h-[260px] w-[260px] text-primary"
                    viewBox="0 0 200 200"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Outer hexagonal crystal */}
                    <polygon points="100,8 172,52 172,148 100,192 28,148 28,52"
                        strokeWidth="0.9" strokeOpacity="0.10" />
                    {/* Middle ring */}
                    <polygon points="100,30 154,64 154,136 100,170 46,136 46,64"
                        strokeWidth="0.75" strokeOpacity="0.08" />
                    {/* Inner ring */}
                    <polygon points="100,52 136,76 136,124 100,148 64,124 64,76"
                        strokeWidth="0.6" strokeOpacity="0.06" />
                    {/* Radial lines — crystal facets */}
                    <line x1="100" y1="8"   x2="100" y2="30"  strokeWidth="0.6" strokeOpacity="0.09" />
                    <line x1="172" y1="52"  x2="154" y2="64"  strokeWidth="0.6" strokeOpacity="0.09" />
                    <line x1="172" y1="148" x2="154" y2="136" strokeWidth="0.6" strokeOpacity="0.09" />
                    <line x1="100" y1="192" x2="100" y2="170" strokeWidth="0.6" strokeOpacity="0.09" />
                    <line x1="28"  y1="148" x2="46"  y2="136" strokeWidth="0.6" strokeOpacity="0.09" />
                    <line x1="28"  y1="52"  x2="46"  y2="64"  strokeWidth="0.6" strokeOpacity="0.09" />
                    {/* Cross lines through center */}
                    <line x1="100" y1="52" x2="154" y2="64"  strokeWidth="0.4" strokeOpacity="0.05" />
                    <line x1="100" y1="52" x2="46"  y2="64"  strokeWidth="0.4" strokeOpacity="0.05" />
                    <line x1="100" y1="148" x2="154" y2="136" strokeWidth="0.4" strokeOpacity="0.05" />
                    <line x1="100" y1="148" x2="46"  y2="136" strokeWidth="0.4" strokeOpacity="0.05" />
                </svg>

                {/* Bottom-right: scattered mineral fragments */}
                <svg
                    className="absolute bottom-8 right-12 h-[180px] w-[200px] text-primary"
                    viewBox="0 0 200 160"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <polygon points="40,20 70,10 80,35 55,48" strokeWidth="0.8" strokeOpacity="0.09" />
                    <polygon points="100,8  128,18  120,42 94,36"  strokeWidth="0.7" strokeOpacity="0.08" />
                    <polygon points="155,30 178,22 180,55 160,58" strokeWidth="0.7" strokeOpacity="0.07" />
                    <polygon points="20,70  50,60  58,90 30,96"  strokeWidth="0.6" strokeOpacity="0.07" />
                    <polygon points="80,80  108,68 115,95 88,104" strokeWidth="0.6" strokeOpacity="0.06" />
                    <polygon points="140,72 165,65 168,92 145,98" strokeWidth="0.6" strokeOpacity="0.06" />
                    <polygon points="45,118 68,110 74,138 50,144" strokeWidth="0.5" strokeOpacity="0.055" />
                    <polygon points="110,115 136,106 140,134 116,140" strokeWidth="0.5" strokeOpacity="0.05" />
                </svg>

                {/* Center: very faint large orbit ring for depth */}
                <svg
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[900px] w-[900px] text-primary"
                    viewBox="0 0 900 900"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeOpacity="0.025"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <ellipse cx="450" cy="450" rx="420" ry="300" />
                    <ellipse cx="450" cy="450" rx="330" ry="236" strokeOpacity="0.018" />
                </svg>
            </div>

            {/* ── Login card ── */}
            <div className="relative z-10 w-full max-w-[400px]">
                <div className="rounded-2xl border border-border bg-card/95 shadow-2xl shadow-foreground/5 backdrop-blur-sm p-8 space-y-7">

                    {/* Logo + heading */}
                    <div className="flex flex-col items-center gap-5">
                        <Logo variant="full" className="h-20 w-full max-w-[260px]" />
                        <p className="text-[13px] text-muted-foreground tracking-[0.02em]">
                            Sign in to your organisation's portal
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="block text-xs font-semibold text-foreground/70 uppercase tracking-[0.06em]">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                    className="block w-full rounded-lg border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-sm transition-all duration-150 focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="you@company.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="password" className="block text-xs font-semibold text-foreground/70 uppercase tracking-[0.06em]">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="block w-full rounded-lg border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-sm transition-all duration-150 focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="flex items-start gap-2.5 rounded-lg bg-destructive/8 border border-destructive/20 px-3.5 py-2.5"
                            >
                                <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5Zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
                                </svg>
                                <p className="text-[13px] text-destructive leading-tight">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="relative w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:brightness-110 hover:shadow-md hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] active:shadow-none"
                        >
                            {isPending ? (
                                <>
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                    Signing in…
                                </>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-[11px] text-muted-foreground/60">
                        Earthana Environmental Solutions Pvt. Ltd.
                    </p>
                </div>
            </div>
        </div>
    );
}
