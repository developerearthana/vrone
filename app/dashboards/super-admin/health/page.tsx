"use client";

import { useEffect, useState, useCallback } from 'react';
import { Database, Clock, Users, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { getSystemHealth } from '@/app/actions/admin';
import { format } from 'date-fns';

interface HealthData {
    db: { state: string; latencyMs: number };
    uptimeSeconds: number;
    nodeVersion: string;
    env: string;
    totalUsers: number;
    activeUsers: number;
    recentAuditCount: number;
    checkedAt: string;
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export default function SystemHealthPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await getSystemHealth();
        if (res.success && res.data) {
            setData(res.data as HealthData);
        } else {
            setError(res.error || 'Failed to load system health');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const dbHealthy = data?.db.state === 'connected';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-foreground">System Health</h1>
                    <p className="text-xs text-muted-foreground">
                        {data ? `Last checked ${format(new Date(data.checkedAt), 'HH:mm:ss')}` : 'Checking live status…'}
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                    {error}
                </div>
            )}

            {loading && !data ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2.5 rounded-xl ${dbHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Database</p>
                                <h3 className="text-lg font-bold text-foreground capitalize">{data.db.state}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{data.db.latencyMs}ms round-trip</p>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl"><Clock className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">Server Uptime</p>
                                <h3 className="text-lg font-bold text-foreground">{formatUptime(data.uptimeSeconds)}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Node {data.nodeVersion} · {data.env}</p>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl"><Users className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">Users</p>
                                <h3 className="text-lg font-bold text-foreground">{data.activeUsers} / {data.totalUsers}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">active of total</p>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><ShieldCheck className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">Audit Activity</p>
                                <h3 className="text-lg font-bold text-foreground">{data.recentAuditCount}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">events in last 24h</p>
                    </div>
                </div>
            )}
        </div>
    );
}
