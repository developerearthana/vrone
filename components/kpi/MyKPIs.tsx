"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Target, TrendingUp, CheckCircle2, Clock, AlertCircle,
    Loader2, ChevronRight, Users, User, Edit3, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, isPast, isValid } from 'date-fns';

function safeFormat(value: string | undefined | null, fmt: string, fallback = '—'): string {
    if (!value) return fallback;
    const d = new Date(value);
    return isValid(d) ? format(d, fmt) : fallback;
}
import { cn } from '@/lib/utils';
import { getMyKPIAssignments, updateKPIProgress, markKPIComplete } from '@/app/actions/kpi-assignments';

const STATUS_COLORS: Record<string, string> = {
    'Not Started': 'bg-gray-100 text-gray-600 border-gray-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Missed': 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_DOT: Record<string, string> = {
    Low: 'bg-gray-400',
    Medium: 'bg-amber-400',
    High: 'bg-red-500',
};

interface KPIAssignment {
    _id: string;
    title: string;
    description?: string;
    metric: string;
    unit: string;
    target: number;
    actual: number;
    progress: number;
    status: string;
    priority: string;
    frequency: string;
    dueDate: string;
    notes?: string;
    assignedToUser?: { _id: string; name: string };
    assignedToTeam?: {
        _id: string;
        name: string;
        members?: Array<{ _id?: string; id?: string; name?: string }>;
    };
    assignedBy?: { _id: string; name: string };
    completedAt?: string;
    contributions?: Array<{
        user?: { _id?: string; id?: string; name?: string } | string;
        value?: number;
    }>;
}

export default function MyKPIs() {
    const [kpis, setKpis] = useState<KPIAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('All');

    // Update progress modal state
    const [editKpi, setEditKpi] = useState<KPIAssignment | null>(null);
    const [newActual, setNewActual] = useState<number>(0);
    const [newNotes, setNewNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMyKPIAssignments();
            if (res.success) setKpis(res.data || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openUpdate = (kpi: KPIAssignment) => {
        setEditKpi(kpi);
        setNewActual(kpi.actual);
        setNewNotes(kpi.notes || '');
    };

    const handleUpdateProgress = async () => {
        if (!editKpi) return;
        setSaving(true);
        try {
            const res = await updateKPIProgress({
                id: editKpi._id,
                actual: newActual,
                notes: newNotes,
            });
            if (res.success) {
                toast.success('Progress updated ✅');
                setEditKpi(null);
                load();
            } else {
                toast.error(res.error || 'Update failed');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleMarkComplete = async (id: string) => {
        setUpdatingId(id);
        try {
            const res = await markKPIComplete(id);
            if (res.success) {
                toast.success('KPI marked as completed! 🎉');
                load();
            } else {
                toast.error(res.error || 'Failed to complete');
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = kpis.filter(k =>
        filterStatus === 'All' || k.status === filterStatus
    );

    const stats = {
        total: kpis.length,
        completed: kpis.filter(k => k.status === 'Completed').length,
        inProgress: kpis.filter(k => k.status === 'In Progress').length,
        notStarted: kpis.filter(k => k.status === 'Not Started').length,
    };

    const getMemberContribution = (kpi: KPIAssignment, memberId: string) => {
        return (kpi.contributions || [])
            .filter((c) => String(typeof c.user === "string" ? c.user : c.user?._id || c.user?.id) === String(memberId))
            .reduce((sum, c) => sum + Number(c.value || 0), 0);
    };

    const getMemberContributionPercent = (kpi: KPIAssignment, value: number) => {
        if (!kpi.target || kpi.target <= 0) return 0;
        return Math.min(100, Math.round((value / kpi.target) * 100));
    };

    return (
        <div className="space-y-6">
            {/* Update Progress Modal */}
            {editKpi && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Update Progress</h3>
                                <p className="text-sm text-gray-500 truncate max-w-[280px]">{editKpi.title}</p>
                            </div>
                            <button onClick={() => setEditKpi(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Progress Preview */}
                        <div className="mb-5">
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-gray-500">Progress</span>
                                <span className="font-bold text-primary">
                                    {Math.min(100, Math.round((newActual / editKpi.target) * 100))}%
                                </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.round((newActual / editKpi.target) * 100))}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>0</span>
                                <span>Target: {editKpi.target} {editKpi.unit}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>Actual {editKpi.metric} Achieved ({editKpi.unit})</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={editKpi.target * 2}
                                    value={newActual}
                                    onChange={e => setNewActual(Number(e.target.value))}
                                    className="mt-1.5"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <Label>Progress Notes (optional)</Label>
                                <textarea
                                    className="w-full border rounded-lg p-2.5 text-sm resize-none mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    rows={2}
                                    placeholder="Any comments or blockers..."
                                    value={newNotes}
                                    onChange={e => setNewNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-5">
                            <Button variant="outline" className="flex-1" onClick={() => setEditKpi(null)}>
                                Cancel
                            </Button>
                            <Button className="flex-1 bg-primary" onClick={handleUpdateProgress} disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Progress
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total KPIs', value: stats.total, icon: Target, color: 'text-gray-700  bg-gray-50  border-gray-200' },
                    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-blue-700  bg-blue-50   border-blue-200' },
                    { label: 'Not Started', value: stats.notStarted, icon: Clock, color: 'text-amber-700 bg-amber-50  border-amber-200' },
                ].map(s => (
                    <div key={s.label} className={cn('rounded-xl border p-3 flex items-center gap-2.5', s.color)}>
                        <s.icon className="w-4 h-4 shrink-0" />
                        <div>
                            <p className="text-xl font-bold">{s.value}</p>
                            <p className="text-[10px] font-semibold uppercase">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2">
                {['All', 'Not Started', 'In Progress', 'Completed', 'Missed'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={cn(
                            'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                            filterStatus === s ? 'bg-primary text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
                        )}
                    >{s}</button>
                ))}
            </div>

            {/* KPI Cards */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                    <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-500">No KPIs assigned</p>
                    <p className="text-sm text-gray-400 mt-1">Your KPIs will appear here when assigned by your manager</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {filtered.map(kpi => {
                        const dueD = kpi.dueDate ? new Date(kpi.dueDate) : null;
                        const overdue = kpi.status !== 'Completed' && !!dueD && isValid(dueD) && isPast(dueD);
                        const isCompleted = kpi.status === 'Completed';
                        return (
                            <div
                                key={kpi._id}
                                className={cn(
                                    'bg-white border rounded-xl p-4 transition-all hover:shadow-md',
                                    isCompleted ? 'border-emerald-200 bg-emerald-50/30' : overdue ? 'border-red-200' : 'border-gray-100'
                                )}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <div className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[kpi.priority])} />
                                            <h4 className="font-bold text-gray-900 text-sm truncate">{kpi.title}</h4>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-3.5">
                                            {kpi.metric} · {kpi.frequency}
                                            {kpi.assignedToTeam && (
                                                <span className="ml-2 inline-flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> Team: {kpi.assignedToTeam.name}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <span className={cn('ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0', STATUS_COLORS[kpi.status])}>
                                        {kpi.status}
                                    </span>
                                </div>

                                {kpi.description && (
                                    <p className="text-xs text-gray-500 mb-2 ml-3.5">{kpi.description}</p>
                                )}

                                {/* Progress */}
                                <div className="my-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-gray-500">Progress</span>
                                        <span className="font-bold text-gray-700">
                                            {kpi.actual} / {kpi.target} {kpi.unit}
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full transition-all', isCompleted ? 'bg-emerald-500' : 'bg-primary')}
                                            style={{ width: `${kpi.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-gray-400">
                                            {kpi.assignedBy ? `By ${kpi.assignedBy.name}` : ''}
                                        </span>
                                        <span className={cn('text-[10px] font-bold', overdue ? 'text-red-500' : 'text-gray-400')}>
                                            Due: {safeFormat(kpi.dueDate, 'dd MMM yyyy')}
                                            {overdue && !isCompleted && ' ⚠️ Overdue'}
                                        </span>
                                    </div>
                                </div>

                                {kpi.assignedToTeam?.members && kpi.assignedToTeam.members.length > 0 && (
                                    <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Team Member Contribution</p>
                                        <div className="space-y-2">
                                            {kpi.assignedToTeam.members.map((member) => {
                                                const memberId = String(member._id || member.id || "");
                                                const memberValue = getMemberContribution(kpi, memberId);
                                                const memberPercent = getMemberContributionPercent(kpi, memberValue);
                                                return (
                                                    <div key={memberId || member.name} className="text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-700 truncate pr-2">{member.name || "Member"}</span>
                                                            <span className="font-semibold text-emerald-700">
                                                                {memberValue} ({memberPercent}%)
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${memberPercent}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {kpi.notes && (
                                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3 italic border border-gray-100">
                                        &quot;{kpi.notes}&quot;
                                    </div>
                                )}

                                {/* Actions */}
                                {!isCompleted && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => openUpdate(kpi)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" /> Update Progress
                                        </button>
                                        <button
                                            onClick={() => handleMarkComplete(kpi._id)}
                                            disabled={updatingId === kpi._id}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                                        >
                                            {updatingId === kpi._id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <CheckCircle2 className="w-3.5 h-3.5" />
                                            }
                                            Mark Complete
                                        </button>
                                    </div>
                                )}
                                {isCompleted && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-2">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Completed {kpi.completedAt ? `on ${safeFormat(kpi.completedAt, 'dd MMM yyyy')}` : ''}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
