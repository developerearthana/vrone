"use client";

import { useState, useEffect, useCallback } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import {
    Plus, Loader2, Check, X, ChevronDown, XCircle, CheckCircle2,
    CalendarDays, Home, Briefcase, Plane, FileText, Clock, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
    createHRMRequest, getMyHRMRequests, getAllHRMRequests,
    updateHRMRequestStatus, cancelHRMRequest,
} from '@/app/actions/hrm-requests';
import type { HRMRequestCategory, HRMRequestStatus } from '@/models/HRMRequest';

// ── Types ─────────────────────────────────────────────────────────────────────

const CATEGORIES: { value: HRMRequestCategory; label: string; icon: any; color: string }[] = [
    { value: 'Leave',    label: 'Leave',    icon: CalendarDays, color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'WFH',     label: 'WFH',      icon: Home,         color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { value: 'On Duty', label: 'On Duty',  icon: Briefcase,    color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'Travel',  label: 'Travel',   icon: Plane,        color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'Other',   label: 'Other',    icon: FileText,     color: 'text-stone-600 bg-stone-100 border-stone-300' },
];

const STATUS_CONFIG: Record<HRMRequestStatus, { label: string; color: string; dot: string }> = {
    Pending:   { label: 'Pending',   color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
    Approved:  { label: 'Approved',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    Rejected:  { label: 'Rejected',  color: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-500' },
    Cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border',    dot: 'bg-muted-foreground/40' },
};

const LEAVE_TYPES = ['Sick', 'Casual', 'Festival', 'Emergency', 'Annual', 'Earned', 'Other'] as const;

const inputCls = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all";

function categoryColor(cat: HRMRequestCategory) {
    return CATEGORIES.find(c => c.value === cat)?.color || 'text-foreground bg-muted border-border';
}

function calcDays(start: string, end: string) {
    if (!start || !end) return 0;
    return differenceInCalendarDays(new Date(end), new Date(start)) + 1;
}

const emptyForm = () => ({
    category: 'Leave' as HRMRequestCategory,
    leaveSubType: 'Sick' as any,
    startDate: '',
    endDate: '',
    halfDay: false,
    reason: '',
    location: '',
    destination: '',
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function RequestsPage() {
    const { data: session } = useSession();
    const isAdmin = ['admin', 'super-admin', 'manager', 'hr'].includes(
        (session?.user?.role || '').toLowerCase()
    );

    const [tab, setTab] = useState<'mine' | 'all'>('mine');
    const [filterCat, setFilterCat] = useState<HRMRequestCategory | 'All'>('All');
    const [filterStatus, setFilterStatus] = useState<HRMRequestStatus | 'All'>('All');
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [submitting, setSubmitting] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [noteMap, setNoteMap] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === 'mine') {
                const res = await getMyHRMRequests(filterCat === 'All' ? undefined : filterCat);
                if (res.success) setRequests(res.data);
            } else {
                const res = await getAllHRMRequests({
                    category: filterCat,
                    status: filterStatus,
                });
                if (res.success) setRequests(res.data);
            }
        } finally {
            setLoading(false);
        }
    }, [tab, filterCat, filterStatus]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.startDate || !form.reason) {
            toast.error('Please fill all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                endDate: form.endDate || form.startDate,
                leaveSubType: form.category === 'Leave' ? form.leaveSubType : undefined,
                location: ['On Duty', 'Travel'].includes(form.category) ? form.location : undefined,
                destination: form.category === 'Travel' ? form.destination : undefined,
            };
            const res = await createHRMRequest(payload);
            if (res.success) {
                toast.success('Request submitted successfully');
                setShowForm(false);
                setForm(emptyForm());
                load();
            } else {
                toast.error(res.error || 'Failed to submit');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDecision = async (id: string, status: 'Approved' | 'Rejected') => {
        setActionId(id);
        const res = await updateHRMRequestStatus(id, status, noteMap[id]);
        if (res.success) {
            toast.success(status === 'Approved' ? 'Request approved' : 'Request rejected');
            load();
        } else {
            toast.error(res.error || 'Action failed');
        }
        setActionId(null);
    };

    const handleCancel = async (id: string) => {
        const res = await cancelHRMRequest(id);
        if (res.success) { toast.success('Request cancelled'); load(); }
        else toast.error(res.error || 'Failed');
    };

    // ── Derived ──────────────────────────────────────────────────────────────

    const filtered = requests.filter(r => {
        if (filterStatus !== 'All' && r.status !== filterStatus) return false;
        return true;
    });

    const pending = filtered.filter(r => r.status === 'Pending');
    const others  = filtered.filter(r => r.status !== 'Pending');

    return (
        <div className="space-y-5 pb-10">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-foreground">HR Requests</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Leave · WFH · On Duty · Travel · Other</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Tab: mine / all */}
                    {isAdmin && (
                        <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs bg-card h-8">
                            {(['mine', 'all'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setTab(t); setFilterStatus('All'); }}
                                    className={cn(
                                        "px-3 h-full font-medium capitalize transition-colors",
                                        tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {t === 'mine' ? 'My Requests' : 'All Requests'}
                                </button>
                            ))}
                        </div>
                    )}
                    <Button size="sm" onClick={() => { setShowForm(true); setForm(emptyForm()); }}>
                        <Plus className="w-3.5 h-3.5" />New Request
                    </Button>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {/* Category filter */}
                <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs bg-card h-7">
                    {(['All', ...CATEGORIES.map(c => c.value)] as const).map(c => (
                        <button
                            key={c}
                            onClick={() => setFilterCat(c as any)}
                            className={cn(
                                "px-2.5 h-full font-medium transition-colors whitespace-nowrap",
                                filterCat === c ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                {/* Status filter (admin all-requests view) */}
                {(isAdmin || tab === 'mine') && (
                    <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs bg-card h-7">
                        {(['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s as any)}
                                className={cn(
                                    "px-2.5 h-full font-medium transition-colors",
                                    filterStatus === s ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Pending section (admin all-requests: actionable) ── */}
            {isAdmin && tab === 'all' && pending.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                        Pending ({pending.length}) — Action Required
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pending.map(req => (
                            <RequestCard
                                key={req._id}
                                req={req}
                                isAdmin={isAdmin}
                                tab={tab}
                                actionId={actionId}
                                noteMap={noteMap}
                                setNoteMap={setNoteMap}
                                onApprove={id => handleDecision(id, 'Approved')}
                                onReject={id => handleDecision(id, 'Rejected')}
                                onCancel={handleCancel}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── All requests list ── */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No requests found</p>
                    <p className="text-xs mt-1">Submit a new request using the button above</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {(isAdmin && tab === 'all' ? others : filtered).map(req => (
                        <RequestRow
                            key={req._id}
                            req={req}
                            isAdmin={isAdmin}
                            tab={tab}
                            actionId={actionId}
                            noteMap={noteMap}
                            setNoteMap={setNoteMap}
                            onApprove={id => handleDecision(id, 'Approved')}
                            onReject={id => handleDecision(id, 'Rejected')}
                            onCancel={handleCancel}
                        />
                    ))}
                </div>
            )}

            {/* ── Submit Form Modal ── */}
            {showForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowForm(false)}
                >
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
                    <div
                        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="font-bold text-foreground">New Request</h2>
                            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">

                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request Type</label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {CATEGORIES.map(cat => {
                                        const Icon = cat.icon;
                                        return (
                                            <button
                                                key={cat.value}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                                                className={cn(
                                                    "flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-semibold transition-colors",
                                                    form.category === cat.value ? cat.color : 'border-border text-muted-foreground hover:bg-muted'
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Leave sub-type */}
                            {form.category === 'Leave' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leave Type</label>
                                    <select
                                        className={inputCls}
                                        value={form.leaveSubType}
                                        onChange={e => setForm(f => ({ ...f, leaveSubType: e.target.value as any }))}
                                    >
                                        {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Dates */}
                            <div className={cn("grid gap-3", form.category === 'WFH' ? 'grid-cols-1' : 'grid-cols-2')}>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">
                                        {form.category === 'WFH' ? 'Date' : 'Start Date'} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className={inputCls}
                                        value={form.startDate}
                                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value }))}
                                    />
                                </div>
                                {form.category !== 'WFH' && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">End Date</label>
                                        <input
                                            type="date"
                                            className={inputCls}
                                            value={form.endDate}
                                            min={form.startDate}
                                            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Half day (Leave only) */}
                            {form.category === 'Leave' && (
                                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, halfDay: !f.halfDay }))}
                                        className={cn("relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors", form.halfDay ? 'bg-primary' : 'bg-muted')}
                                    >
                                        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", form.halfDay ? 'translate-x-4' : 'translate-x-0')} />
                                    </button>
                                    <span className="text-foreground font-medium">Half day</span>
                                </label>
                            )}

                            {/* On Duty / Travel location */}
                            {(form.category === 'On Duty' || form.category === 'Travel') && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {form.category === 'Travel' ? 'Destination' : 'Location / Venue'}
                                    </label>
                                    <input
                                        type="text"
                                        className={inputCls}
                                        placeholder={form.category === 'Travel' ? 'City / Country' : 'Office / Client site'}
                                        value={form.category === 'Travel' ? form.destination : form.location}
                                        onChange={e => form.category === 'Travel'
                                            ? setForm(f => ({ ...f, destination: e.target.value }))
                                            : setForm(f => ({ ...f, location: e.target.value }))
                                        }
                                    />
                                </div>
                            )}

                            {/* Reason */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {form.category === 'Leave' ? 'Reason' : form.category === 'Other' ? 'Description' : 'Purpose'} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    className={cn(inputCls, "resize-none")}
                                    placeholder="Briefly describe the reason…"
                                    value={form.reason}
                                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                />
                            </div>

                            {/* Days summary */}
                            {form.startDate && (
                                <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                                    Duration: <span className="font-bold text-foreground">{calcDays(form.startDate, form.endDate || form.startDate)} day(s)</span>
                                    {form.halfDay && ' (half day)'}
                                    {form.startDate && ` · ${format(new Date(form.startDate), 'dd MMM')}${form.endDate && form.endDate !== form.startDate ? ` – ${format(new Date(form.endDate), 'dd MMM yyyy')}` : ''}`}
                                </p>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-border">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Submit Request
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: HRMRequestCategory }) {
    const cfg = CATEGORIES.find(c => c.value === category);
    const Icon = cfg?.icon || FileText;
    return (
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", cfg?.color || 'bg-muted text-muted-foreground border-border')}>
            <Icon className="w-3 h-3" />{category}
        </span>
    );
}

function StatusBadge({ status }: { status: HRMRequestStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", cfg.color)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot, status === 'Pending' && 'animate-pulse')} />
            {cfg.label}
        </span>
    );
}

interface CardProps {
    req: any;
    isAdmin: boolean;
    tab: 'mine' | 'all';
    actionId: string | null;
    noteMap: Record<string, string>;
    setNoteMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onCancel: (id: string) => void;
}

function RequestCard({ req, isAdmin, tab, actionId, noteMap, setNoteMap, onApprove, onReject, onCancel }: CardProps) {
    const days = calcDays(req.startDate, req.endDate);
    const isProcessing = actionId === req._id;
    const [showNote, setShowNote] = useState(false);

    return (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{req.userName}</p>
                    {req.dept && <p className="text-[10px] text-muted-foreground">{req.dept}</p>}
                </div>
                <StatusBadge status={req.status} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={req.category} />
                {req.category === 'Leave' && req.leaveSubType && (
                    <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                        {req.leaveSubType}
                    </span>
                )}
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1 font-medium text-foreground">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {format(new Date(req.startDate), 'dd MMM')}{req.endDate !== req.startDate ? ` – ${format(new Date(req.endDate), 'dd MMM yyyy')}` : ` (${format(new Date(req.startDate), 'yyyy')})`}
                    <span className="text-muted-foreground">· {days}d{req.halfDay ? ' (½)' : ''}</span>
                </p>
                {req.destination && <p>✈ {req.destination}</p>}
                {req.location && <p>📍 {req.location}</p>}
                <p className="text-foreground/70 truncate" title={req.reason}>{req.reason}</p>
            </div>

            {/* Admin decision */}
            {isAdmin && tab === 'all' && req.status === 'Pending' && (
                <div className="space-y-2 pt-1 border-t border-border">
                    <button
                        onClick={() => setShowNote(s => !s)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                        <ChevronDown className={cn("w-3 h-3 transition-transform", showNote && 'rotate-180')} />
                        Add note (optional)
                    </button>
                    {showNote && (
                        <input
                            type="text"
                            placeholder="Approval / rejection note…"
                            className="w-full text-xs px-2 py-1.5 border border-border rounded-lg bg-background outline-none focus:ring-1 focus:ring-primary/20"
                            value={noteMap[req._id] || ''}
                            onChange={e => setNoteMap(m => ({ ...m, [req._id]: e.target.value }))}
                        />
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onApprove(req._id)}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-60"
                        >
                            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                        </button>
                        <button
                            onClick={() => onReject(req._id)}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-60"
                        >
                            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Employee cancel */}
            {tab === 'mine' && req.status === 'Pending' && (
                <button
                    onClick={() => onCancel(req._id)}
                    className="text-[10px] text-muted-foreground hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                    <XCircle className="w-3 h-3" />Cancel request
                </button>
            )}

            {/* Admin note */}
            {req.adminNote && (
                <p className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-lg italic">
                    Note: {req.adminNote}
                </p>
            )}
        </div>
    );
}

function RequestRow({ req, isAdmin, tab, actionId, noteMap, setNoteMap, onApprove, onReject, onCancel }: CardProps) {
    const days = calcDays(req.startDate, req.endDate);
    const isProcessing = actionId === req._id;

    return (
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Left: who + category */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 uppercase">
                    {req.userName.substring(0, 2)}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{req.userName}</p>
                        <CategoryBadge category={req.category} />
                        {req.category === 'Leave' && req.leaveSubType && (
                            <span className="text-[10px] text-muted-foreground">{req.leaveSubType}</span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {format(new Date(req.startDate), 'dd MMM')}
                        {req.endDate !== req.startDate ? ` – ${format(new Date(req.endDate), 'dd MMM yyyy')}` : ` · ${format(new Date(req.startDate), 'yyyy')}`}
                        {' '}· {days}d{req.halfDay ? ' (½)' : ''}
                        {req.destination ? ` · ✈ ${req.destination}` : ''}
                        {req.location ? ` · 📍 ${req.location}` : ''}
                        {' · '}{req.reason}
                    </p>
                    {req.adminNote && (
                        <p className="text-[10px] text-muted-foreground italic mt-0.5">Admin: {req.adminNote}</p>
                    )}
                </div>
            </div>

            {/* Right: status + actions */}
            <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={req.status} />
                {tab === 'mine' && req.status === 'Pending' && (
                    <button
                        onClick={() => onCancel(req._id)}
                        className="text-[10px] text-red-600 hover:text-red-700 font-medium flex items-center gap-0.5"
                    >
                        <X className="w-3 h-3" />Cancel
                    </button>
                )}
                {isAdmin && tab === 'all' && req.status === 'Pending' && (
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => onApprove(req._id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-60"
                        >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Approve
                        </button>
                        <button
                            onClick={() => onReject(req._id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-60"
                        >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            Reject
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
