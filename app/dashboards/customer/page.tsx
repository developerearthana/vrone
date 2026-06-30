"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getProjectStats, getProjects } from '@/app/actions/project';
import { Briefcase, CheckCircle2, Clock, Loader2, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function CustomerDashboard() {
    const { data: session } = useSession();
    const name = session?.user?.name || 'Client';
    const firstName = name.split(' ')[0];

    const [stats, setStats] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [statsRes, projectsRes] = await Promise.all([
                getProjectStats(),
                getProjects({}),
            ]);
            if (statsRes.success) setStats(statsRes.data);
            if (projectsRes.success) setProjects((projectsRes.data || []).slice(0, 4));
            setLoading(false);
        };
        load();
    }, []);

    const statCards = [
        { label: 'Total Projects', value: stats?.total ?? '—', icon: Briefcase, color: 'bg-sky-50 text-sky-600' },
        { label: 'In Progress', value: stats?.inProgress ?? '—', icon: Clock, color: 'bg-amber-50 text-amber-600' },
        { label: 'Completed', value: stats?.completed ?? '—', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Messages', value: '—', icon: MessageSquare, color: 'bg-primary/8 text-primary' },
    ];

    return (
        <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Welcome back, {firstName}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Track your project progress and communicate with the team.</p>
                </div>
                <Link
                    href="/activity/chat"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 w-fit"
                >
                    <MessageSquare className="w-4 h-4" /> Message Team
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="bg-card border border-border rounded-xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                    <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
                                </div>
                                <p className="text-2xl font-bold text-foreground">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="font-bold text-foreground">Your Projects</h3>
                            <Link href="/projects" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline">
                                View all <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                        {projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Briefcase className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-sm">No projects found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {projects.map((p: any) => {
                                    const progress = p.progress ?? 0;
                                    const statusColor =
                                        p.status === 'Completed' ? 'text-emerald-600 bg-emerald-50' :
                                        p.status === 'In Progress' ? 'text-sky-600 bg-sky-50' :
                                        'text-muted-foreground bg-muted';
                                    return (
                                        <div key={p._id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description || 'No description'}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex-1 bg-muted rounded-full h-1.5">
                                                    <div
                                                        className="bg-primary h-1.5 rounded-full transition-all"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-semibold text-foreground shrink-0">{progress}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-amber-900">Action Required</p>
                        <p className="text-xs text-amber-700 mt-1">
                            Please review and approve the latest stage updates from your project team.
                        </p>
                        <Link href="/projects" className="inline-block mt-3 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors">
                            Review Now
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
