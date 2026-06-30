"use client";

import { useState, useEffect, useCallback } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import {
    CalendarDays, Home, Briefcase, Plane, FileText,
    Plus, X, Loader2, ChevronRight, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createHRMRequest, getMyHRMRequests } from '@/app/actions/hrm-requests';
import type { HRMRequestCategory } from '@/models/HRMRequest';
import Link from 'next/link';

const CATS: { value: HRMRequestCategory; label: string; icon: any; color: string; active: string }[] = [
    { value: 'Leave',    label: 'Leave',    icon: CalendarDays, color: 'text-red-600',     active: 'bg-red-50 border-red-300 text-red-700' },
    { value: 'WFH',     label: 'WFH',      icon: Home,         color: 'text-sky-600',     active: 'bg-sky-50 border-sky-300 text-sky-700' },
    { value: 'On Duty', label: 'On Duty',  icon: Briefcase,    color: 'text-amber-600',   active: 'bg-amber-50 border-amber-300 text-amber-700' },
    { value: 'Travel',  label: 'Travel',   icon: Plane,        color: 'text-emerald-600', active: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
    { value: 'Other',   label: 'Other',    icon: FileText,     color: 'text-stone-600',   active: 'bg-stone-100 border-stone-400 text-stone-700' },
];

const STATUS_STYLE: Record<string, string> = {
    Pending:   'bg-amber-50 text-amber-700 border-amber-200',
    Approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected:  'bg-red-50 text-red-700 border-red-200',
    Cancelled: 'bg-muted text-muted-foreground border-border',
};

const LEAVE_TYPES = ['Sick', 'Casual', 'Festival', 'Emergency', 'Annual', 'Earned', 'Other'];

const inputCls = "w-full px-2.5 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all";

function calcDays(s: string, e: string) {
    if (!s) return 0;
    return differenceInCalendarDays(new Date(e || s), new Date(s)) + 1;
}

export default function QuickRequestPanel() {
    const [selectedCat, setSelectedCat] = useState<HRMRequestCategory | null>(null);
    const [form, setForm] = useState({
        startDate: '', endDate: '', reason: '', leaveSubType: 'Sick', location: '', destination: '', halfDay: false,
    });
    const [submitting, setSubmitting] = useState(false);
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);

    const loadRecent = useCallback(async () => {
        setLoadingRecent(true);
        try {
            const res = await getMyHRMRequests();
            if (res.success) setRecentRequests(res.data.slice(0, 4));
        } catch {
            // server action error — silent fail
        } finally {
            setLoadingRecent(false);
        }
    }, []);

    useEffect(() => { loadRecent(); }, [loadRecent]);

    const resetForm = () => {
        setForm({ startDate: '', endDate: '', reason: '', leaveSubType: 'Sick', location: '', destination: '', halfDay: false });
        setSelectedCat(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCat || !form.startDate || !form.reason.trim()) {
            toast.error('Please fill all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const res = await createHRMRequest({
                category: selectedCat,
                leaveSubType: selectedCat === 'Leave' ? (form.leaveSubType as any) : undefined,
                startDate: form.startDate,
                endDate: form.endDate || form.startDate,
                halfDay: form.halfDay,
                reason: form.reason,
                location: selectedCat === 'On Duty' ? form.location : undefined,
                destination: selectedCat === 'Travel' ? form.destination : undefined,
            });
            if (res.success) {
                toast.success('Request submitted — pending admin approval');
                resetForm();
                loadRecent();
            } else {
                toast.error(res.error || 'Submission failed');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const cfg = selectedCat ? CATS.find(c => c.value === selectedCat)! : null;

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-bold text-foreground text-sm">Quick Request</h3>
                {selectedCat && (
                    <button onClick={resetForm} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Category selector */}
            <div className="px-4 pt-3 pb-2">
                <div className="grid grid-cols-5 gap-1.5">
                    {CATS.map(cat => {
                        const Icon = cat.icon;
                        const isSelected = selectedCat === cat.value;
                        return (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCat(isSelected ? null : cat.value)}
                                className={cn(
                                    "flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-semibold transition-all",
                                    isSelected ? cat.active : 'border-border text-muted-foreground hover:bg-muted'
                                )}
                            >
                                <Icon className={cn("w-3.5 h-3.5", isSelected ? '' : cat.color)} />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Form — shown when category selected */}
            {selectedCat && (
                <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-b border-border">

                    {/* Leave sub-type */}
                    {selectedCat === 'Leave' && (
                        <select
                            className={inputCls}
                            value={form.leaveSubType}
                            onChange={e => setForm(f => ({ ...f, leaveSubType: e.target.value }))}
                        >
                            {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    )}

                    {/* Dates */}
                    <div className={cn("grid gap-2", selectedCat === 'WFH' ? 'grid-cols-1' : 'grid-cols-2')}>
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                {selectedCat === 'WFH' ? 'Date' : 'Start'} *
                            </label>
                            <input
                                type="date"
                                required
                                className={inputCls + " mt-1"}
                                value={form.startDate}
                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value }))}
                            />
                        </div>
                        {selectedCat !== 'WFH' && (
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">End</label>
                                <input
                                    type="date"
                                    className={inputCls + " mt-1"}
                                    value={form.endDate}
                                    min={form.startDate}
                                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                />
                            </div>
                        )}
                    </div>

                    {/* Half-day (Leave only) */}
                    {selectedCat === 'Leave' && (
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, halfDay: !f.halfDay }))}
                                className={cn("relative inline-flex h-4 w-8 rounded-full border-2 border-transparent transition-colors shrink-0", form.halfDay ? 'bg-primary' : 'bg-muted')}
                            >
                                <span className={cn("inline-block h-3 w-3 rounded-full bg-white shadow transition-transform", form.halfDay ? 'translate-x-4' : 'translate-x-0')} />
                            </button>
                            <span className="text-foreground">Half day</span>
                        </label>
                    )}

                    {/* Location/Destination */}
                    {(selectedCat === 'On Duty' || selectedCat === 'Travel') && (
                        <input
                            type="text"
                            placeholder={selectedCat === 'Travel' ? 'Destination city / country' : 'Location / client site'}
                            className={inputCls}
                            value={selectedCat === 'Travel' ? form.destination : form.location}
                            onChange={e => selectedCat === 'Travel'
                                ? setForm(f => ({ ...f, destination: e.target.value }))
                                : setForm(f => ({ ...f, location: e.target.value }))
                            }
                        />
                    )}

                    {/* Reason */}
                    <textarea
                        required
                        rows={2}
                        placeholder={selectedCat === 'Leave' ? 'Reason for leave…' : selectedCat === 'Other' ? 'Describe your request…' : 'Purpose…'}
                        className={cn(inputCls, "resize-none")}
                        value={form.reason}
                        onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    />

                    {/* Duration hint */}
                    {form.startDate && (
                        <p className="text-[10px] text-muted-foreground">
                            {calcDays(form.startDate, form.endDate || form.startDate)} day(s)
                            {form.halfDay ? ' (half day)' : ''}
                            {' · '}{format(new Date(form.startDate), 'dd MMM')}
                            {form.endDate && form.endDate !== form.startDate ? ` – ${format(new Date(form.endDate), 'dd MMM')}` : ''}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors",
                            cfg ? cfg.active.replace('border-', 'border ') : 'bg-primary text-white',
                            "border bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                        )}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Submit {selectedCat} Request
                    </button>
                </form>
            )}

            {/* Recent requests */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Recent Requests</p>
                    <Link href="/hrm/leave" className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5">
                        View all <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>

                {loadingRecent ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                ) : recentRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No requests yet</p>
                ) : (
                    <div className="space-y-1.5">
                        {recentRequests.map((req: any) => {
                            const catCfg = CATS.find(c => c.value === req.category);
                            const Icon = catCfg?.icon || FileText;
                            return (
                                <div key={req._id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Icon className={cn("w-3.5 h-3.5 shrink-0", catCfg?.color || 'text-muted-foreground')} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">
                                                {req.category}{req.leaveSubType ? ` · ${req.leaveSubType}` : ''}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {format(new Date(req.startDate), 'dd MMM')}
                                                {req.endDate && req.endDate !== req.startDate ? ` – ${format(new Date(req.endDate), 'dd MMM')}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0", STATUS_STYLE[req.status])}>
                                        {req.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
