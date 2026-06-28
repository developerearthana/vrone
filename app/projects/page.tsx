"use client";

import { useEffect, useState } from 'react';
import { Briefcase, CheckCircle2, Clock, AlertTriangle, ArrowRight, Plus, Loader2, Search, Filter, Download, Printer, Calendar, Users, Layers, Pencil, Trash2, X } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getProjectStats, getProjects, createProject, updateProject, deleteProject } from '@/app/actions/project';
import { getProjectTemplates } from '@/app/actions/project-templates';
import { exportToCSV, handlePrint } from '@/lib/export-utils';
import { toast } from 'sonner';

interface Stats {
    total: number;
    completed: number;
    inProgress: number;
    atRisk: number;
}

export default function ProjectsDashboard() {
    const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, inProgress: 0, atRisk: 0 });
    const [projects, setProjects] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', client: '', status: 'Planning', template: '' });

    // Edit
    const [editProject, setEditProject] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchStats();
        loadProjects();
        loadTemplates();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await getProjectStats();
            if (res.success && res.data) {
                setStats({
                    total: res.data.total,
                    completed: res.data.completed,
                    inProgress: res.data.inProgress,
                    atRisk: res.data.atRisk,
                });
            }
        } catch {
            toast.error("Failed to fetch project stats");
        }
    };

    const loadProjects = async () => {
        try {
            const res = await getProjects({});
            if (res.success && res.data) {
                setProjects(res.data);
            }
        } catch {
            toast.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        try {
            const res = await getProjectTemplates();
            if (res.success && res.data) {
                setTemplates(res.data);
            }
        } catch {
            // templates are optional
        }
    };

    const handleCreateProject = async () => {
        if (!newProject.name || !newProject.client) {
            toast.error("Name and Client are required");
            return;
        }
        try {
            const res = await createProject(newProject);
            if (res.success) {
                toast.success("Project created successfully");
                setShowNewProjectModal(false);
                loadProjects();
                fetchStats();
                setNewProject({ name: '', client: '', status: 'Planning', template: '' });
            } else {
                toast.error(res.error || "Failed to create project");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    const openEdit = (project: any) => {
        setEditProject(project);
        setEditForm({ name: project.name, client: project.client, status: project.status || 'Planning', priority: project.priority || 'Medium' });
    };

    const handleSaveEdit = async () => {
        if (!editForm.name || !editForm.client) { toast.error("Name and Client are required"); return; }
        setSaving(true);
        const res = await updateProject(editProject.id, editForm);
        if (res.success) {
            toast.success("Project updated");
            setEditProject(null);
            loadProjects();
            fetchStats();
        } else {
            toast.error(res.error || "Failed to update");
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        const res = await deleteProject(deleteTarget.id);
        if (res.success) {
            toast.success("Project deleted");
            setDeleteTarget(null);
            loadProjects();
            fetchStats();
        } else {
            toast.error(res.error || "Failed to delete");
        }
        setDeleting(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }


    return (
        <PageWrapper className="space-y-6 max-w-7xl mx-auto p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Projects Overview</h1>
                    <p className="page-subtitle">Manage and track ongoing project progress.</p>
                </div>
                <Button className="shadow-lg shadow-primary/20" onClick={() => setShowNewProjectModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                </Button>
            </div>

            <div className="stat-grid">
                <StatCard label="Total Projects" value={stats.total} sub="Active" icon={Briefcase} iconColor="text-blue-600" />
                <StatCard label="Completed" value={stats.completed} sub="This year" icon={CheckCircle2} iconColor="text-green-600" trend="up" />
                <StatCard label="In Progress" value={stats.inProgress} sub="On track" icon={Clock} iconColor="text-purple-600" />
                <StatCard label="At Risk" value={stats.atRisk} sub="Needs attention" icon={AlertTriangle} iconColor="text-red-600" trend="down" />
            </div>

            {/* Filters */}
            <div className="flex gap-2 items-center flex-wrap">
                <div className="relative flex-1 max-w-xs group">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        className="pl-8 pr-3 py-1.5 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 focus:bg-white transition-all text-sm"
                    />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-gray-600">
                    <Filter className="w-3.5 h-3.5" /> Filter
                </Button>
                <select aria-label="Status Filter" className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 focus:outline-none bg-white cursor-pointer hover:bg-background">
                    <option>All Status</option>
                    <option>In Progress</option>
                    <option>Planning</option>
                    <option>Completed</option>
                </select>
                <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV(projects, 'projects-list')} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                        <Printer className="w-3.5 h-3.5" /> Print
                    </Button>
                </div>
            </div>

            {/* Projects Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-xl overflow-hidden border border-white/40 shadow-xl bg-white/40 backdrop-blur-xl"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-2.5 font-semibold text-xs">Project Name & Client</th>
                                <th className="px-4 py-2.5 font-semibold text-xs">Status</th>
                                <th className="px-4 py-2.5 font-semibold text-xs">Dates & Team</th>
                                <th className="px-4 py-2.5 font-semibold text-xs">Progress</th>
                                <th className="px-4 py-2.5 font-semibold text-xs text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50">
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">
                                        No projects found. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence mode='popLayout'>
                                    {projects.map((project, index) => (
                                        <motion.tr
                                            key={project.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.05 }}
                                            className="hover:bg-white/60 transition-colors group"
                                        >
                                            <td className="px-4 py-2.5">
                                                <Link href={`/projects/${project.id}`}>
                                                    <div className="font-semibold text-gray-900 hover:text-primary transition-colors text-sm">{project.name}</div>
                                                </Link>
                                                <div className="text-xs text-muted-foreground">{project.client}</div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold border",
                                                    project.status === 'In Progress' ? 'bg-white text-blue-700 border-border' :
                                                        project.status === 'Completed' ? 'bg-white text-green-700 border-border' :
                                                            'bg-amber-50 text-amber-700 border-amber-100'
                                                )}>
                                                    {project.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Due: {project.due}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {project.team} Members
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 w-36">
                                                <div className="text-xs font-semibold text-gray-600 mb-1">{project.progress}%</div>
                                                <Progress
                                                    value={project.progress}
                                                    indicatorClassName={project.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}
                                                    className="h-1.5"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700 hover:bg-white h-7 px-2 text-xs">
                                                        <Link href={`/projects/${project.id}`}>View</Link>
                                                    </Button>
                                                    <button onClick={() => openEdit(project)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors" aria-label="Edit">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(project)} className="p-1.5 text-muted-foreground hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" aria-label="Delete">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* New Project Modal */}
            {showNewProjectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900">Start New Project</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter project name"
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={newProject.name}
                                    onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter client name"
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={newProject.client}
                                    onChange={e => setNewProject({ ...newProject, client: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                                <select
                                    aria-label="Select Project Template"
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                    value={newProject.template}
                                    onChange={(e) => setNewProject({ ...newProject, template: e.target.value })}
                                >
                                    <option value="">No Template</option>
                                    {templates.map((t) => (
                                        <option key={t._id} value={t.name}>{t.name}</option>
                                    ))}
                                </select>
                                {newProject.template && (() => {
                                    const selected = templates.find(t => t.name === newProject.template);
                                    if (!selected || !selected.stages?.length) return null;
                                    return (
                                        <div className="mt-2 border border-gray-100 rounded-lg bg-gray-50 p-3 space-y-1.5 max-h-48 overflow-y-auto">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
                                                <Layers className="w-3.5 h-3.5" />
                                                {selected.stages.length} Stages
                                            </div>
                                            {selected.stages.map((stage: any, i: number) => (
                                                <div key={stage.id} className="flex items-start gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                                        {i + 1}
                                                    </span>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-800">{stage.name}</p>
                                                        {stage.modules?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                {stage.modules.map((mod: string) => (
                                                                    <span key={mod} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full">
                                                                        {mod}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="flex justify-end pt-2 gap-2">
                            <Button variant="ghost" onClick={() => setShowNewProjectModal(false)}>Cancel</Button>
                            <Button onClick={handleCreateProject}>Create Project</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Edit Project</h3>
                            <button onClick={() => setEditProject(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close"><X className="w-5 h-5" /></button>
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
                                    <select className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none bg-white"
                                        value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                                        {['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none bg-white"
                                        value={editForm.priority} onChange={e => setEditForm((f: any) => ({ ...f, priority: e.target.value }))}>
                                        {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditProject(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={saving}
                                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Delete Project</h3>
                                <p className="text-sm text-gray-500">Permanently delete <span className="font-semibold text-gray-700">{deleteTarget.name}</span> and all its data?</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}
