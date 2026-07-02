"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Mail, Phone, MoreHorizontal, Loader2, Trash2, ChevronRight, FileText } from 'lucide-react';
import { getCandidates, createCandidate, updateCandidateStage, deleteCandidate } from '@/app/actions/candidates';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Candidate {
    _id: string;
    name: string;
    positionApplied: string;
    status: 'Applied' | 'Screening' | 'Interview' | 'Selected' | 'Rejected';
    email: string;
    phone: string;
    resumeUrl?: string;
    interviewSchedule?: { date?: string; time?: string; interviewer?: string };
}

const STAGES = ['Applied', 'Screening', 'Interview', 'Selected', 'Rejected'] as const;

const STAGE_STYLES: Record<string, { header: string; dot: string }> = {
    Applied: { header: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
    Screening: { header: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    Interview: { header: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
    Selected: { header: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    Rejected: { header: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

export default function RecruitmentPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [menuId, setMenuId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', positionApplied: '', interviewDate: '' });

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getCandidates();
        if (res.success) setCandidates(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!form.name || !form.email || !form.positionApplied) {
            toast.error('Name, email and position are required');
            return;
        }
        setSaving(true);
        const res = await createCandidate(form);
        if (res.success) {
            toast.success('Candidate added');
            setShowModal(false);
            setForm({ name: '', email: '', phone: '', positionApplied: '', interviewDate: '' });
            load();
        } else {
            toast.error(res.error || 'Failed to add candidate');
        }
        setSaving(false);
    };

    const moveStage = async (c: Candidate, direction: 1 | -1) => {
        const idx = STAGES.indexOf(c.status);
        const nextIdx = idx + direction;
        if (nextIdx < 0 || nextIdx >= STAGES.length) return;
        const next = STAGES[nextIdx];
        setMenuId(null);
        // Optimistic
        setCandidates(prev => prev.map(x => x._id === c._id ? { ...x, status: next } : x));
        const res = await updateCandidateStage(c._id, next);
        if (!res.success) { toast.error('Failed to move'); load(); }
    };

    const setStage = async (c: Candidate, stage: Candidate['status']) => {
        setMenuId(null);
        setCandidates(prev => prev.map(x => x._id === c._id ? { ...x, status: stage } : x));
        const res = await updateCandidateStage(c._id, stage);
        if (!res.success) { toast.error('Failed to move'); load(); }
    };

    const handleDelete = async (c: Candidate) => {
        setMenuId(null);
        if (!confirm(`Remove ${c.name} from pipeline?`)) return;
        setCandidates(prev => prev.filter(x => x._id !== c._id));
        const res = await deleteCandidate(c._id);
        if (!res.success) { toast.error('Failed to delete'); load(); }
        else toast.success('Candidate removed');
    };

    return (
        <PageWrapper className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Recruitment Pipeline</h1>
                    <p className="page-subtitle">Manage candidates and interview schedules.</p>
                </div>
                <Button onClick={() => setShowModal(true)} className="w-fit">
                    <Plus className="w-4 h-4" /> Add Candidate
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
            ) : (
                <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory scroll-px-4 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
                    {STAGES.map(stage => {
                        const items = candidates.filter(c => c.status === stage);
                        const style = STAGE_STYLES[stage];
                        return (
                            <div key={stage} className="min-w-[300px] w-[300px] flex flex-col gap-3 shrink-0 snap-start">
                                <div className={cn('px-3.5 py-2.5 rounded-xl border flex justify-between items-center', style.header)}>
                                    <div className="flex items-center gap-2">
                                        <span className={cn('w-2 h-2 rounded-full', style.dot)} />
                                        <h3 className="font-semibold text-sm">{stage}</h3>
                                    </div>
                                    <span className="bg-white/70 px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    {items.map(candidate => (
                                        <div key={candidate._id} className="relative bg-card p-3.5 rounded-xl hover:shadow-md transition-shadow border border-border group">
                                            <div className="flex justify-between items-start mb-2.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                        {candidate.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-foreground text-sm truncate">{candidate.name}</h4>
                                                        <p className="text-xs text-primary font-medium truncate">{candidate.positionApplied}</p>
                                                    </div>
                                                </div>
                                                <button aria-label="Options" onClick={() => setMenuId(menuId === candidate._id ? null : candidate._id)}
                                                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>

                                                {menuId === candidate._id && (
                                                    <div className="absolute right-2 top-9 z-20 w-40 bg-popover border border-border rounded-lg shadow-lg p-1">
                                                        <p className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">Move to</p>
                                                        {STAGES.filter(s => s !== candidate.status).map(s => (
                                                            <button key={s} onClick={() => setStage(candidate, s)}
                                                                className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors">
                                                                {s}
                                                            </button>
                                                        ))}
                                                        <div className="h-px bg-border my-1" />
                                                        <button onClick={() => handleDelete(candidate)}
                                                            className="w-full text-left px-2 py-1.5 text-xs rounded-md text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5">
                                                            <Trash2 className="w-3 h-3" /> Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1 mb-2.5">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                                                    <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{candidate.email}</span>
                                                </div>
                                                {candidate.phone && candidate.phone !== 'N/A' && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Phone className="w-3 h-3 shrink-0" />{candidate.phone}
                                                    </div>
                                                )}
                                            </div>

                                            {candidate.interviewSchedule?.date && stage === 'Interview' && (
                                                <div className="mb-2.5 p-2 bg-purple-50 rounded-lg text-xs text-purple-700 flex items-center gap-2 border border-purple-100">
                                                    <Calendar className="w-3 h-3 shrink-0" />
                                                    {new Date(candidate.interviewSchedule.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    {candidate.interviewSchedule.time && ` · ${candidate.interviewSchedule.time}`}
                                                </div>
                                            )}

                                            <div className="pt-2.5 border-t border-border flex justify-between items-center">
                                                {candidate.resumeUrl ? (
                                                    <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> Resume
                                                    </a>
                                                ) : <span className="text-xs text-muted-foreground/50">No resume</span>}
                                                <button onClick={() => moveStage(candidate, 1)} disabled={stage === 'Rejected' || stage === 'Selected'}
                                                    className="text-xs bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground px-2 py-1 rounded-md transition-colors flex items-center gap-1 disabled:opacity-40 disabled:hover:bg-muted disabled:hover:text-muted-foreground">
                                                    Advance <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {items.length === 0 && (
                                        <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                                            No candidates
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Candidate Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-foreground mb-4">Add New Candidate</h3>
                        <div className="space-y-3.5">
                            {[
                                { key: 'name', label: 'Full Name', type: 'text', req: true, ph: 'e.g. Ravi Kumar' },
                                { key: 'email', label: 'Email', type: 'email', req: true, ph: 'ravi@example.com' },
                                { key: 'phone', label: 'Phone', type: 'text', req: false, ph: '+91 …' },
                                { key: 'positionApplied', label: 'Position Applied', type: 'text', req: true, ph: 'e.g. Frontend Developer' },
                                { key: 'interviewDate', label: 'Interview Date (optional)', type: 'date', req: false, ph: '' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                        {f.label}{f.req && <span className="text-red-500 ml-0.5">*</span>}
                                    </label>
                                    <input
                                        type={f.type}
                                        placeholder={f.ph}
                                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={(form as any)[f.key]}
                                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    />
                                </div>
                            ))}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button onClick={handleAdd} disabled={saving}>
                                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Candidate
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}
