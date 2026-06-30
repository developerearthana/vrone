"use client";

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, PlusCircle, TrendingUp, TrendingDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { KPI_LIBRARY, CATEGORY_CONFIG, KPITemplate, KPICategory } from '@/lib/kpi-library';
import { createKPIAssignment } from '@/app/actions/kpi-assignments';
import { getTeams } from '@/app/actions/organization';
import { getAllUsers } from '@/app/actions/user';

const ALL_CATEGORIES: KPICategory[] = ['Financial', 'HR', 'Operations', 'Sales', 'Customer', 'Quality', 'Growth'];

const defaultForm = {
    title: '',
    metric: '',
    description: '',
    unit: 'Count',
    target: 100,
    frequency: 'Monthly' as string,
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    category: 'Operations' as KPICategory,
    dueDate: '',
    assignType: 'user' as 'user' | 'team',
    assignedToUser: '',
    assignedToTeam: '',
};

export default function KPILibraryPage() {
    const [activeCategory, setActiveCategory] = useState<KPICategory | 'All'>('All');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<KPITemplate | null>(null);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [teamsData, usersData] = await Promise.all([getTeams(), getAllUsers()]);
            setTeams(teamsData || []);
            setUsers(usersData || []);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const openAssign = (template: KPITemplate) => {
        setSelectedTemplate(template);
        setForm({
            ...defaultForm,
            title: template.name,
            metric: template.name,
            description: template.description,
            unit: template.unit,
            target: template.defaultTarget,
            frequency: template.frequency,
            category: template.category,
        });
        setSheetOpen(true);
    };

    const openCustom = () => {
        setSelectedTemplate(null);
        setForm(defaultForm);
        setSheetOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.metric || !form.dueDate) {
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
            const res = await createKPIAssignment({
                title: form.title || form.metric,
                description: form.description,
                metric: form.metric,
                unit: form.unit,
                target: form.target,
                priority: form.priority,
                frequency: form.frequency,
                dueDate: form.dueDate,
                category: form.category,
                assignedToUser: form.assignType === 'user' ? form.assignedToUser : undefined,
                assignedToTeam: form.assignType === 'team' ? form.assignedToTeam : undefined,
            });
            if (res.success) {
                toast.success('KPI assigned successfully');
                setSheetOpen(false);
            } else {
                toast.error(res.error || 'Failed to assign KPI');
            }
        } finally {
            setSaving(false);
        }
    };

    const visibleKPIs = activeCategory === 'All'
        ? KPI_LIBRARY
        : KPI_LIBRARY.filter(k => k.category === activeCategory);

    const grouped = ALL_CATEGORIES.reduce<Record<KPICategory, KPITemplate[]>>((acc, cat) => {
        acc[cat] = visibleKPIs.filter(k => k.category === cat);
        return acc;
    }, {} as Record<KPICategory, KPITemplate[]>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">KPI Library</h1>
                        <p className="text-sm text-muted-foreground">{KPI_LIBRARY.length} industry-standard KPIs across 7 categories</p>
                    </div>
                </div>
                <Button onClick={openCustom} variant="outline" className="gap-2 shrink-0">
                    <PlusCircle className="w-4 h-4" /> Custom KPI
                </Button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                    onClick={() => setActiveCategory('All')}
                    className={cn(
                        'px-4 py-2 text-sm font-semibold rounded-lg border transition-all whitespace-nowrap shrink-0',
                        activeCategory === 'All'
                            ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}>
                    All ({KPI_LIBRARY.length})
                </button>
                {ALL_CATEGORIES.map(cat => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const count = KPI_LIBRARY.filter(k => k.category === cat).length;
                    const active = activeCategory === cat;
                    return (
                        <button key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                'px-4 py-2 text-sm font-semibold rounded-lg border transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5',
                                active
                                    ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}>
                            <span>{cfg.icon}</span> {cat} ({count})
                        </button>
                    );
                })}
            </div>

            {/* KPI Cards grouped by category */}
            {(activeCategory === 'All' ? ALL_CATEGORIES : [activeCategory]).map(cat => {
                const items = grouped[cat];
                if (!items?.length) return null;
                const cfg = CATEGORY_CONFIG[cat];
                return (
                    <div key={cat}>
                        <div className={cn('flex items-center gap-2 mb-3 px-1')}>
                            <span className={cn('text-sm font-bold px-3 py-1 rounded-full border', cfg.bg, cfg.color, cfg.border)}>
                                {cfg.icon} {cfg.label}
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {items.map(kpi => (
                                <div key={kpi.id}
                                    className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm text-foreground leading-tight">{kpi.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{kpi.frequency}</span>
                                                <span className="text-[10px] text-muted-foreground">&middot;</span>
                                                <span className="text-[10px] font-semibold text-muted-foreground">
                                                    Target: {kpi.defaultTarget.toLocaleString()} {kpi.unit}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {kpi.higherIsBetter
                                                ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                : <TrendingDown className="w-4 h-4 text-amber-500" />}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{kpi.description}</p>
                                    <Button
                                        size="sm"
                                        onClick={() => openAssign(kpi)}
                                        className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white border-0 transition-all font-semibold text-xs h-8">
                                        Assign Now
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Assign Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-primary" />
                            {selectedTemplate ? `Assign: ${selectedTemplate.name}` : 'Custom KPI Assignment'}
                        </SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label>KPI Title *</Label>
                            <Input
                                required
                                placeholder="e.g. Q3 Revenue Growth"
                                value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            />
                        </div>

                        {/* Metric + Unit */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Metric *</Label>
                                <Input
                                    required
                                    placeholder="What to measure"
                                    value={form.metric}
                                    onChange={e => setForm(p => ({ ...p, metric: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unit</Label>
                                <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {['Count', '%', '₹', 'Score', 'Days', 'Hours', 'NPS', 'x'].map(u => (
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

                        {/* Category + Frequency */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as KPICategory }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {ALL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].icon} {c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Frequency</Label>
                                <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(f => (
                                            <SelectItem key={f} value={f}>{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <Label>Due Date *</Label>
                            <Input
                                type="date"
                                required
                                value={form.dueDate}
                                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <textarea
                                className="w-full border border-border rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                                rows={2}
                                placeholder="Optional notes or context..."
                                value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>

                        {/* Assign To */}
                        <div className="space-y-3 border-t border-border pt-4">
                            <Label className="font-bold">Assign To *</Label>
                            <div className="flex gap-2">
                                {(['user', 'team'] as const).map(t => (
                                    <button key={t} type="button"
                                        onClick={() => setForm(p => ({ ...p, assignType: t, assignedToUser: '', assignedToTeam: '' }))}
                                        className={cn(
                                            'flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all',
                                            form.assignType === t
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-border text-muted-foreground hover:border-muted-foreground'
                                        )}>
                                        {t === 'user' ? 'Individual' : 'Team'}
                                    </button>
                                ))}
                            </div>
                            {form.assignType === 'user' ? (
                                <Select value={form.assignedToUser} onValueChange={v => setForm(p => ({ ...p, assignedToUser: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
                                    <SelectContent className="bg-white max-h-60">
                                        {users.map(u => (
                                            <SelectItem key={u._id} value={u._id}>
                                                {u.name} <span className="text-muted-foreground text-xs">({u.dept} · {u.role})</span>
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
                                                {t.name} <span className="text-muted-foreground text-xs">({t.members?.length || 0} members)</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2 border-t border-border">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-primary" disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Assign KPI
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
