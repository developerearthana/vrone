"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, BarChart3, Loader2, Save } from 'lucide-react';
import { getMasters, createMaster, deleteMaster } from '@/app/actions/masters';
import { toast } from 'sonner';

interface KPIMetric {
    _id: string;
    label: string;
    value: string;
    type: string;
    order?: number;
    metadata?: { unit?: string; frequency?: string };
}

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

export default function KPIMetricsMaster() {
    const [metrics, setMetrics] = useState<KPIMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newMetric, setNewMetric] = useState('');
    const [newUnit, setNewUnit] = useState('');
    const [newFrequency, setNewFrequency] = useState('Monthly');

    useEffect(() => { loadMetrics(); }, []);

    const loadMetrics = async () => {
        setLoading(true);
        const res = await getMasters('KPIMetric');
        if (res.success && res.data) {
            setMetrics(res.data);
        }
        setLoading(false);
    };

    const addMetric = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMetric || !newUnit) return;
        setSaving(true);
        const res = await createMaster({
            type: 'KPIMetric',
            label: newMetric,
            value: newMetric,
            isActive: true,
            metadata: { unit: newUnit, frequency: newFrequency }
        } as any);
        if (res.success) {
            toast.success('KPI metric added');
            setNewMetric('');
            setNewUnit('');
            setNewFrequency('Monthly');
            loadMetrics();
        } else {
            toast.error(res.error || 'Failed to add metric');
        }
        setSaving(false);
    };

    const deleteMetric = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        const res = await deleteMaster(id);
        if (res.success) {
            toast.success('Metric deleted');
            loadMetrics();
        } else {
            toast.error(res.error || 'Failed to delete');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-2">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">KPI Metrics Configuration</h1>
                <p className="text-muted-foreground mt-1">Define standard metrics for performance tracking across the organization.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Metrics Table */}
                <div className="md:col-span-2">
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
                                        <th className="p-4 font-semibold">Metric Name</th>
                                        <th className="p-4 font-semibold">Unit</th>
                                        <th className="p-4 font-semibold">Frequency</th>
                                        <th className="p-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {metrics.map((metric) => (
                                        <tr key={metric._id} className="hover:bg-muted/20 group transition-colors">
                                            <td className="p-4 font-medium text-foreground flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-primary/60" />
                                                {metric.label}
                                            </td>
                                            <td className="p-4 text-muted-foreground">{(metric as any).metadata?.unit || '—'}</td>
                                            <td className="p-4 text-muted-foreground">{(metric as any).metadata?.frequency || '—'}</td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => deleteMetric(metric._id, metric.label)}
                                                    className="text-muted-foreground hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    aria-label={`Delete ${metric.label}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {metrics.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-muted-foreground">
                                                No KPI metrics defined yet. Add your first metric →
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Form */}
                <div>
                    <div className="glass-card p-6 rounded-xl space-y-4 border border-border shadow-sm sticky top-6 bg-card">
                        <h3 className="font-semibold text-foreground border-b border-border pb-3">Add New Metric</h3>
                        <form onSubmit={addMetric} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Metric Name *</label>
                                <input
                                    type="text"
                                    value={newMetric}
                                    onChange={(e) => setNewMetric(e.target.value)}
                                    placeholder="e.g. Churn Rate"
                                    className="w-full p-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Unit *</label>
                                <input
                                    type="text"
                                    value={newUnit}
                                    onChange={(e) => setNewUnit(e.target.value)}
                                    placeholder="e.g. Percentage, Currency"
                                    className="w-full p-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Frequency</label>
                                <select
                                    value={newFrequency}
                                    onChange={(e) => setNewFrequency(e.target.value)}
                                    aria-label="Frequency"
                                    className="w-full p-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add Metric
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
