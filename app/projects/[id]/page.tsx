"use client";

import { use, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Clock, LayoutDashboard, Loader2, MapPin, Pencil, Plus, Search, Settings, Trash2, UserMinus, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProjectById, updateProject, deleteProject, recalculateProjectProgress } from '@/app/actions/project';
import { getProjectTemplateByName } from '@/app/actions/project-templates';
import { getUsers } from '@/app/actions/hrm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [project, setProject] = useState<any>(null);
    const [stages, setStages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    // Edit state
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    // Delete state
    const [showDelete, setShowDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Team management state
    const [showTeam, setShowTeam] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [teamSearch, setTeamSearch] = useState('');
    const [savingTeam, setSavingTeam] = useState(false);

    useEffect(() => {
        const load = async () => {
            const res = await getProjectById(id);
            if (res.success && res.data) {
                const proj = res.data;
                setProject(proj);
                setEditForm({
                    name: proj.name || '',
                    client: proj.client || '',
                    status: proj.status || 'Planning',
                    priority: proj.priority || 'Medium',
                    endDate: proj.endDate ? new Date(proj.endDate).toISOString().split('T')[0] : '',
                    description: proj.description || '',
                });

                if (proj.template) {
                    const tRes = await getProjectTemplateByName(proj.template);
                    if (tRes.success && tRes.data) {
                        const sorted = [...(tRes.data.stages || [])].sort((a, b) => a.order - b.order)
                            .map((s: any, i: number) => ({ ...s, id: s.id || `fallback-${i}` }));
                        setStages(sorted);
                    }
                }

                // Recalculate and get real progress
                const progRes = await recalculateProjectProgress(id);
                if (progRes.success) setProgress(progRes.progress ?? proj.progress ?? 0);
                else setProgress(proj.progress ?? 0);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    const openTeamModal = async () => {
        if (allUsers.length === 0) {
            const res = await getUsers();
            if (res.success) setAllUsers(res.data || []);
        }
        setTeamSearch('');
        setShowTeam(true);
    };

    const toggleMember = async (userId: string) => {
        const current: any[] = project.teamMembers || [];
        const ids: string[] = current.map((m: any) => m._id || m);
        const next = ids.includes(userId) ? ids.filter(id => id !== userId) : [...ids, userId];
        setSavingTeam(true);
        const res = await updateProject(id, { teamMembers: next });
        if (res.success) {
            const updatedMembers = allUsers.filter(u => next.includes(u._id));
            setProject((p: any) => ({ ...p, teamMembers: updatedMembers }));
            toast.success(ids.includes(userId) ? 'Member removed' : 'Member added');
        } else {
            toast.error(res.error || 'Failed to update team');
        }
        setSavingTeam(false);
    };

    const handleSaveEdit = async () => {
        if (!editForm.name || !editForm.client) { toast.error("Name and Client are required"); return; }
        setSaving(true);
        const res = await updateProject(id, editForm);
        if (res.success) {
            setProject((p: any) => ({ ...p, ...editForm }));
            setShowEdit(false);
            toast.success("Project updated");
        } else {
            toast.error(res.error || "Failed to update project");
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        const res = await deleteProject(id);
        if (res.success) {
            toast.success("Project deleted");
            router.push('/projects');
        } else {
            toast.error(res.error || "Failed to delete project");
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
                <p className="text-muted-foreground">Project not found.</p>
                <Link href="/projects" className="text-sm text-blue-600 hover:underline">Back to Projects</Link>
            </div>
        );
    }

    const dueDate = project.endDate
        ? new Date(project.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'No Due Date';

    return (
        <div className="w-full max-w-full space-y-3 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link href="/projects" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Projects
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-lg font-bold text-gray-900 truncate">{project.name}</h1>
                            <span className="px-2 py-0.5 bg-white text-blue-700 text-xs font-semibold rounded-full border border-border shrink-0">
                                {project.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {project.client}
                            </div>
                            {project.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {project.location}
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Due: {dueDate}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => setShowEdit(true)}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-background transition-colors flex items-center gap-1.5"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                        </button>
                        <button
                            onClick={() => setShowDelete(true)}
                            className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                        <button className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-background transition-colors flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5" />
                            Settings
                        </button>
                        <Link
                            href={`/projects/${id}/stages`}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:brightness-[1.08] transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            Full Workflow
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stage Chain Widget */}
            {stages.length > 0 && (
                <div className="w-full min-w-0 glass-card p-4 rounded-2xl border border-gray-200 shadow-sm bg-gradient-to-br from-white to-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Project Workflow</h2>
                            <p className="text-xs text-gray-500">
                                Template: <span className="text-blue-600 font-medium">{project.template}</span>
                                {stages.find((s: any) => !(project.completedStageIds || []).includes(s.id)) && (
                                    <> &mdash; Current: <span className="text-blue-600 font-medium">
                                        {stages.find((s: any) => !(project.completedStageIds || []).includes(s.id))?.name}
                                    </span></>
                                )}
                            </p>
                        </div>
                        {/* Overall progress badge */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Overall</span>
                            <span className={cn(
                                "text-lg font-bold",
                                progress === 100 ? 'text-green-600' : progress >= 50 ? 'text-blue-600' : 'text-gray-700'
                            )}>{progress}%</span>
                        </div>
                    </div>

                    {/* Mini progress bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500", progress === 100 ? 'bg-green-500' : 'bg-blue-600')}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="overflow-x-auto w-full">
                        <div className="flex gap-4 px-1 py-2" style={{ width: 'max-content' }}>
                            {stages.map((stage: any, index: number) => {
                                const completedIds: string[] = project.completedStageIds || [];
                                const isCompleted = completedIds.includes(stage.id);
                                const currentIdx = stages.findIndex((s: any) => !completedIds.includes(s.id));
                                const isCurrent = !isCompleted && index === currentIdx;

                                return (
                                    <Link
                                        key={stage.id}
                                        href={`/projects/${id}/stages/${stage.id}`}
                                        className="group flex flex-col items-center w-[100px] cursor-pointer"
                                    >
                                        <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-300 bg-white
                                            ${isCompleted ? 'border-green-500 text-green-500' :
                                                isCurrent ? 'border-blue-600 text-blue-600 shadow-md ring-2 ring-blue-100' :
                                                    'border-gray-200 text-gray-300 group-hover:border-gray-300'}`
                                        }>
                                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
                                                isCurrent ? <Clock className="w-5 h-5 animate-pulse" /> :
                                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />}
                                        </div>
                                        <div className="mt-2 text-center">
                                            <p className={`text-[10px] font-bold uppercase tracking-wide
                                                ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                Stage {index + 1}
                                            </p>
                                            <p className={`text-[11px] font-medium mt-0.5 w-[100px] truncate text-center
                                                ${isCurrent ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-800'}`}>
                                                {stage.name}
                                            </p>
                                            {isCurrent && (
                                                <span className="mt-1 inline-block text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                                                    Active
                                                </span>
                                            )}
                                            {isCompleted && (
                                                <span className="mt-1 inline-block text-[9px] font-semibold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">
                                                    Done
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {stages.length === 0 && (
                <div className="glass-card p-6 rounded-2xl border border-dashed border-gray-300 text-center text-sm text-muted-foreground">
                    No template assigned. <Link href="/masters/project-templates" className="text-blue-600 hover:underline">Set up a template in Masters</Link> and assign it when creating a project.
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div onClick={openTeamModal} className="glass-card p-4 rounded-xl border border-gray-200 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-500 text-xs font-medium">Team Members</h3>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                            <Plus className="w-3 h-3" /> Add
                        </span>
                    </div>
                    <div className="flex -space-x-2 mb-3">
                        {(project.teamMembers || []).slice(0, 5).map((member: any, i: number) => (
                            member?.image
                                ? <img key={i} src={member.image} alt={member.name} className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                                : <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {(member?.name || '?').charAt(0).toUpperCase()}
                                </div>
                        ))}
                        {(project.teamMembers || []).length === 0 && (
                            <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                                <Users className="w-4 h-4 text-gray-300" />
                            </div>
                        )}
                        {(project.teamMembers || []).length > 5 && (
                            <div className="w-9 h-9 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                +{(project.teamMembers || []).length - 5}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                        {(project.teamMembers || []).length === 0
                            ? 'No members yet — click to add'
                            : `${(project.teamMembers || []).length} member${(project.teamMembers || []).length !== 1 ? 's' : ''} · click to manage`}
                    </p>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="text-gray-500 text-xs font-medium mb-2">Overall Progress</h3>
                    <div className="flex items-end gap-2 mb-2">
                        <span className={cn("text-3xl font-bold", progress === 100 ? 'text-green-600' : 'text-gray-900')}>{progress}%</span>
                        <span className="text-sm text-gray-500 mb-1">completed</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500", progress === 100 ? 'bg-green-500' : 'bg-blue-600')}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Due: {dueDate}</p>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="text-gray-500 text-xs font-medium mb-2">My Tasks</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" aria-label="Review CAD drawings" className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                            <span className="text-sm text-gray-700">Review CAD drawings</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" aria-label="Approve Material Bill" className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                            <span className="text-sm text-gray-700">Approve Material Bill</span>
                        </div>
                    </div>
                    <p className="text-sm text-blue-600 font-medium mt-4">View All Tasks &rarr;</p>
                </div>
            </div>

            {/* Edit Modal */}
            {showEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Edit Project</h3>
                            <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                                <input type="text" className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                                <input type="text" className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={editForm.client} onChange={e => setEditForm((f: any) => ({ ...f, client: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                        value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                                        {['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map(s => (
                                            <option key={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                        value={editForm.priority} onChange={e => setEditForm((f: any) => ({ ...f, priority: e.target.value }))}>
                                        {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                            <option key={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input type="date" className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={editForm.endDate} onChange={e => setEditForm((f: any) => ({ ...f, endDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea rows={2} className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={saving}
                                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Management Modal */}
            {showTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Manage Team</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {(project.teamMembers || []).length} member{(project.teamMembers || []).length !== 1 ? 's' : ''} on this project
                                </p>
                            </div>
                            <button onClick={() => setShowTeam(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Current members */}
                        {(project.teamMembers || []).length > 0 && (
                            <div className="px-5 pt-4 pb-2 flex-shrink-0">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Team</p>
                                <div className="flex flex-wrap gap-2">
                                    {(project.teamMembers || []).map((m: any) => (
                                        <div key={m._id} className="flex items-center gap-1.5 bg-primary/8 border border-primary/15 rounded-full pl-1 pr-2 py-0.5">
                                            {m.image
                                                ? <img src={m.image} alt={m.name} className="w-5 h-5 rounded-full object-cover" />
                                                : <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">{m.name?.charAt(0)}</div>
                                            }
                                            <span className="text-xs font-medium text-gray-800">{m.name}</span>
                                            <button
                                                onClick={() => toggleMember(m._id)}
                                                disabled={savingTeam}
                                                className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="px-5 py-3 flex-shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search users by name or department…"
                                    value={teamSearch}
                                    onChange={e => setTeamSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>

                        {/* User list */}
                        <div className="overflow-y-auto flex-1 px-5 pb-5">
                            {(() => {
                                const memberIds = (project.teamMembers || []).map((m: any) => m._id);
                                const q = teamSearch.toLowerCase();
                                const filtered = allUsers.filter(u =>
                                    (!q || u.name?.toLowerCase().includes(q) || u.dept?.toLowerCase().includes(q) || u.jobTitle?.toLowerCase().includes(q))
                                );
                                if (filtered.length === 0) return (
                                    <p className="text-sm text-gray-400 text-center py-8">No users found</p>
                                );
                                return (
                                    <div className="space-y-1">
                                        {filtered.map((u: any) => {
                                            const isMember = memberIds.includes(u._id);
                                            return (
                                                <button
                                                    key={u._id}
                                                    onClick={() => toggleMember(u._id)}
                                                    disabled={savingTeam}
                                                    className={cn(
                                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all disabled:opacity-50',
                                                        isMember
                                                            ? 'bg-primary/8 border border-primary/20 hover:bg-red-50 hover:border-red-200 group'
                                                            : 'hover:bg-gray-50 border border-transparent'
                                                    )}
                                                >
                                                    {u.image
                                                        ? <img src={u.image} alt={u.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                                        : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{u.name?.charAt(0)}</div>
                                                    }
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{[u.jobTitle, u.dept].filter(Boolean).join(' · ')}</p>
                                                    </div>
                                                    {isMember ? (
                                                        <UserMinus className="w-4 h-4 text-primary group-hover:text-red-500 transition-colors flex-shrink-0" />
                                                    ) : (
                                                        <Plus className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Delete Project</h3>
                                <p className="text-sm text-gray-500">This will permanently delete <span className="font-semibold text-gray-700">{project.name}</span> and all its subtasks.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
