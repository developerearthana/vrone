"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { format, isPast, isValid } from 'date-fns';
import { Target, TrendingUp, CheckCircle2, Clock, XCircle, Loader2, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllKPIAssignments, getMyKPIAssignments } from '@/app/actions/kpi-assignments';
import { CATEGORY_CONFIG, KPICategory } from '@/lib/kpi-library';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ALL_CATEGORIES: KPICategory[] = ['Financial', 'HR', 'Operations', 'Sales', 'Customer', 'Quality', 'Growth'];

const STATUS_STYLE: Record<string, string> = {
    'Not Started': 'bg-gray-100 text-gray-700 border-gray-200',
    'In Progress':  'bg-blue-50 text-blue-700 border-blue-200',
    'Completed':    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Missed':       'bg-red-50 text-red-700 border-red-200',
};

function progressColor(pct: number) {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-amber-400';
    return 'bg-red-500';
}

function isAdminOrManager(role?: string | null) {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'admin' || r === 'super-admin' || r === 'manager' || r === 'hr';
}

export default function KPIDashboardPage() {
    const { data: session } = useSession();
    const [kpis, setKpis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<KPICategory | 'All'>('All');
    const [entityFilter, setEntityFilter] = useState<'All' | 'Team' | 'Individual'>('All');

    const isAdmin = isAdminOrManager(session?.user?.role);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = isAdmin
                ? await getAllKPIAssignments()
                : await getMyKPIAssignments();
            if (res.success) setKpis(res.data || []);
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => { load(); }, [load]);

    const filtered = kpis.filter(k => {
        const catOk = categoryFilter === 'All' || k.category === categoryFilter;
        const entityOk = entityFilter === 'All'
            || (entityFilter === 'Team' && k.assignedToTeam)
            || (entityFilter === 'Individual' && k.assignedToUser && !k.assignedToTeam);
        return catOk && entityOk;
    });

    const stats = {
        total:     kpis.length,
        onTrack:   kpis.filter(k => k.progress >= 80 && k.status !== 'Missed').length,
        atRisk:    kpis.filter(k => k.progress >= 50 && k.progress < 80 && k.status !== 'Completed').length,
        completed: kpis.filter(k => k.status === 'Completed').length,
        missed:    kpis.filter(k => k.status === 'Missed' || (k.status !== 'Completed' && k.dueDate && isPast(new Date(k.dueDate)))).length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Target className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">KPI Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin ? 'Organisation-wide KPI performance' : 'Your KPI performance'}
                    </p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total',     value: stats.total,     icon: Target,       cls: 'text-gray-700 bg-gray-50 border-gray-200' },
                    { label: 'On Track',  value: stats.onTrack,   icon: TrendingUp,   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { label: 'At Risk',   value: stats.atRisk,    icon: Clock,        cls: 'text-amber-700 bg-amber-50 border-amber-200' },
                    { label: 'Completed', value: stats.completed, icon: CheckCircle2, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
                    { label: 'Missed',    value: stats.missed,    icon: XCircle,      cls: 'text-red-700 bg-red-50 border-red-200' },
                ].map(s => (
                    <div key={s.label} className={cn('rounded-xl border p-4 flex items-center gap-3', s.cls)}>
                        <s.icon className="w-5 h-5 shrink-0" />
                        <div>
                            <p className="text-2xl font-bold leading-none">{s.value}</p>
                            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-card border border-border rounded-xl px-4 py-3">
                {/* Category chips */}
                <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Category</span>
                    <button
                        onClick={() => setCategoryFilter('All')}
                        className={cn('px-3 py-1 text-xs font-bold rounded-lg border transition-all',
                            categoryFilter === 'All' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'
                        )}>All</button>
                    {ALL_CATEGORIES.map(cat => {
                        const cfg = CATEGORY_CONFIG[cat];
                        const active = categoryFilter === cat;
                        return (
                            <button key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={cn(
                                    'px-3 py-1 text-xs font-bold rounded-lg border transition-all',
                                    active ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'border-border text-muted-foreground hover:bg-muted'
                                )}>
                                {cfg.icon} {cat}
                            </button>
                        );
                    })}
                </div>

                {/* Entity filter */}
                <div className="flex gap-1.5 items-center ml-auto">
                    <span className="text-xs font-bold text-muted-foreground uppercase mr-1">View</span>
                    {(['All', 'Individual', 'Team'] as const).map(e => (
                        <button key={e}
                            onClick={() => setEntityFilter(e)}
                            className={cn('px-3 py-1 text-xs font-bold rounded-lg border transition-all',
                                entityFilter === e ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'
                            )}>{e}</button>
                    ))}
                </div>
            </div>

            {/* KPI List */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl text-muted-foreground gap-3">
                    <Target className="w-10 h-10 opacity-20" />
                    <p className="font-semibold">No KPIs found</p>
                    <p className="text-sm">Adjust filters or assign KPIs from the Assign tab.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(kpi => {
                        const pct = Math.round(kpi.progress || 0);
                        const catCfg = kpi.category ? CATEGORY_CONFIG[kpi.category as KPICategory] : null;
                        const assignee = kpi.assignedToTeam || kpi.assignedToUser;
                        const isTeam = !!kpi.assignedToTeam;
                        const overdue = kpi.status !== 'Completed' && kpi.dueDate && isValid(new Date(kpi.dueDate)) && isPast(new Date(kpi.dueDate));

                        return (
                            <div key={kpi._id}
                                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                    {/* Assignee avatar */}
                                    <div className="shrink-0">
                                        {isTeam ? (
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-indigo-600" />
                                            </div>
                                        ) : (
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={kpi.assignedToUser?.image} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                    {(kpi.assignedToUser?.name || 'U').substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="font-bold text-sm text-foreground truncate">{kpi.title}</h3>
                                            {catCfg && (
                                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', catCfg.bg, catCfg.color, catCfg.border)}>
                                                    {catCfg.icon} {catCfg.label}
                                                </span>
                                            )}
                                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_STYLE[kpi.status])}>
                                                {kpi.status}
                                            </span>
                                            {overdue && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                                    Overdue
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground mb-2">
                                            {kpi.metric} &middot; {kpi.frequency} &middot;{' '}
                                            {isTeam ? (
                                                <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {assignee?.name}</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {assignee?.name}</span>
                                            )}
                                            {kpi.dueDate && (
                                                <> &middot; Due <span className={cn(overdue ? 'text-red-600 font-semibold' : '')}>
                                                    {format(new Date(kpi.dueDate), 'dd MMM yyyy')}
                                                </span></>
                                            )}
                                        </p>

                                        {/* Progress bar */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-muted rounded-full h-1.5">
                                                <div
                                                    className={cn('h-1.5 rounded-full transition-all', progressColor(pct))}
                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-foreground w-10 text-right shrink-0">
                                                {pct}%
                                            </span>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {kpi.actual} / {kpi.target} {kpi.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
