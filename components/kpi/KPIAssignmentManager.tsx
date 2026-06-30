"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Target, Plus, Loader2, CheckCircle2, Clock, AlertCircle,
    TrendingUp, Users, User, Trash2, Edit3, ChevronDown, X, Check, ChevronsUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format, isPast, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    createKPIAssignment, getAllKPIAssignments, getMyKPIAssignments,
    updateKPIAssignment, deleteKPIAssignment
} from '@/app/actions/kpi-assignments';
import { getKPITemplates } from '@/app/actions/kpi';
import { getTeams } from '@/app/actions/organization';
import { getAllUsers } from '@/app/actions/user';

function safeDate(val: unknown): Date | null {
    if (!val) return null;
    const d = typeof val === 'string' ? parseISO(val) : new Date(val as any);
    return isValid(d) ? d : null;
}

const STATUS_COLORS: Record<string, string> = {
    'Not Started': 'bg-gray-100 text-gray-700 border-gray-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Missed': 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_COLORS: Record<string, string> = {
    Low: 'bg-gray-50 text-gray-600',
    Medium: 'bg-amber-50 text-amber-700',
    High: 'bg-red-50 text-red-700',
};

const METRICS = [
    'Revenue', 'Leads Generated', 'Deals Closed', 'Customer Satisfaction',
    'Employee Retention', 'Tasks Completed', 'Projects Delivered', 'Response Time',
    'Sales Growth', 'Cost Reduction', 'Attendance Rate', 'Custom Metric',
];

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
    assignedToUser?: { _id: string; name: string; email: string; role: string; dept: string; image?: string };
    assignedToTeam?: { _id: string; name: string };
    assignedBy?: { _id: string; name: string };
    completedAt?: string;
    createdAt: string;
}

const defaultForm = {
    title: '',
    description: '',
    metric: '',
    unit: 'Count',
    target: 100,
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    frequency: 'Monthly',
    dueDate: '',
    assignType: 'user' as 'user' | 'team',
    assignedToUser: '',
    assignedToTeam: '',
};

export default function KPIAssignmentManager() {
    const [kpis, setKpis] = useState<KPIAssignment[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [form, setForm] = useState(defaultForm);
    const [metricOpen, setMetricOpen] = useState(false);
    const [kpiTemplates, setKpiTemplates] = useState<string[]>(METRICS);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [kpisRes, teamsData, usersData, templatesRes] = await Promise.all([
                getMyKPIAssignments(),
                getTeams(),
                getAllUsers(),
                getKPITemplates(),
            ]);
            if (kpisRes?.success) setKpis(kpisRes.data ?? []);
            setTeams(Array.isArray(teamsData) ? teamsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            if (templatesRes?.success && Array.isArray(templatesRes.data)) {
                const templateNames = (templatesRes.data as any[]).map((t) => t.name as string);
                setKpiTemplates(Array.from(new Set([...templateNames, ...METRICS])));
            } else {
                setKpiTemplates(METRICS);
            }
        } catch {
            toast.error('Failed to load KPI data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditingId(null);
        setForm(defaultForm);
        setSheetOpen(true);
    };

    const openEdit = (kpi: KPIAssignment) => {
        setEditingId(kpi._id);
        setForm({
            title: kpi.title,
            description: kpi.description || '',
            metric: kpi.metric,
            unit: kpi.unit,
            target: kpi.target,
            priority: kpi.priority as any,
            frequency: kpi.frequency,
            dueDate: safeDate(kpi.dueDate) ? format(safeDate(kpi.dueDate)!, 'yyyy-MM-dd') : '',
            assignType: kpi.assignedToTeam ? 'team' : 'user',
            assignedToUser: kpi.assignedToUser?._id || '',
            assignedToTeam: kpi.assignedToTeam?._id || '',
        });
        setSheetOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Use metric as title if title is empty
        const submissionTitle = form.title || form.metric;
        if (!submissionTitle || !form.metric || !form.dueDate) {
            toast.error('Please fill in required fields');
            return;
        }
        if (form.assignType === 'user' && !form.assignedToUser) {
            toast.error('Please select a user');
            return;
        }
        if (form.assignType === 'team' && !form.assignedToTeam) {
            toast.error('Please select a team');
            return;
        }

        setSaving(true);
        try {
            let res;
            if (editingId) {
                res = await updateKPIAssignment({
                    id: editingId,
                    title: submissionTitle,
                    description: form.description,
                    target: form.target,
                    dueDate: form.dueDate,
                    priority: form.priority,
                });
            } else {
                res = await createKPIAssignment({
                    title: submissionTitle,
                    description: form.description,
                    metric: form.metric,
                    unit: form.unit,
                    target: form.target,
                    priority: form.priority,
                    frequency: form.frequency,
                    dueDate: form.dueDate,
                    assignedToUser: form.assignType === 'user' ? form.assignedToUser : undefined,
                    assignedToTeam: form.assignType === 'team' ? form.assignedToTeam : undefined,
                });
            }

            if (res.success) {
                toast.success(editingId ? 'KPI updated' : 'KPI assigned successfully ✅');
                setSheetOpen(false);
                load();
            } else {
                toast.error(res.error || 'Failed');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this KPI assignment?')) return;
        const res = await deleteKPIAssignment(id);
        if (res.success) { toast.success('Deleted'); load(); }
        else toast.error(res.error || 'Delete failed');
    };

    const filtered = kpis.filter(k => {
        const statusOk = filterStatus === 'All' || k.status === filterStatus;
        const typeOk = filterType === 'All' ||
            (filterType === 'User' && k.assignedToUser) ||
            (filterType === 'Team' && k.assignedToTeam);
        return statusOk && typeOk;
    });

    const stats = {
        total: kpis.length,
        completed: kpis.filter(k => k.status === 'Completed').length,
        inProgress: kpis.filter(k => k.status === 'In Progress').length,
        notStarted: kpis.filter(k => k.status === 'Not Started').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">KPI Assignments</h2>
                        <p className="text-sm text-gray-500">Assign KPIs to users or teams</p>
                    </div>
                </div>
                <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> Assign KPI
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, icon: Target, color: 'text-gray-700 bg-gray-50 border-gray-200' },
                    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                    { label: 'Not Started', value: stats.notStarted, icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                ].map(s => (
                    <div key={s.label} className={cn('rounded-xl border p-4 flex items-center gap-3', s.color)}>
                        <s.icon className="w-5 h-5 shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{s.value}</p>
                            <p className="text-xs font-medium">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 bg-white border rounded-xl p-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Status:</span>
                    {['All', 'Not Started', 'In Progress', 'Completed', 'Missed'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-all', filterStatus === s ? 'bg-primary text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50')}
                        >{s}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs font-bold text-gray-500 uppercase">Type:</span>
                    {['All', 'User', 'Team'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-all', filterType === t ? 'bg-primary text-white' : 'text-gray-600 border border-gray-200 hover:bg-gray-50')}
                        >{t}</button>
                    ))}
                </div>
            </div>

            {/* KPI List */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                    <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-500">No KPI assignments found</p>
                    <p className="text-sm text-gray-400 mt-1">Click &quot;Assign KPI&quot; to get started</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
                    <div className="min-w-[1000px]">
                        <div className="grid grid-cols-12 gap-0 px-4 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            <div className="col-span-1 border-r border-gray-200 px-2 flex items-center">S.No</div>
                            <div className="col-span-2 border-r border-gray-200 px-2 flex items-center">KPI Name</div>
                            <div className="col-span-2 border-r border-gray-200 px-2 flex items-center">Assigned To</div>
                            <div className="col-span-2 border-r border-gray-200 px-2 flex items-center">Target/Actual</div>
                            <div className="col-span-1 border-r border-gray-200 px-2 flex items-center">Unit</div>
                            <div className="col-span-1 border-r border-gray-200 px-2 flex items-center">Freq</div>
                            <div className="col-span-2 border-r border-gray-200 px-2 flex items-center">Status & Due</div>
                            <div className="col-span-1 px-2 flex items-center justify-center">Actions</div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {filtered.map((kpi, index) => {
                                const due = safeDate(kpi.dueDate);
                                const overdue = kpi.status !== 'Completed' && !!due && isPast(due);
                                return (
                                    <div key={kpi._id} className="grid grid-cols-12 gap-0 px-4 py-2.5 items-center hover:bg-gray-50/80 transition-colors group">
                                        <div className="col-span-1 border-r border-gray-100 h-full flex items-center px-2 text-[11px] text-gray-400">
                                            {index + 1}
                                        </div>
                                        
                                        <div className="col-span-2 border-r border-gray-100 h-full flex flex-col justify-center px-2 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-[12px] truncate uppercase tracking-tight leading-tight">{kpi.title}</h4>
                                            <span className="text-[9px] text-gray-400 truncate mt-0.5">{kpi.metric}</span>
                                        </div>

                                        <div className="col-span-2 border-r border-gray-100 h-full flex items-center px-2">
                                            <span className="text-[11px] font-medium text-gray-700 truncate">
                                                {kpi.assignedToTeam ? kpi.assignedToTeam.name : kpi.assignedToUser?.name || '—'}
                                            </span>
                                        </div>

                                        <div className="col-span-2 border-r border-gray-100 h-full flex flex-col justify-center px-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-gray-600">{kpi.actual} / {kpi.target}</span>
                                                <span className="text-[9px] font-bold text-primary">{Math.round(kpi.progress)}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn('h-full transition-all', kpi.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary')}
                                                    style={{ width: `${kpi.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-1 border-r border-gray-100 h-full flex items-center px-2">
                                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">{kpi.unit}</span>
                                        </div>

                                        <div className="col-span-1 border-r border-gray-100 h-full flex items-center px-2">
                                            <span className="text-[10px] text-gray-500">{kpi.frequency}</span>
                                        </div>

                                        <div className="col-span-2 border-r border-gray-100 h-full flex flex-col justify-center px-2 gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn('px-1.5 py-0 flex items-center text-[8px] font-black uppercase rounded border leading-none h-3.5', STATUS_COLORS[kpi.status])}>
                                                    {kpi.status}
                                                </span>
                                                {overdue && (
                                                    <span className="px-1.5 py-0 flex items-center text-[8px] font-black uppercase bg-red-100 text-red-700 h-3.5">
                                                        Over
                                                    </span>
                                                )}
                                            </div>
                                            <span className={cn('text-[9px] font-bold', overdue ? 'text-red-500' : 'text-gray-500')}>
                                                {due ? format(due, 'dd MMM yy') : '—'}
                                            </span>
                                        </div>

                                        <div className="col-span-1 flex justify-center items-center gap-1 px-1">
                                            <button
                                                onClick={() => openEdit(kpi)}
                                                className="p-1 px-2 text-[10px] font-black text-primary hover:bg-primary/10 rounded transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(kpi._id)}
                                                className="p-1 px-2 text-[10px] font-black text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                Del
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Edit Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            {editingId ? 'Edit KPI Assignment' : 'Assign New KPI'}
                        </SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                        {/* Removed Title and Description fields as per request */}


                        {/* Metric + Unit */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 relative flex flex-col z-50">
                                <Label className="mb-1">Metric *</Label>
                                <div className="relative">
                                    <Input 
                                        required
                                        placeholder="Search or enter metric..."
                                        value={form.metric}
                                        onChange={e => {
                                            setForm(p => ({ ...p, metric: e.target.value }));
                                            setMetricOpen(true);
                                        }}
                                        onFocus={() => setMetricOpen(true)}
                                        onBlur={() => setTimeout(() => setMetricOpen(false), 200)}
                                        className="w-full pr-8 bg-white"
                                    />
                                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                                {metricOpen && (
                                    <div className="absolute top-[100%] left-0 w-full mt-1 bg-white border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto z-[200]">
                                        {kpiTemplates
                                            .filter(m => m.toLowerCase().includes(form.metric.toLowerCase()))
                                            .map(m => (
                                                <div 
                                                    key={m}
                                                    className="px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors border-b border-border/50 last:border-0"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setForm(p => ({ ...p, metric: m }));
                                                        setMetricOpen(false);
                                                    }}
                                                >
                                                    {m}
                                                </div>
                                            ))}
                                        {form.metric && !kpiTemplates.some(m => m.toLowerCase() === form.metric.toLowerCase()) && (
                                            <div 
                                                className="px-3 py-2.5 text-sm cursor-pointer bg-gray-50 text-primary font-medium hover:bg-gray-100"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setMetricOpen(false);
                                                }}
                                            >
                                                Use custom metric: "{form.metric}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unit</Label>
                                <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {['Count', '%', 'INR', 'USD', 'Hours', 'Days', 'Rating'].map(u => (
                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Target + Priority */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Target Value *</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    required
                                    value={form.target}
                                    onChange={e => setForm(p => ({ ...p, target: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as any }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {['Low', 'Medium', 'High'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Frequency + Due Date */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Frequency</Label>
                                <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))} disabled={!!editingId}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(f => (
                                            <SelectItem key={f} value={f}>{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Due Date *</Label>
                                <Input
                                    type="date"
                                    required
                                    value={form.dueDate}
                                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Assign To — only for create */}
                        {!editingId && (
                            <div className="space-y-3 border-t pt-4">
                                <Label className="text-sm font-bold">Assign To *</Label>
                                <div className="flex gap-2">
                                    {(['user', 'team'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, assignType: t, assignedToUser: '', assignedToTeam: '' }))}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all flex items-center justify-center gap-2',
                                                form.assignType === t
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            )}
                                        >
                                            {t === 'user' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                            {t === 'user' ? 'Individual User' : 'Team'}
                                        </button>
                                    ))}
                                </div>

                                {form.assignType === 'user' ? (
                                    <Select value={form.assignedToUser} onValueChange={v => setForm(p => ({ ...p, assignedToUser: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
                                        <SelectContent className="bg-white max-h-60">
                                            {users.map(u => (
                                                <SelectItem key={u._id} value={u._id}>
                                                    {`${u.name}${u.dept ? ` (${u.dept})` : ''}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Select value={form.assignedToTeam} onValueChange={v => setForm(p => ({ ...p, assignedToTeam: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select a team..." /></SelectTrigger>
                                        <SelectContent className="bg-white max-h-60">
                                            {teams.map(t => (
                                                <SelectItem key={t._id || t.id} value={t._id || t.id}>
                                                    {`${t.name} (${t.members?.length ?? 0} members)`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2 border-t">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-primary" disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingId ? 'Save Changes' : 'Assign KPI'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
