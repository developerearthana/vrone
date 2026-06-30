"use client";

import { Users, ShieldAlert, Server, Activity, Cpu, ArrowUpRight, Bell, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAdminDashboardData } from '@/app/actions/admin';
import { getUpcomingAlerts } from '@/app/actions/activity/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ activeUsers: 0, securityAlerts: 0, systemHealth: '100%', serverLoad: '0%' });
    const [logs, setLogs] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [res, alertsRes] = await Promise.all([
                getAdminDashboardData(),
                getUpcomingAlerts(),
            ]);
            if (res.success && res.data) { setStats(res.data.stats); setLogs(res.data.logs); }
            if (alertsRes.success) setAlerts(alertsRes.data);
            setLoading(false);
        };
        load();
    }, []);

    const statCards = [
        { label: 'Active Users', value: stats.activeUsers.toString(), sub: 'Total registered', icon: Users, accent: 'text-sky-600 bg-sky-50' },
        { label: 'System Health', value: stats.systemHealth, sub: 'All systems nominal', icon: Activity, accent: 'text-emerald-600 bg-emerald-50' },
        { label: 'Server Load', value: stats.serverLoad, sub: 'Current utilisation', icon: Cpu, accent: 'text-primary bg-primary/8' },
        { label: 'Security Alerts', value: stats.securityAlerts.toString(), sub: stats.securityAlerts > 0 ? 'Requires attention' : 'All clear', icon: ShieldAlert, accent: stats.securityAlerts > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
    ];

    const quickLinks = [
        { href: '/admin/audit', icon: ShieldAlert, label: 'Audit & Compliance', desc: 'View system logs & security events', color: 'bg-teal-50 text-teal-600' },
        { href: '/admin/access-control', icon: Users, label: 'Access Control', desc: 'Manage roles, permissions and user access', color: 'bg-sky-50 text-sky-600' },
        { href: '/admin/security', icon: Server, label: 'Security Settings', desc: 'Configure IP rules and admin access', color: 'bg-primary/8 text-primary' },
    ];

    const parsePercent = (s: string) => Math.min(100, Math.max(0, parseInt(s) || 0));

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-bold text-foreground">System Overview</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Monitor system health, logs and administrative controls.</p>
            </div>

            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert: any) => (
                        <div key={alert._id || alert.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 p-4 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                                    <Bell className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-amber-900 text-sm">{alert.title}</p>
                                    <p className="text-amber-700 text-xs mt-0.5">
                                        {format(new Date(alert.start), 'HH:mm · MMM d')}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost" size="sm"
                                className="text-amber-700 hover:bg-amber-100 text-xs"
                                onClick={() => setAlerts(prev => prev.filter(a => (a._id || a.id) !== (alert._id || alert.id)))}
                            >
                                Dismiss
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ label, value, sub, icon: Icon, accent }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between h-28">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                            </div>
                            <div className={cn('p-2 rounded-lg', accent)}>
                                <Icon className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />{sub}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {quickLinks.map(({ href, icon: Icon, label, desc, color }) => (
                    <Link key={href} href={href} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-4 group">
                        <div className={cn('p-2.5 rounded-lg shrink-0', color)}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm">{label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto shrink-0 transition-colors" />
                    </Link>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-bold text-foreground mb-4">Recent System Logs</h3>
                    {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No recent logs.</p>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{log.event}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{log.time} · {log.user}</p>
                                    </div>
                                    <span className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-full ml-3 shrink-0',
                                        log.status === 'Success' ? 'bg-emerald-50 text-emerald-700' :
                                        log.status === 'Warning' ? 'bg-amber-50 text-amber-700' :
                                        'bg-sky-50 text-sky-700'
                                    )}>
                                        {log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-bold text-foreground mb-5 flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" /> Server Status
                    </h3>
                    <div className="space-y-5">
                        {[
                            { label: 'CPU Usage', value: parsePercent(stats.serverLoad), color: 'bg-sky-500' },
                            { label: 'Memory Usage', value: 62, color: 'bg-primary' },
                            { label: 'Storage Used', value: 28, color: 'bg-emerald-500' },
                        ].map(({ label, value, color }) => (
                            <div key={label}>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-muted-foreground text-xs">{label}</span>
                                    <span className="font-bold text-foreground text-xs">{value}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
