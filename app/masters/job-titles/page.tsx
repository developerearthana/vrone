"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Briefcase, Loader2, Edit2, Check, X } from 'lucide-react';
import { getMasters, createMaster, updateMaster, deleteMaster } from '@/app/actions/masters';
import { toast } from 'sonner';

interface JobTitle {
    _id: string;
    label: string;
    value: string;
    metadata?: { description?: string };
}

export default function JobTitlesMaster() {
    const [titles, setTitles] = useState<JobTitle[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    useEffect(() => { loadTitles(); }, []);

    const loadTitles = async () => {
        setLoading(true);
        const res = await getMasters('JobTitle');
        if (res.success && res.data) setTitles(res.data);
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setSaving(true);
        const res = await createMaster({
            type: 'JobTitle',
            label: newName.trim(),
            value: newName.trim(),
            isActive: true,
            metadata: { description: newDesc },
        } as any);
        if (res.success) {
            toast.success('Job title added');
            setNewName('');
            setNewDesc('');
            setShowAddForm(false);
            loadTitles();
        } else {
            toast.error(res.error || 'Failed to add job title');
        }
        setSaving(false);
    };

    const handleEditSave = async (id: string) => {
        const res = await updateMaster(id, {
            label: editName,
            value: editName,
            metadata: { description: editDesc },
        } as any);
        if (res.success) {
            toast.success('Job title updated');
            setEditingId(null);
            loadTitles();
        } else {
            toast.error(res.error || 'Failed to update');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        const res = await deleteMaster(id);
        if (res.success) {
            toast.success('Job title deleted');
            loadTitles();
        } else {
            toast.error(res.error || 'Failed to delete');
        }
    };

    return (
        <div className="space-y-6 p-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Job Titles</h1>
                    <p className="text-muted-foreground mt-1">Define designations and job titles used when adding employees.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm shadow-md shadow-primary/20 w-full sm:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    Add Job Title
                </button>
            </div>

            <div className="glass-card rounded-xl overflow-hidden border border-border shadow-sm bg-card">
                {showAddForm && (
                    <div className="p-4 border-b border-border bg-muted/30 animate-in fade-in slide-in-from-top-2">
                        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Job Title / Designation *</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="e.g. Senior Engineer, Project Manager..."
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</label>
                                <input
                                    type="text"
                                    className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Short description (optional)"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddForm(false); setNewName(''); setNewDesc(''); }}
                                    className="px-4 py-2 border border-border bg-card text-muted-foreground rounded-lg text-sm hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Job Title / Designation</th>
                                    <th className="px-6 py-3 font-semibold">Description</th>
                                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {titles.map(title => (
                                    <tr key={title._id} className="group hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {editingId === title._id ? (
                                                <input
                                                    autoFocus
                                                    className="border border-border rounded-lg px-2 py-1 text-sm bg-background w-full focus:ring-2 focus:ring-primary/20 outline-none"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                />
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Briefcase className="w-4 h-4 text-primary/50 group-hover:text-primary transition-colors" />
                                                    {title.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {editingId === title._id ? (
                                                <input
                                                    className="border border-border rounded-lg px-2 py-1 text-sm bg-background w-full focus:ring-2 focus:ring-primary/20 outline-none"
                                                    value={editDesc}
                                                    onChange={e => setEditDesc(e.target.value)}
                                                    placeholder="Description"
                                                />
                                            ) : (
                                                title.metadata?.description || <span className="text-muted-foreground/40">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {editingId === title._id ? (
                                                    <>
                                                        <button onClick={() => handleEditSave(title._id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Save">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors" title="Cancel">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => { setEditingId(title._id); setEditName(title.label); setEditDesc(title.metadata?.description || ''); }}
                                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(title._id, title.label)}
                                                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {titles.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-10 text-center text-muted-foreground">
                                            No job titles yet. Click "Add Job Title" to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
