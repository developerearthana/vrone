"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Clock, FileText, TrendingUp, ArrowUpRight, CheckSquare, Target, Loader2, LogIn, LogOut, ChevronRight } from "lucide-react";
import { format, isToday } from "date-fns";
import MyKPIs from "@/components/kpi/MyKPIs";
import QuickRequestPanel from "@/components/hrm/QuickRequestPanel";
import { getTeams } from "@/app/actions/organization";
import { getMyKPIAssignments } from "@/app/actions/kpi-assignments";
import { punchIn, punchOut, getAttendance } from "@/app/actions/hrm";
import { getPendingRequestsSummary } from "@/app/actions/hrm-requests";
import { toast } from "sonner";

type TeamType = {
    _id?: string; id?: string; name: string;
    members?: Array<{ _id?: string; id?: string; name?: string }>;
};

type KPIType = {
    _id: string;
    assignedToTeam?: { _id?: string; id?: string; name?: string };
    assignedToUser?: { _id?: string; id?: string; name?: string };
    actual?: number;
    contributions?: Array<{ user?: { _id?: string; id?: string; name?: string } | string; value?: number }>;
    title?: string;
};

export default function ManagerDashboard() {
    const [teams, setTeams] = useState<TeamType[]>([]);
    const [kpis, setKpis] = useState<KPIType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [punchTime, setPunchTime] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [pendingSummary, setPendingSummary] = useState<Record<string, number>>({});
    const [attendanceToday, setAttendanceToday] = useState<{ present: number; total: number }>({ present: 0, total: 0 });
    const [todayLabel, setTodayLabel] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [teamsRes, kpisRes] = await Promise.all([getTeams(), getMyKPIAssignments()]);
            setTeams((teamsRes || []) as TeamType[]);
            if (kpisRes.success) setKpis((kpisRes.data || []) as KPIType[]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { setTodayLabel(format(new Date(), 'EEEE, d MMMM yyyy')); }, []);

    useEffect(() => {
        load();
        (async () => {
            try {
                const now = new Date();
                const [attRes, summaryRes] = await Promise.all([
                    getAttendance(undefined, now.getMonth(), now.getFullYear()),
                    getPendingRequestsSummary(),
                ]);
                if (attRes.success && attRes.data) {
                    const todayRec = attRes.data.find((r: any) => isToday(new Date(r.date)));
                    if (todayRec?.punchIn && !todayRec?.punchOut) {
                        setIsPunchedIn(true);
                        setPunchTime(format(new Date(todayRec.punchIn), 'HH:mm'));
                    }
                    const present = attRes.data.filter((r: any) => r.punchIn).length;
                    setAttendanceToday({ present, total: attRes.data.length });
                }
                if (summaryRes.success) {
                    setPendingTotal(summaryRes.data.total);
                    setPendingSummary(summaryRes.data.summary);
                }
            } catch (e) { console.warn('Dashboard load failed', e); }
        })();
    }, [load]);

    const handlePunch = async () => {
        setActionLoading(true);
        try {
            const res = isPunchedIn ? await punchOut() : await punchIn();
            if (res.success) {
                if (!isPunchedIn) {
                    setIsPunchedIn(true);
                    setPunchTime(format(new Date((res as any).data.punchIn), 'HH:mm'));
                    toast.success('Punched in successfully');
                } else {
                    setIsPunchedIn(false);
                    setPunchTime(null);
                    toast.success('Punched out successfully');
                }
            } else {
                toast.error((res as any).error || 'Punch failed');
            }
        } catch { toast.error('An error occurred'); }
        finally { setActionLoading(false); }
    };

    const teamStats = useMemo(() => teams.map(team => {
        const teamId = String(team._id || team.id || '');
        const memberIds = (team.members || []).map(m => String(m._id || m.id || ''));
        const teamKpis = kpis.filter(kpi => {
            const atId = String(kpi.assignedToTeam?._id || kpi.assignedToTeam?.id || '');
            const auId = String(kpi.assignedToUser?._id || kpi.assignedToUser?.id || '');
            return atId === teamId || (auId && memberIds.includes(auId));
        });
        const workDone = teamKpis.reduce((s, k) => s + (k.actual || 0), 0);
        const memberContributions = (team.members || []).map(member => {
            const mId = String(member._id || member.id || '');
            const contribution = teamKpis.reduce((s, kpi) =>
                s + (kpi.contributions || [])
                    .filter(c => String(typeof c.user === 'string' ? c.user : c.user?._id || c.user?.id) === mId)
                    .reduce((t, c) => t + (c.value || 0), 0)
                , 0);
            return { id: mId, name: member.name || 'Member', contribution };
        });
        return { id: teamId, name: team.name, kpiCount: teamKpis.length, workDone, memberContributions };
    }), [teams, kpis]);

    const pendingChips = Object.entries(pendingSummary).filter(([, v]) => v > 0);

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Manager Overview</h1>
                        <p className="text-xs text-muted-foreground">{todayLabel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/masters/kpi-assignments"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                        <Target className="w-4 h-4 text-primary" />KPI Assignment
                    </Link>
                    <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                        {punchTime && (
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-muted-foreground">Punched in at</p>
                                <p className="font-mono font-bold text-sm">{punchTime}</p>
                            </div>
                        )}
                        {punchTime && <div className="h-8 w-px bg-border hidden md:block" />}
                        <button
                            onClick={handlePunch}
                            disabled={actionLoading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-60 ${isPunchedIn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary text-white hover:bg-primary/90'}`}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                isPunchedIn ? <><LogOut className="w-4 h-4" />Punch Out</> :
                                    <><LogIn className="w-4 h-4" />Punch In</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-sky-50 rounded-xl"><Clock className="w-5 h-5 text-sky-600" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Today's Attendance</p>
                            <h3 className="text-xl font-bold text-foreground">
                                {attendanceToday.present} / {attendanceToday.total || '—'}
                            </h3>
                        </div>
                    </div>
                    {attendanceToday.total > 0 && (
                        <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                                className="bg-sky-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.round((attendanceToday.present / attendanceToday.total) * 100)}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Pending Approvals — real data, link to admin */}
                <Link href="/dashboards/super-admin" className="bg-card border border-border p-4 rounded-xl hover:border-amber-300 transition-colors group block">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-amber-50 rounded-xl"><FileText className="w-5 h-5 text-amber-600" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Pending Approvals</p>
                            <h3 className="text-xl font-bold text-foreground">{pendingTotal}</h3>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {pendingChips.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground">All clear</span>
                        ) : pendingChips.map(([cat, count]) => (
                            <span key={cat} className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                                {count} {cat}
                            </span>
                        ))}
                    </div>
                </Link>

                <div className="bg-card border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-emerald-50 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Active Teams</p>
                            <h3 className="text-xl font-bold text-foreground">{teams.length}</h3>
                        </div>
                    </div>
                    <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                        <ArrowUpRight className="w-3 h-3" />
                        {teamStats.reduce((s, t) => s + t.kpiCount, 0)} KPIs tracked
                    </p>
                </div>
            </div>

            {/* ── Main 2-col layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Left: KPI Grid */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card border border-border p-4 rounded-xl">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-primary" />KPI Assignment Grid
                        </h3>
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : teamStats.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No teams assigned yet</p>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {teamStats.map(team => (
                                    <div key={team.id} className="rounded-xl border border-border p-4 bg-muted/20">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-foreground">{team.name}</h4>
                                            <span className="text-xs font-bold text-primary bg-primary/8 border border-primary/20 px-2 py-0.5 rounded">
                                                {team.kpiCount} KPIs
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-3">Work Done: <span className="font-semibold text-foreground">{team.workDone}</span></p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {team.memberContributions.length > 0 ? (
                                                team.memberContributions.map(member => (
                                                    <div key={member.id} className="bg-card rounded-lg border border-border p-2.5">
                                                        <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
                                                        <p className="text-[10px] text-emerald-600 font-bold">Contribution: {member.contribution}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground">No members</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-card border border-border p-5 rounded-xl">
                        <h3 className="font-bold text-foreground mb-4">My Targets &amp; KPIs</h3>
                        <MyKPIs />
                    </div>
                </div>

                {/* Right: Quick Request + Admin shortcut */}
                <div className="space-y-4">
                    <QuickRequestPanel />

                    {/* Admin redirect for approvals */}
                    <Link
                        href="/dashboards/super-admin"
                        className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors group"
                    >
                        <div>
                            <p className="text-sm font-semibold text-foreground">Pending Approvals</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Review &amp; approve all HR requests in admin dashboard</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
