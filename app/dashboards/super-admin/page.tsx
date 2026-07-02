"use client";

import {
    Users, DollarSign, ArrowUpRight, AlertTriangle, Download,
    Clock, CheckCircle2, XCircle, LogIn, LogOut, Loader2,
    CalendarDays, Home, Briefcase, Plane, FileText, Target,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { getLiveUsers, punchIn, punchOut, getAttendance } from "@/app/actions/hrm";
import { getAllHRMRequests, updateHRMRequestStatus, getPendingRequestsSummary } from "@/app/actions/hrm-requests";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import type { HRMRequestCategory } from "@/models/HRMRequest";
import { getAllKPIAssignments } from "@/app/actions/kpi-assignments";
import { getAdminDashboardData } from "@/app/actions/admin";
import { getFinancialSummary } from "@/app/actions/banking";

const KPITrackingGrid = dynamic(
    () => import('@/components/kpi/KPITrackingGrid').then(m => ({ default: m.KPITrackingGrid })),
    { ssr: false }
);

export default function SuperAdminDashboard() {
    const [liveUsers, setLiveUsers] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [requestSummary, setRequestSummary] = useState<Record<string, number>>({});
    const [totalPending, setTotalPending] = useState(0);
    const [loadingLive, setLoadingLive] = useState(true);
    const [kpis, setKpis] = useState<any[]>([]);
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [punchTime, setPunchTime] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [decidingId, setDecidingId] = useState<string | null>(null);
    const [activeCatFilter, setActiveCatFilter] = useState<HRMRequestCategory | 'All'>('All');
    const [activeUserCount, setActiveUserCount] = useState<number | null>(null);
    const [monthlyRevenue, setMonthlyRevenue] = useState<number | null>(null);

    const loadKPIs = useCallback(async () => {
        const res = await getAllKPIAssignments();
        if (res.success) setKpis(res.data || []);
    }, []);

    const handlePunch = async () => {
        setActionLoading(true);
        try {
            if (!isPunchedIn) {
                const res = await punchIn();
                if (res.success) { setIsPunchedIn(true); setPunchTime(format(new Date(res.data.punchIn), 'HH:mm')); toast.success('Punched in'); }
                else toast.error(res.error || 'Punch in failed');
            } else {
                const res = await punchOut();
                if (res.success) { setIsPunchedIn(false); setPunchTime(null); toast.success('Punched out'); }
                else toast.error(res.error || 'Punch out failed');
            }
        } catch { toast.error('An error occurred'); }
        finally { setActionLoading(false); }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const now = new Date();
                const [attRes, liveRes, listRes, summaryRes, adminRes, finRes] = await Promise.all([
                    getAttendance(undefined, now.getMonth(), now.getFullYear()),
                    getLiveUsers(),
                    getAllHRMRequests({ status: 'Pending', limit: 20 }),
                    getPendingRequestsSummary(),
                    getAdminDashboardData(),
                    getFinancialSummary(),
                ]);

                if (attRes.success && attRes.data) {
                    const todayRec = attRes.data.find((r: any) => isToday(new Date(r.date)));
                    if (todayRec?.punchIn && !todayRec?.punchOut) {
                        setIsPunchedIn(true);
                        setPunchTime(format(new Date(todayRec.punchIn), 'HH:mm'));
                    }
                }
                if (liveRes.success && liveRes.data) setLiveUsers(liveRes.data);
                if (listRes.success) setPendingRequests(listRes.data);
                if (summaryRes.success) { setRequestSummary(summaryRes.data.summary); setTotalPending(summaryRes.data.total); }
                if (adminRes.success && adminRes.data) setActiveUserCount(adminRes.data.stats.activeUsers);
                if (finRes?.totalIncome !== undefined) setMonthlyRevenue(finRes.totalIncome);

                await loadKPIs();
            } catch (e) { console.error('Dashboard load error', e); }
            finally { setLoadingLive(false); }
        };

        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, [loadKPIs]);

    const handleRequestDecision = async (id: string, action: 'Approved' | 'Rejected') => {
        setDecidingId(id);
        try {
            const res = await updateHRMRequestStatus(id, action);
            if (res.success) {
                toast.success(`Request ${action.toLowerCase()}`);
                setPendingRequests(prev => prev.filter(r => r._id !== id));
                setTotalPending(n => Math.max(0, n - 1));
            } else toast.error('Failed to update status');
        } catch { toast.error('An error occurred'); }
        setDecidingId(null);
    };

    const formatRevenue = (v: number | null) => {
        if (v === null) return '—';
        if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
        if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
        return `₹${v}`;
    };

    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // The dashboard scrolls inside the layout's overflow-y-auto div, not the window
        const scroller = containerRef.current?.closest(".overflow-y-auto") ?? undefined;
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            gsap.from(".dash-stat", {
                y: 24,
                opacity: 0,
                duration: 0.5,
                ease: "power2.out",
                stagger: 0.08,
                scrollTrigger: { trigger: ".dash-stat", scroller, start: "top 95%", once: true },
            });
            gsap.utils.toArray<HTMLElement>(".dash-section").forEach((section) => {
                gsap.from(section, {
                    y: 32,
                    opacity: 0,
                    duration: 0.7,
                    ease: "power2.out",
                    scrollTrigger: { trigger: section, scroller, start: "top 92%", once: true },
                });
            });
        });
    }, { scope: containerRef });

    // Async data changes section heights; recompute trigger positions
    useGSAP(() => {
        ScrollTrigger.refresh();
    }, { dependencies: [loadingLive, totalPending, kpis] });

    const statCards = [
        {
            title: 'Active Users', icon: Users,
            value: activeUserCount !== null ? activeUserCount.toString() : '—',
            sub: 'Registered accounts', accent: 'text-sky-600 bg-sky-50',
        },
        {
            title: 'Live Staff', icon: Clock,
            value: liveUsers.length.toString(),
            sub: 'Punched in now', accent: 'text-emerald-600 bg-emerald-50',
        },
        {
            title: 'Monthly Income', icon: DollarSign,
            value: formatRevenue(monthlyRevenue),
            sub: 'Total invoiced this month', accent: 'text-primary bg-primary/8',
        },
        {
            title: 'Pending Requests', icon: AlertTriangle,
            value: totalPending.toString(),
            sub: 'Requires action', accent: 'text-amber-600 bg-amber-50',
        },
    ];

    const CAT_META = [
        { cat: 'Leave' as HRMRequestCategory, icon: CalendarDays, color: 'bg-red-50 text-red-700 border-red-200' },
        { cat: 'WFH' as HRMRequestCategory, icon: Home, color: 'bg-sky-50 text-sky-700 border-sky-200' },
        { cat: 'On Duty' as HRMRequestCategory, icon: Briefcase, color: 'bg-amber-50 text-amber-700 border-amber-200' },
        { cat: 'Travel' as HRMRequestCategory, icon: Plane, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { cat: 'Other' as HRMRequestCategory, icon: FileText, color: 'bg-stone-100 text-stone-700 border-stone-300' },
    ];

    const CAT_COLORS: Record<string, string> = {
        Leave: 'bg-red-50 text-red-700 border-red-200',
        WFH: 'bg-sky-50 text-sky-700 border-sky-200',
        'On Duty': 'bg-amber-50 text-amber-700 border-amber-200',
        Travel: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Other: 'bg-stone-100 text-stone-700 border-stone-300',
    };

    return (
        <div ref={containerRef} className="space-y-5 p-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Super Admin Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Operations overview — {format(new Date(), 'EEEE, d MMMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="hidden sm:flex text-xs">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                    </Button>
                    <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                        {punchTime && (
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-muted-foreground">Punched in at</p>
                                <p className="font-mono font-bold text-sm text-foreground">{punchTime}</p>
                            </div>
                        )}
                        {punchTime && <div className="h-8 w-px bg-border hidden md:block" />}
                        <button
                            onClick={handlePunch}
                            disabled={actionLoading}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-60',
                                isPunchedIn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary text-white hover:bg-primary/90'
                            )}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                isPunchedIn ? <><LogOut className="w-4 h-4" /> Punch Out</> :
                                    <><LogIn className="w-4 h-4" /> Punch In</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ title, value, sub, icon: Icon, accent }) => (
                    <div key={title} className="dash-stat bg-card border border-border rounded-xl p-5 flex flex-col justify-between h-28">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{title}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                            </div>
                            <div className={cn('p-2 rounded-lg', accent)}>
                                <Icon className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Live Staff */}
            <div className="dash-section bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        Live Staff Tracking
                    </h3>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                        {liveUsers.length} online
                    </span>
                </div>
                <div className="p-4">
                    {loadingLive ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                    ) : liveUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No staff currently punched in.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {liveUsers.map((rec: any) => (
                                <div key={rec._id} className="flex flex-col items-center gap-2 p-3 bg-muted/30 border border-border rounded-xl">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ring-2 ring-white">
                                        {rec.userId?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="text-center min-w-0 w-full">
                                        <p className="text-xs font-semibold text-foreground truncate">{rec.userId?.name || 'Unknown'}</p>
                                        <p className="text-[10px] text-emerald-600 font-medium">
                                            {format(new Date(rec.punchIn), 'HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Section */}
            <div className="dash-section bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-primary/8 text-primary rounded-lg">
                        <Target className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">KPI Operation Status</h3>
                        <p className="text-xs text-muted-foreground">Team performance & individual contributions</p>
                    </div>
                </div>
                <KPITrackingGrid data={kpis} onRefresh={loadKPIs} />
            </div>

            {/* Pending HR Requests */}
            <div className="dash-section bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">Pending HR Requests</h3>
                        {totalPending > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{totalPending}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {CAT_META.map(({ cat, icon: Icon, color }) =>
                            (requestSummary[cat] || 0) > 0 ? (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCatFilter(activeCatFilter === cat ? 'All' : cat)}
                                    className={cn(
                                        'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all',
                                        color,
                                        activeCatFilter === cat ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'
                                    )}
                                >
                                    <Icon className="w-3 h-3" />{cat} · {requestSummary[cat]}
                                </button>
                            ) : null
                        )}
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {pendingRequests.filter(r => activeCatFilter === 'All' || r.category === activeCatFilter).length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-foreground">All clear</p>
                            <p className="text-xs text-muted-foreground mt-0.5">No pending requests require attention</p>
                        </div>
                    ) : (
                        pendingRequests
                            .filter(r => activeCatFilter === 'All' || r.category === activeCatFilter)
                            .map(req => {
                                const meta = CAT_META.find(m => m.cat === req.category);
                                const Icon = meta?.icon || FileText;
                                const isDeciding = decidingId === req._id;
                                return (
                                    <div key={req._id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 uppercase">
                                            {req.userName.substring(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-foreground">{req.userName}</span>
                                                <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border', CAT_COLORS[req.category])}>
                                                    <Icon className="w-3 h-3" />{req.category}
                                                    {req.category === 'Leave' && req.leaveSubType ? ` · ${req.leaveSubType}` : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                {format(new Date(req.startDate), 'dd MMM')}
                                                {req.endDate !== req.startDate ? ` – ${format(new Date(req.endDate), 'dd MMM')}` : ''}
                                                {req.destination ? ` · ✈ ${req.destination}` : ''}
                                                {req.location ? ` · 📍 ${req.location}` : ''}
                                                {' · '}<span className="italic">{req.reason}</span>
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => handleRequestDecision(req._id, 'Approved')}
                                                disabled={isDeciding}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                                            >
                                                {isDeciding ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleRequestDecision(req._id, 'Rejected')}
                                                disabled={isDeciding}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                                            >
                                                {isDeciding ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
}
