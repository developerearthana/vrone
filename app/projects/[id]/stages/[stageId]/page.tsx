"use client";

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    ArrowLeft, CheckCircle2, ChevronRight, Loader2,
    Paperclip, Trash2, X, LayoutTemplate, Pencil,
    MessageSquare, Send, Plus, ChevronDown, Clock
} from 'lucide-react';
import Link from 'next/link';
import { getProjectById, completeStage, uncompleteStage, addStageExtraModule, removeStageExtraModule } from '@/app/actions/project';
import { getMasters } from '@/app/actions/masters';
import { getProjectTemplateByName } from '@/app/actions/project-templates';
import { getStageSubtasks, createStageSubtask, toggleStageSubtask, deleteStageSubtask } from '@/app/actions/project-stage-tasks';
import { getStageMoodBoards, toggleStageMoodBoard, updateStageMoodBoard } from '@/app/actions/project-stage-moodboards';
import { getAllStageBoardComments, addBoardComment, deleteBoardComment } from '@/app/actions/project-board-comments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formatTs = (d: string | Date) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        + ' · ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatCommentTime = (d: string | Date) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const avatarColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];
const getAvatarColor = (str: string) =>
    avatarColors[str.charCodeAt(0) % avatarColors.length];

export default function StageDetailPage({ params }: { params: Promise<{ id: string; stageId: string }> }) {
    const { id, stageId } = use(params);
    const router = useRouter();
    const { data: session } = useSession();

    const [project, setProject] = useState<any>(null);
    const [stage, setStage] = useState<any>(null);
    const [moodBoards, setMoodBoards] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [stageCompleted, setStageCompleted] = useState(false);

    // Work board description/file edit state
    const [mbDesc, setMbDesc] = useState<Record<string, string>>({});
    const [mbFiles, setMbFiles] = useState<Record<string, string[]>>({});
    const [mbSaving, setMbSaving] = useState<string | null>(null);
    const [mbEditing, setMbEditing] = useState<string | null>(null);
    const mbFileRef = useRef<HTMLInputElement>(null);
    const mbFileTarget = useRef<string | null>(null);

    // Per-board tasks
    const [mbTasks, setMbTasks] = useState<Record<string, any[]>>({});
    const [mbShowForm, setMbShowForm] = useState<Record<string, boolean>>({});
    const [mbNewTask, setMbNewTask] = useState<Record<string, { title: string }>>({});
    const [mbNewTaskFiles, setMbNewTaskFiles] = useState<Record<string, string[]>>({});
    const [mbTaskSaving, setMbTaskSaving] = useState<string | null>(null);
    const mbTaskFileRef = useRef<HTMLInputElement>(null);
    const mbTaskFileTarget = useRef<string | null>(null);

    // Per-board comments
    const [mbComments, setMbComments] = useState<Record<string, any[]>>({});
    const [mbCommentText, setMbCommentText] = useState<Record<string, string>>({});
    const [mbCommentSaving, setMbCommentSaving] = useState<string | null>(null);
    const [mbShowComments, setMbShowComments] = useState<Record<string, boolean>>({});

    // Extra work boards
    const [extraModules, setExtraModules] = useState<string[]>([]);
    const [moodBoardOptions, setMoodBoardOptions] = useState<string[]>([]);
    const [showAddBoard, setShowAddBoard] = useState(false);
    const [addBoardLoading, setAddBoardLoading] = useState(false);
    const addBoardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            const projRes = await getProjectById(id);
            if (projRes.success && projRes.data) {
                const proj = projRes.data;
                setProject(proj);
                setStageCompleted((proj.completedStageIds || []).includes(stageId));

                if (proj.template) {
                    const tRes = await getProjectTemplateByName(proj.template);
                    if (tRes.success && tRes.data) {
                        const sorted = [...(tRes.data.stages || [])].sort((a: any, b: any) => a.order - b.order)
                            .map((s: any, i: number) => ({ ...s, id: s.id || `fallback-${i}` }));
                        setStage(sorted.find((s: any) => s.id === stageId) || null);
                    }
                }
            }

            // Load extra modules for this stage from project data
            if (projRes.success && projRes.data) {
                const proj = projRes.data;
                const extras = proj.stageExtraModules?.[stageId] || [];
                setExtraModules(Array.isArray(extras) ? extras : []);
            }

            const [taskRes, mbRes, commentRes, mastersRes] = await Promise.all([
                getStageSubtasks(id, stageId),
                getStageMoodBoards(id, stageId),
                getAllStageBoardComments(id, stageId),
                getMasters('ProjectMoodBoard'),
            ]);

            if (mastersRes.success && mastersRes.data) {
                setMoodBoardOptions(mastersRes.data.map((m: any) => m.label));
            }

            if (mbRes.success && mbRes.data) {
                const map: Record<string, any> = {};
                const descMap: Record<string, string> = {};
                const filesMap: Record<string, string[]> = {};
                for (const m of mbRes.data) {
                    map[m.moduleName] = m;
                    descMap[m.moduleName] = m.description || '';
                    filesMap[m.moduleName] = m.attachments || [];
                }
                setMoodBoards(map);
                setMbDesc(descMap);
                setMbFiles(filesMap);
            }

            if (taskRes.success && taskRes.data) {
                const taskMap: Record<string, any[]> = {};
                for (const t of taskRes.data) {
                    const key = t.moduleName || '__unassigned__';
                    if (!taskMap[key]) taskMap[key] = [];
                    taskMap[key].push(t);
                }
                setMbTasks(taskMap);
            }

            if (commentRes.success && commentRes.data) {
                const commentMap: Record<string, any[]> = {};
                for (const c of commentRes.data) {
                    if (!commentMap[c.moduleName]) commentMap[c.moduleName] = [];
                    commentMap[c.moduleName].push(c);
                }
                setMbComments(commentMap);
            }

            setLoading(false);
        };
        load();
    }, [id, stageId]);

    // Progress — includes both template modules and extra modules
    const allModules = [...(stage?.modules || []), ...extraModules];
    const totalModules = allModules.length;
    const completedModules = Object.values(moodBoards).filter((m: any) => m.completed).length;
    const allTasks = Object.values(mbTasks).flat();
    const completedTasksCount = allTasks.filter(t => t.completed).length;
    const totalItems = allTasks.length + totalModules;
    const completedItems = completedTasksCount + completedModules;
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Work board handlers
    const handleToggleMoodBoard = async (moduleName: string) => {
        const prev = moodBoards[moduleName];
        const newCompleted = prev ? !prev.completed : true;
        setMoodBoards(p => ({ ...p, [moduleName]: { ...(p[moduleName] || { moduleName }), completed: newCompleted } }));
        const res = await toggleStageMoodBoard(id, stageId, moduleName);
        if (!res.success) {
            toast.error("Failed to update");
            setMoodBoards(p => ({ ...p, [moduleName]: { ...(p[moduleName] || {}), completed: !newCompleted } }));
        }
    };

    const handleSaveMoodBoard = async (moduleName: string) => {
        setMbSaving(moduleName);
        const res = await updateStageMoodBoard(id, stageId, moduleName, {
            description: mbDesc[moduleName] || '',
            attachments: mbFiles[moduleName] || [],
        });
        if (res.success) {
            setMoodBoards(p => ({ ...p, [moduleName]: res.data }));
            setMbDesc(p => ({ ...p, [moduleName]: res.data.description || '' }));
            setMbFiles(p => ({ ...p, [moduleName]: res.data.attachments || [] }));
            setMbEditing(null);
            toast.success("Saved");
        } else {
            toast.error("Failed to save");
        }
        setMbSaving(null);
    };

    const handleMbFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = mbFileTarget.current;
        if (!name) return;
        const files = Array.from(e.target.files || []);
        setMbFiles(p => ({ ...p, [name]: [...(p[name] || []), ...files.map(f => f.name)] }));
        if (mbFileRef.current) mbFileRef.current.value = '';
    };

    // Per-board task handlers
    const handleToggleMbTask = async (taskId: string, moduleName: string) => {
        setMbTasks(p => ({
            ...p,
            [moduleName]: (p[moduleName] || []).map(t => t._id === taskId ? { ...t, completed: !t.completed } : t),
        }));
        const res = await toggleStageSubtask(taskId, id, stageId);
        if (!res.success) {
            toast.error("Failed to update task");
            setMbTasks(p => ({
                ...p,
                [moduleName]: (p[moduleName] || []).map(t => t._id === taskId ? { ...t, completed: !t.completed } : t),
            }));
        }
    };

    const handleDeleteMbTask = async (taskId: string, moduleName: string) => {
        setMbTasks(p => ({ ...p, [moduleName]: (p[moduleName] || []).filter(t => t._id !== taskId) }));
        await deleteStageSubtask(taskId, id, stageId);
    };

    const handleAddMbTask = async (moduleName: string) => {
        const title = mbNewTask[moduleName]?.title?.trim();
        if (!title) { toast.error("Title is required"); return; }
        setMbTaskSaving(moduleName);
        const res = await createStageSubtask({
            projectId: id, stageId, moduleName, title,
            attachments: mbNewTaskFiles[moduleName] || [],
        });
        if (res.success && res.data) {
            setMbTasks(p => ({ ...p, [moduleName]: [...(p[moduleName] || []), res.data] }));
            setMbNewTask(p => ({ ...p, [moduleName]: { title: '' } }));
            setMbNewTaskFiles(p => ({ ...p, [moduleName]: [] }));
            setMbShowForm(p => ({ ...p, [moduleName]: false }));
            toast.success("Task added");
        } else {
            toast.error("Failed to add task");
        }
        setMbTaskSaving(null);
    };

    const handleTaskFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = mbTaskFileTarget.current;
        if (!name) return;
        const files = Array.from(e.target.files || []);
        setMbNewTaskFiles(p => ({ ...p, [name]: [...(p[name] || []), ...files.map(f => f.name)] }));
        if (mbTaskFileRef.current) mbTaskFileRef.current.value = '';
    };

    // Comment handlers
    const handleAddComment = async (moduleName: string) => {
        const text = mbCommentText[moduleName]?.trim();
        if (!text) return;
        if (!session?.user) { toast.error("Please sign in to comment"); return; }
        setMbCommentSaving(moduleName);
        const res = await addBoardComment({ projectId: id, stageId, moduleName, text });
        if (res.success && res.data) {
            setMbComments(p => ({ ...p, [moduleName]: [...(p[moduleName] || []), res.data] }));
            setMbCommentText(p => ({ ...p, [moduleName]: '' }));
        } else {
            toast.error("Failed to post comment");
        }
        setMbCommentSaving(null);
    };

    const handleDeleteComment = async (commentId: string, moduleName: string) => {
        setMbComments(p => ({ ...p, [moduleName]: (p[moduleName] || []).filter(c => c._id !== commentId) }));
        const res = await deleteBoardComment(commentId, id, stageId);
        if (!res.success) {
            toast.error(res.error || "Failed to delete");
        }
    };

    // Close add board dropdown on outside click
    useEffect(() => {
        if (!showAddBoard) return;
        const handler = (e: MouseEvent) => {
            if (addBoardRef.current && !addBoardRef.current.contains(e.target as Node)) {
                setShowAddBoard(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showAddBoard]);

    const handleAddExtraBoard = async (moduleName: string) => {
        setAddBoardLoading(true);
        setShowAddBoard(false);
        const res = await addStageExtraModule(id, stageId, moduleName);
        if (res.success) {
            setExtraModules(prev => [...prev, moduleName]);
            toast.success(`Added "${moduleName}" board`);
        } else {
            toast.error(res.error || 'Failed to add board');
        }
        setAddBoardLoading(false);
    };

    const handleRemoveExtraBoard = async (moduleName: string) => {
        const res = await removeStageExtraModule(id, stageId, moduleName);
        if (res.success) {
            setExtraModules(prev => prev.filter(m => m !== moduleName));
            toast.success(`Removed "${moduleName}" board`);
        } else {
            toast.error(res.error || 'Failed to remove board');
        }
    };

    // Stage complete
    const handleCompleteStage = async () => {
        setCompleting(true);
        if (stageCompleted) {
            setStageCompleted(false);
            const res = await uncompleteStage(id, stageId);
            if (res.success) { toast.success("Stage marked as incomplete"); router.refresh(); }
            else { setStageCompleted(true); toast.error("Failed to update stage"); }
        } else {
            setStageCompleted(true);
            const res = await completeStage(id, stageId);
            if (res.success) { toast.success("Stage marked as complete"); router.refresh(); }
            else { setStageCompleted(false); toast.error("Failed to complete stage"); }
        }
        setCompleting(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (!stage) return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
            <p className="text-muted-foreground">Stage not found.</p>
            <Link href={`/projects/${id}`} className="text-sm text-blue-600 hover:underline">Back to Project</Link>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Link href={`/projects/${id}`} className="p-2 hover:bg-background rounded-md transition-colors text-gray-500">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2 text-sm text-gray-500 flex-1">
                    <Link href="/projects" className="hover:text-gray-900">Projects</Link>
                    <ChevronRight className="w-4 h-4" />
                    <Link href={`/projects/${id}`} className="hover:text-gray-900">{project?.name}</Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-semibold text-gray-900">{stage.name}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-background transition-colors">
                        Stage Settings
                    </button>
                    <button onClick={handleCompleteStage} disabled={completing}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors",
                            stageCompleted
                                ? "bg-green-50 border border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                                : "bg-green-600 text-white hover:bg-green-700"
                        )}>
                        {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {completing ? 'Updating...' : stageCompleted ? 'Completed — Click to Undo' : 'Complete Stage'}
                    </button>
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-gray-900">{stage.name}</h1>
                <p className="text-gray-500 mt-0.5 text-sm">Manage all activities, documents, and approvals for this phase.</p>
            </div>

            {/* Progress */}
            <div className="glass-card rounded-xl border border-gray-200 p-4 bg-white/60">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Stage Completion</span>
                    <span className={cn("text-xl font-bold", percentage === 100 ? 'text-green-600' : 'text-blue-600')}>{percentage}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", percentage === 100 ? 'bg-green-500' : 'bg-blue-600')}
                        style={{ width: `${percentage}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                    {completedItems} of {totalItems} items completed
                    {totalModules > 0 && ` · ${completedModules}/${totalModules} work boards · ${completedTasksCount}/${allTasks.length} tasks`}
                </p>
            </div>

            {/* Work Board Cards */}
            {(allModules.length > 0 || moodBoardOptions.length > 0) && (
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Work Boards</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{completedModules} of {totalModules} completed</p>
                        </div>

                        {/* Add Work Board button */}
                        <div className="relative" ref={addBoardRef}>
                            <button
                                onClick={() => setShowAddBoard(p => !p)}
                                disabled={addBoardLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                                {addBoardLoading
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Plus className="w-3.5 h-3.5" />}
                                Add Work Board
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>

                            {showAddBoard && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] w-56">
                                    <div className="px-3 py-2 border-b border-gray-100">
                                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Select Board</p>
                                    </div>
                                    {moodBoardOptions.filter(opt => !allModules.includes(opt)).length === 0 ? (
                                        <p className="px-3 py-3 text-xs text-gray-400 text-center">All available boards already added</p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto py-1">
                                            {moodBoardOptions
                                                .filter(opt => !allModules.includes(opt))
                                                .map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => handleAddExtraBoard(opt)}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2">
                                                        <LayoutTemplate className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                                        {opt}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-3 items-start">
                        {allModules.map((moduleName: string) => {
                            const isExtra = !stage.modules?.includes(moduleName);
                            const mb = moodBoards[moduleName];
                            const isCompleted = mb?.completed || false;
                            const isEditing = mbEditing === moduleName;
                            const desc = mbDesc[moduleName] || '';
                            const files = mbFiles[moduleName] || [];
                            const hasContent = !!(desc || files.length > 0);
                            const tasks = mbTasks[moduleName] || [];
                            const showForm = mbShowForm[moduleName] || false;
                            const newTaskTitle = mbNewTask[moduleName]?.title || '';
                            const newTaskFiles = mbNewTaskFiles[moduleName] || [];
                            const comments = mbComments[moduleName] || [];
                            const showComments = mbShowComments[moduleName] || false;
                            const commentText = mbCommentText[moduleName] || '';

                            return (
                                <div key={moduleName} className={cn(
                                    "min-w-[300px] max-w-[340px] flex-shrink-0 rounded-xl border bg-white flex flex-col transition-colors",
                                    isCompleted ? "border-green-200 bg-green-50/20" : "border-gray-200"
                                )}>
                                    {/* Card header */}
                                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={cn(
                                                "text-sm font-bold truncate",
                                                isCompleted ? "line-through text-gray-400" : "text-gray-900"
                                            )}>
                                                {moduleName}
                                            </span>
                                            {isExtra && (
                                                <span className="shrink-0 text-[10px] bg-blue-50 text-blue-500 border border-blue-100 px-1.5 py-0.5 rounded font-medium">
                                                    Extra
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {hasContent && !isCompleted && (
                                                <button
                                                    onClick={() => setMbEditing(isEditing ? null : moduleName)}
                                                    className="p-1 text-gray-400 hover:text-primary rounded transition-colors"
                                                    aria-label="Edit">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {isExtra && (
                                                <button
                                                    onClick={() => handleRemoveExtraBoard(moduleName)}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                    aria-label="Remove board">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleToggleMoodBoard(moduleName)}
                                                aria-label="Toggle completion"
                                                className={cn(
                                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                                                    isCompleted
                                                        ? "bg-green-500 border-green-500 hover:bg-red-400 hover:border-red-400"
                                                        : "border-gray-300 hover:border-primary"
                                                )}>
                                                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inner dashed area — description + files */}
                                    <div className="mx-4 border border-dashed border-gray-200 rounded-lg overflow-hidden">
                                        {isEditing ? (
                                            <div className="p-3 space-y-2">
                                                <textarea
                                                    autoFocus
                                                    placeholder="Add description..."
                                                    rows={3}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white resize-none"
                                                    value={desc}
                                                    onChange={e => setMbDesc(p => ({ ...p, [moduleName]: e.target.value }))}
                                                />
                                                <button type="button"
                                                    onClick={() => { mbFileTarget.current = moduleName; mbFileRef.current?.click(); }}
                                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                                                    <Paperclip className="w-3.5 h-3.5" /> Attach File
                                                </button>
                                                {files.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {files.map((f, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded">
                                                                <Paperclip className="w-2.5 h-2.5" />{f}
                                                                <button onClick={() => setMbFiles(p => ({ ...p, [moduleName]: p[moduleName].filter((_, j) => j !== i) }))} aria-label="Remove">
                                                                    <X className="w-2.5 h-2.5 ml-0.5 hover:text-red-500" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => handleSaveMoodBoard(moduleName)}
                                                        disabled={mbSaving === moduleName}
                                                        className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                                        {mbSaving === moduleName && <Loader2 className="w-3 h-3 animate-spin" />}
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setMbEditing(null)}
                                                        className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : hasContent ? (
                                            <div className="p-3 space-y-1.5">
                                                {desc && <p className="text-xs text-gray-600">{desc}</p>}
                                                {files.length > 0 && (
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap gap-1">
                                                            {files.map((f: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                                                                    <Paperclip className="w-2.5 h-2.5" />{f}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {mb?.updatedAt && (
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                                                <span>{formatTs(mb.updatedAt)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {!files.length && mb?.updatedAt && (
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-0.5">
                                                        <Clock className="w-2.5 h-2.5 shrink-0" />
                                                        <span>{formatTs(mb.updatedAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <button
                                                    onClick={() => setMbEditing(moduleName)}
                                                    className="w-full text-xs text-gray-400 hover:text-primary transition-colors text-center py-4">
                                                    No active items · click to add
                                                </button>
                                                {mb?.updatedAt && (
                                                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 pb-3">
                                                        <Clock className="w-2.5 h-2.5 shrink-0" />
                                                        <span>{formatTs(mb.updatedAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tasks section */}
                                    <div className="px-4 pt-3 pb-1 flex-1">
                                        {tasks.length > 0 && (
                                            <div className="space-y-0.5 mb-2">
                                                {tasks.map((task: any) => (
                                                    <div key={task._id} className={cn(
                                                        "flex items-start gap-2 group py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors",
                                                        task.completed && "opacity-60"
                                                    )}>
                                                        <button
                                                            onClick={() => handleToggleMbTask(task._id, moduleName)}
                                                            className="mt-0.5 shrink-0"
                                                            aria-label="Toggle">
                                                            {task.completed
                                                                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                : <div className="w-4 h-4 rounded border-2 border-gray-300 hover:border-primary transition-colors" />}
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn("text-xs font-medium text-gray-900", task.completed && "line-through text-gray-400")}>
                                                                {task.title}
                                                            </p>
                                                            {task.attachments?.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                                    {task.attachments.map((f: string, i: number) => (
                                                                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                                                                            <Paperclip className="w-2 h-2" />{f}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteMbTask(task._id, moduleName)}
                                                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all rounded shrink-0"
                                                            aria-label="Delete">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Inline add task form */}
                                        {showForm && (
                                            <div className="mb-2 space-y-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Task title *"
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                                    value={newTaskTitle}
                                                    onChange={e => setMbNewTask(p => ({ ...p, [moduleName]: { title: e.target.value } }))}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddMbTask(moduleName)}
                                                />
                                                <button type="button"
                                                    onClick={() => { mbTaskFileTarget.current = moduleName; mbTaskFileRef.current?.click(); }}
                                                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-primary transition-colors">
                                                    <Paperclip className="w-3 h-3" /> Attach File
                                                </button>
                                                {newTaskFiles.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {newTaskFiles.map((f, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                                                                <Paperclip className="w-2 h-2" />{f}
                                                                <button onClick={() => setMbNewTaskFiles(p => ({ ...p, [moduleName]: p[moduleName].filter((_, j) => j !== i) }))} aria-label="Remove">
                                                                    <X className="w-2 h-2 ml-0.5 hover:text-red-500" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleAddMbTask(moduleName)}
                                                        disabled={mbTaskSaving === moduleName}
                                                        className="px-2.5 py-1 bg-primary text-white text-[11px] font-semibold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1">
                                                        {mbTaskSaving === moduleName && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                                        Add
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setMbShowForm(p => ({ ...p, [moduleName]: false }));
                                                            setMbNewTask(p => ({ ...p, [moduleName]: { title: '' } }));
                                                            setMbNewTaskFiles(p => ({ ...p, [moduleName]: [] }));
                                                        }}
                                                        className="px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-200 rounded-md transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* + Add Task button */}
                                    <div className="px-4 pb-3">
                                        <button
                                            onClick={() => setMbShowForm(p => ({ ...p, [moduleName]: true }))}
                                            className="w-full text-xs text-primary font-medium hover:bg-blue-50 transition-colors py-2 border border-dashed border-gray-200 rounded-md">
                                            + Add Task
                                        </button>
                                    </div>

                                    {/* Comments section */}
                                    <div className="border-t border-gray-100">
                                        {/* Comments toggle */}
                                        <button
                                            onClick={() => setMbShowComments(p => ({ ...p, [moduleName]: !showComments }))}
                                            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                                            <span className="flex items-center gap-1.5 font-medium">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                Comments
                                                {comments.length > 0 && (
                                                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                                        {comments.length}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-gray-400">{showComments ? '▲' : '▼'}</span>
                                        </button>

                                        {showComments && (
                                            <div className="px-4 pb-4 space-y-3">
                                                {/* Comment list */}
                                                {comments.length > 0 ? (
                                                    <div className="space-y-3 max-h-56 overflow-y-auto">
                                                        {comments.map((c: any) => (
                                                            <div key={c._id} className="flex gap-2.5 group">
                                                                {/* Avatar */}
                                                                <div className="shrink-0 mt-0.5">
                                                                    {c.userImage ? (
                                                                        <img src={c.userImage} alt={c.userName}
                                                                            className="w-7 h-7 rounded-md object-cover" />
                                                                    ) : (
                                                                        <div className={cn(
                                                                            "w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-bold",
                                                                            getAvatarColor(c.userName)
                                                                        )}>
                                                                            {getInitials(c.userName)}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Bubble */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                                            <div className="min-w-0">
                                                                                <span className="text-[11px] font-semibold text-gray-900 truncate block">
                                                                                    {c.userName}
                                                                                </span>
                                                                                <span className="text-[10px] text-gray-400 font-mono">
                                                                                    {c.userEmail}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-[10px] text-gray-400 shrink-0">
                                                                                {formatCommentTime(c.createdAt)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-700 break-words">{c.text}</p>
                                                                    </div>
                                                                    {/* Delete own comment */}
                                                                    {session?.user?.id === c.userId && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(c._id, moduleName)}
                                                                            className="mt-0.5 opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-red-500 transition-all flex items-center gap-0.5">
                                                                            <Trash2 className="w-2.5 h-2.5" /> Delete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 text-center py-2">No comments yet. Be the first!</p>
                                                )}

                                                {/* Comment input */}
                                                <div className="flex gap-2 items-end">
                                                    {session?.user && (
                                                        <div className="shrink-0">
                                                            {session.user.image ? (
                                                                <img src={session.user.image} alt={session.user.name || ''}
                                                                    className="w-7 h-7 rounded-md object-cover" />
                                                            ) : (
                                                                <div className={cn(
                                                                    "w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-bold",
                                                                    getAvatarColor(session.user.name || 'U')
                                                                )}>
                                                                    {getInitials(session.user.name || 'U')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 flex gap-1.5">
                                                        <textarea
                                                            rows={1}
                                                            placeholder="Add a comment..."
                                                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white resize-none"
                                                            value={commentText}
                                                            onChange={e => setMbCommentText(p => ({ ...p, [moduleName]: e.target.value }))}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleAddComment(moduleName);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleAddComment(moduleName)}
                                                            disabled={mbCommentSaving === moduleName || !commentText.trim()}
                                                            className="px-2 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0">
                                                            {mbCommentSaving === moduleName
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                : <Send className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Hidden file inputs */}
            <input ref={mbFileRef} type="file" multiple className="hidden" onChange={handleMbFileChange} />
            <input ref={mbTaskFileRef} type="file" multiple className="hidden" onChange={handleTaskFileChange} />
        </div>
    );
}
