"use client";

import { Target, CalendarDays, ArrowUpRight, CheckCircle2, Clock, Filter, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { getGoalDashboardData } from '@/app/actions/goal';
import { getAppraisals } from '@/app/actions/appraisal';
import { toast } from 'sonner';

export default function GoalsDashboard() {
    const [selectedSubsidiary, setSelectedSubsidiary] = useState("All");
    const [selectedPeriod, setSelectedPeriod] = useState("All");
    const [dashboard, setDashboard] = useState<any>({
        goals: [],
        periods: [],
        subsidiaries: [],
        stats: { totalGoals: 0, onTrackCount: 0, atRiskCount: 0, progressAvg: 0 },
        recentEntries: [],
    });
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [dashboardRes, appraisalsRes] = await Promise.all([
                    getGoalDashboardData({}),
                    getAppraisals(),
                ]);

                if (dashboardRes.success && dashboardRes.data) {
                    setDashboard(dashboardRes.data);
                } else {
                    toast.error(dashboardRes.error || 'Failed to load goals dashboard');
                }

                if (appraisalsRes.success && appraisalsRes.data) {
                    setReviews(appraisalsRes.data.slice(0, 3));
                }
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const periods = useMemo(
        () => ['All', ...dashboard.periods],
        [dashboard.periods]
    );
    const subsidiaries = useMemo(
        () => ['All', ...dashboard.subsidiaries],
        [dashboard.subsidiaries]
    );

    const filteredGoals = useMemo(() => (
        (dashboard.goals || []).filter((goal: any) => {
            const matchesPeriod = selectedPeriod === 'All' || goal.fiscalPeriod === selectedPeriod;
            const matchesSubsidiary = selectedSubsidiary === 'All' || goal.subsidiary === selectedSubsidiary;
            return matchesPeriod && matchesSubsidiary;
        })
    ), [dashboard.goals, selectedPeriod, selectedSubsidiary]);

    const filteredStats = useMemo(() => {
        const totalGoals = filteredGoals.length;
        const onTrackCount = filteredGoals.filter((goal: any) => (goal.progress || 0) >= 70).length;
        const atRiskCount = filteredGoals.filter((goal: any) => {
            const progress = goal.progress || 0;
            return progress > 0 && progress < 50;
        }).length;
        const progressAvg = totalGoals > 0
            ? Math.round(filteredGoals.reduce((sum: number, goal: any) => sum + (goal.progress || 0), 0) / totalGoals)
            : 0;

        return { totalGoals, onTrackCount, atRiskCount, progressAvg };
    }, [filteredGoals]);

    const snapshotEntries = useMemo(() => {
        return (dashboard.recentEntries || []).filter((entry: any) => (
            selectedSubsidiary === 'All' || entry.subsidiary === selectedSubsidiary
        ));
    }, [dashboard.recentEntries, selectedSubsidiary]);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading goals dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        {selectedPeriod === 'All' ? 'Goals & Performance' : `${selectedPeriod} Goals & Performance`}
                    </h2>
                    <p className="text-muted-foreground">Track strategic objectives and KPI delivery with live data.</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                        <select
                            aria-label="Filter by Period"
                            className="pl-3 pr-8 py-2 border border-border rounded-lg text-sm bg-card text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            {periods.map((period) => (
                                <option key={period} value={period}>{period}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                            aria-label="Filter by Subsidiary"
                            className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                            value={selectedSubsidiary}
                            onChange={(e) => setSelectedSubsidiary(e.target.value)}
                        >
                            {subsidiaries.map((subsidiary) => (
                                <option key={subsidiary} value={subsidiary}>{subsidiary}</option>
                            ))}
                        </select>
                    </div>
                    <Link href="/goals/plan" className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors">
                        <Target className="w-4 h-4" />
                        Plan
                    </Link>
                    <Link href="/goals/kpi" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors shadow-sm">
                        <ArrowUpRight className="w-4 h-4" />
                        KPI Update
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Overall Progress", value: `${filteredStats.progressAvg}%`, sub: "Average completion across filtered goals", icon: Target, iconColor: "text-primary" },
                    { label: "Current Period", value: selectedPeriod, sub: "Filtered planning cycle", icon: CalendarDays, iconColor: "text-primary" },
                    { label: "Goals On Track", value: `${filteredStats.onTrackCount}/${filteredStats.totalGoals}`, sub: "Progress at 70% or above", icon: CheckCircle2, iconColor: "text-secondary-foreground" },
                    { label: "Goals At Risk", value: filteredStats.atRiskCount, sub: "Progress below 50%", icon: AlertTriangle, iconColor: "text-red-600" },
                ].map((stat, idx) => (
                    <StatCard key={stat.label} index={idx} {...stat} />
                ))}
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-foreground">Strategic Objectives</h3>
                    <Link href="/goals/plan" className="text-sm text-primary font-medium hover:opacity-80">Manage Plan</Link>
                </div>
                <div className="divide-y divide-gray-100">
                    {filteredGoals.map((goal: any) => (
                        <div key={goal._id} className="p-6 hover:bg-background/50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{goal.subsidiary}</span>
                                        {goal.fiscalPeriod && (
                                            <span className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground">
                                                {goal.fiscalPeriod}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-foreground">{goal.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Target: {goal.targetValue || 'NA'} {goal.metric ? `(${goal.metric})` : ''} • Current: {goal.currentValue || '0'}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border w-fit
                                    ${goal.status === 'Completed' ? 'bg-muted text-secondary-foreground border-border' :
                                        goal.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                            goal.status === 'At Risk' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'}`}>
                                    {goal.status}
                                </span>
                            </div>
                            <div className="w-full">
                                <Progress
                                    value={goal.progress || 0}
                                    indicatorClassName={(goal.progress || 0) >= 70 ? 'bg-primary' : (goal.progress || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'}
                                    aria-label={`Progress: ${goal.progress || 0}%`}
                                />
                            </div>
                        </div>
                    ))}
                    {filteredGoals.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            No goals found for this period/subsidiary.
                        </div>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-foreground">Recent Review Meetings</h3>
                        <Link href="/goals/review" className="text-sm text-primary font-medium hover:opacity-80">View All</Link>
                    </div>
                    <div className="space-y-4">
                        {reviews.map((meeting) => (
                            <div key={meeting.id || meeting._id} className="flex gap-4 p-4 rounded-lg border border-border bg-muted/30">
                                <div className="bg-card text-primary p-2 rounded-lg h-fit border border-border">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">{meeting.period || 'Review Meeting'}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {meeting.meetingDate ? new Date(meeting.meetingDate).toLocaleDateString() : 'No date'} • Guided by {meeting.reviewerId?.name || 'Pending Reviewer'}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                        {meeting.feedback || 'No feedback recorded yet.'}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {reviews.length === 0 && (
                            <div className="p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                                No review meetings recorded yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-foreground">Weekly KPI Snapshot</h3>
                        <Link href="/goals/kpi" className="text-sm text-primary font-medium hover:opacity-80">View Report</Link>
                    </div>
                    <div className="space-y-4">
                        {snapshotEntries.slice(0, 3).map((entry: any) => (
                            <div
                                key={entry._id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                    entry.status === 'Missed'
                                        ? 'bg-red-500/10 border-red-500/20'
                                        : 'bg-muted border-border'
                                }`}
                            >
                                <span className={`text-sm font-medium ${entry.status === 'Missed' ? 'text-red-600' : 'text-foreground'}`}>
                                    {entry.metric}
                                </span>
                                <span className={`font-bold ${entry.status === 'Missed' ? 'text-red-700' : 'text-primary'}`}>
                                    {entry.actual} <span className="text-xs font-normal">vs {entry.target} target</span>
                                </span>
                            </div>
                        ))}
                        {snapshotEntries.length === 0 && (
                            <div className="p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                                No KPI entries available yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
