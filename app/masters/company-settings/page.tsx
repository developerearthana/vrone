"use client";

import { useState, useEffect } from 'react';
import { Settings, Globe, Clock, IndianRupee, Calendar, Briefcase, CheckCircle, Loader2, Save } from 'lucide-react';
import { getMasters, updateMaster, seedMasters } from '@/app/actions/masters';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const GROUP_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    General:    { label: 'General',    icon: Globe,         color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
    Attendance: { label: 'Attendance', icon: Clock,         color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    Finance:    { label: 'Finance',    icon: IndianRupee,   color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

interface Setting {
    _id: string;
    label: string;
    value: string;
    metadata?: { description?: string; group?: string; symbol?: string };
}

export default function CompanySettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [editing, setEditing] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        // Ensure defaults are seeded before loading
        await seedMasters();
        const res = await getMasters('CompanySettings');
        if (res.success) setSettings(res.data as Setting[]);
        setLoading(false);
    };

    const startEdit = (s: Setting) => {
        setEditing(prev => ({ ...prev, [s._id]: s.value }));
    };

    const cancelEdit = (id: string) => {
        setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const save = async (s: Setting) => {
        const newVal = editing[s._id]?.trim();
        if (!newVal || newVal === s.value) { cancelEdit(s._id); return; }
        setSaving(s._id);
        try {
            const res = await updateMaster(s._id, { value: newVal });
            if (res.success) {
                setSettings(prev => prev.map(x => x._id === s._id ? { ...x, value: newVal } : x));
                cancelEdit(s._id);
                toast.success(`${s.label} updated`);
            } else {
                toast.error(res.error || 'Failed to save');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setSaving(null);
        }
    };

    // Group settings by metadata.group
    const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
        const g = s.metadata?.group || 'General';
        (acc[g] = acc[g] || []).push(s);
        return acc;
    }, {});

    if (loading) {
        return (
            <PageWrapper>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper className="max-w-3xl mx-auto space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Company Settings</h1>
                    <p className="page-subtitle">Configure timezone, currency, attendance rules, and financial settings.</p>
                </div>
            </div>

            {Object.entries(GROUP_META).map(([groupKey, meta]) => {
                const rows = grouped[groupKey];
                if (!rows?.length) return null;
                const Icon = meta.icon;
                return (
                    <div key={groupKey} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className={cn('flex items-center gap-3 px-5 py-3.5 border-b border-border', meta.bg)}>
                            <div className={cn('p-1.5 rounded-lg bg-white/60 dark:bg-black/20', meta.color)}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <h2 className={cn('font-semibold text-sm', meta.color)}>{meta.label}</h2>
                        </div>

                        <div className="divide-y divide-border">
                            {rows.map(s => {
                                const isEditing = s._id in editing;
                                const isSaving = saving === s._id;

                                return (
                                    <div key={s._id} className="flex items-center gap-4 px-5 py-4 group hover:bg-muted/30 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground">{s.label}</p>
                                            {s.metadata?.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{s.metadata.description}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        autoFocus
                                                        value={editing[s._id]}
                                                        onChange={e => setEditing(prev => ({ ...prev, [s._id]: e.target.value }))}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') save(s);
                                                            if (e.key === 'Escape') cancelEdit(s._id);
                                                        }}
                                                        className="w-40 px-3 py-1.5 text-sm border border-primary/40 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                    <button
                                                        onClick={() => save(s)}
                                                        disabled={isSaving}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                                                    >
                                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => cancelEdit(s._id)}
                                                        className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-mono font-medium text-foreground bg-muted px-2.5 py-1 rounded-lg">
                                                        {s.metadata?.symbol ? `${s.metadata.symbol} ` : ''}{s.value}
                                                    </span>
                                                    <button
                                                        onClick={() => startEdit(s)}
                                                        className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all"
                                                    >
                                                        Edit
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <p className="text-xs text-muted-foreground text-center pb-4">
                Changes take effect immediately. Attendance thresholds apply on the next data load.
            </p>
        </PageWrapper>
    );
}
