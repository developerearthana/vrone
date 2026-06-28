"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Target, User, BarChart3, Loader2 } from 'lucide-react';
import { getMasters, createMaster, deleteMaster } from '@/app/actions/masters';
import { getAllUsers } from '@/app/actions/user';
import { toast } from 'sonner';

interface KPITarget {
    _id: string;
    label: string;
    value: string;
    metadata?: { user?: string; metric?: string; target?: string; period?: string };
}

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];

export default function KPITargetsMaster() {
    const [targets, setTargets] = useState<KPITarget[]>([]);
    const [metrics, setMetrics] = useState<string[]>([]);
    const [users, setUsers] = useState<{ _id: string; name: string; email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedUser, setSelectedUser] = useState('');
    const [selectedMetric, setSelectedMetric] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [period, setPeriod] = useState('Monthly');

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        const [tRes, mRes, uData] = await Promise.all([
            getMasters('KPITarget'),
            getMasters('KPIMetric'),
            getAllUsers()
        ]);
        if (tRes.success) setTargets(tRes.data || []);
        if (mRes.success) setMetrics((mRes.data || []).map((m: any) => m.label));
        if (uData) setUsers(uData);
        if (metrics.length > 0 && !selectedMetric) setSelectedMetric(metrics[0]);
        setLoading(false);
    };

    const addTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !selectedMetric || !targetValue) {
            toast.error('All fields are required');
            return;
        }
        if (targets.some(t => t.metadata?.user === selectedUser && t.metadata?.metric === selectedMetric)) {
            toast.error('A target for this user and metric already exists');
            return;
        }
        setSaving(true);
        const res = await createMaster({
            type: 'KPITarget',
            label: `${selectedUser} – ${selectedMetric}`,
            value: `${selectedUser}-${selectedMetric}`,
            isActive: true,
            metadata: { user: selectedUser, metric: selectedMetric, target: targetValue, period }
        } as any);
        if (res.success) {
            toast.success('KPI target assigned');
            setTargetValue('');
            loadAll();
        } else {
            toast.error(res.error || 'Failed to assign target');
        }
        setSaving(false);
    };

    const deleteTarget = async (id: string, user: string) => {
        if (!confirm(`Delete target for "${user}"?`)) return;
        const res = await deleteMaster(id);
        if (res.success) {
            toast.success('Target removed');
            loadAll();
        } else {
            toast.error(res.error || 'Failed to delete');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-2">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Manage KPI Targets</h1>
                <p className="text-muted-foreground mt-1">Assign specific performance targets to users for automated tracking.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Targets Table */}
                <div className="md:col-span-2 space-y-4">
                    <div className="glass-card rounded-xl overflow-hidden border border-border shadow-sm">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[480px]">
                                <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-semibold">User</th>
                                        <th className="p-4 font-semibold">Metric</th>
                                        <th className="p-4 font-semibold">Target</th>
                                        <th className="p-4 font-semibold">Period</th>
                                        <th className="p-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {targets.map((target) => (
                                        <tr key={target._id} className="hover:bg-muted/20 group transition-colors">
                                            <td className="p-4 font-medium text-foreground flex items-center gap-2">
                                                <User className="w-4 h-4 text-primary/60" />
                                                {target.metadata?.user || target.label}
                                            </td>
                                            <td className="p-4 text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <BarChart3 className="w-3.5 h-3.5 text-muted-foreground/50" />
                                                    {target.metadata?.metric || '—'}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-foreground">{target.metadata?.target || '—'}</td>
                                            <td className="p-4 text-muted-foreground text-xs uppercase tracking-wide">{target.metadata?.period || '—'}</td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => deleteTarget(target._id, target.metadata?.user || target.label)}
                                                    className="text-muted-foreground hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    aria-label="Delete target"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {targets.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-center text-muted-foreground">
                                                No KPI targets assigned yet. Use the form to assign one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assign Form */}
                <div>
                    <div className="glass-card p-6 rounded-xl space-y-4 border border-border shadow-sm sticky top-6 bg-card">
                        <div className="flex items-center gap-2 border-b border-border pb-3">
                            <Target className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-foreground">Assign New Target</h3>
                        </div>
                        <form onSubmit={addTarget} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">User *</label>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full p-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                    aria-label="Select User"
                                >
                                    <option value="">Select User</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u.name}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Metric *</label>
                                <select
                                    value={selectedMetric}
                                    onChange={(e) => setSelectedMetric(e.target.value)}
                                    className="w-full p-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                    aria-label="Select Metric"
                                >
                                    <option value="">Select Metric</option>
                                    {metrics.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                {metrics.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">No KPI metrics defined. Add them in KPI Metrics first.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Target Value *</label>
                                    <input
                                        type="text"
                                        value={targetValue}
                                        onChange={(e) => setTargetValue(e.target.value)}
                                        placeholder="e.g. 5000"
                                        className="w-full p-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Period</label>
                                    <select
                                        value={period}
                                        onChange={(e) => setPeriod(e.target.value)}
                                        className="w-full p-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        aria-label="Select Period"
                                    >
                                        {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-primary/20"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Assign Target
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
