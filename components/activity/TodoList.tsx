"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Pin, PinOff, Palette, Check, Trash2, Calendar as CalIcon,
    Loader2, Plus, Archive, RotateCcw, ChevronDown, ChevronUp,
    AlignLeft, Square, CheckSquare, Users, User, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { createTask, getTasks, updateTask, deleteTask as deleteTaskAction, getTeamTasks } from '@/app/actions/activity/tasks';
import { getTeams } from '@/app/actions/organization';
import TaskDetailModal from './TaskDetailModal';
import { format, isPast, isToday } from 'date-fns';

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS: { id: string; bg: string; border: string; label: string }[] = [
    { id: 'default', bg: 'bg-card',        border: 'border-border',     label: 'Default' },
    { id: 'red',     bg: 'bg-red-50',      border: 'border-red-200',    label: 'Red' },
    { id: 'orange',  bg: 'bg-orange-50',   border: 'border-orange-200', label: 'Orange' },
    { id: 'yellow',  bg: 'bg-yellow-50',   border: 'border-yellow-200', label: 'Yellow' },
    { id: 'green',   bg: 'bg-emerald-50',  border: 'border-emerald-200',label: 'Green' },
    { id: 'teal',    bg: 'bg-teal-50',     border: 'border-teal-200',   label: 'Teal' },
    { id: 'blue',    bg: 'bg-blue-50',     border: 'border-blue-200',   label: 'Blue' },
    { id: 'purple',  bg: 'bg-purple-50',   border: 'border-purple-200', label: 'Purple' },
    { id: 'pink',    bg: 'bg-pink-50',     border: 'border-pink-200',   label: 'Pink' },
    { id: 'brown',   bg: 'bg-amber-100',   border: 'border-amber-300',  label: 'Brown' },
    { id: 'gray',    bg: 'bg-gray-100',    border: 'border-gray-300',   label: 'Gray' },
];
const colorOf = (id?: string) => COLORS.find(c => c.id === id) ?? COLORS[0];

const PRIORITY_CFG = {
    High:   { dot: 'bg-red-500',    text: 'text-red-600',    label: 'High' },
    Medium: { dot: 'bg-amber-400',  text: 'text-amber-600',  label: 'Med' },
    Low:    { dot: 'bg-emerald-500',text: 'text-emerald-600',label: 'Low' },
};

const STATUS_COLS = ['To Do', 'In Progress', 'In Review', 'Done'] as const;
type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Archived';
type Priority   = 'High' | 'Medium' | 'Low';

interface Task {
    _id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    color?: string;
    pinned?: boolean;
    dueDate?: string;
    checklist?: { text: string; completed: boolean }[];
    tags?: string[];
    teamId?: string;
    createdBy?: string;
    createdAt?: string;
}

// ─── Colour picker ────────────────────────────────────────────────────────────
function ColorPicker({ current, onChange }: { current?: string; onChange: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Change colour">
                <Palette className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={{ duration: 0.12 }}
                        className="absolute top-8 left-0 z-50 bg-white border border-border rounded-xl shadow-xl p-2 flex flex-wrap gap-1.5 w-[168px]"
                    >
                        {COLORS.map(c => (
                            <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }} title={c.label}
                                className={cn(
                                    'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                                    c.bg.replace('bg-', 'bg-').replace('50', '200').replace('100', '300'),
                                    current === c.id ? 'border-foreground scale-110' : 'border-transparent',
                                )}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Personal note card ───────────────────────────────────────────────────────
function NoteCard({ task, onUpdate, onDelete, onOpen }: {
    task: Task;
    onUpdate: (id: string, data: Partial<Task>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onOpen: (task: Task) => void;
}) {
    const col = colorOf(task.color);
    const cfg = PRIORITY_CFG[task.priority];
    const isDone = task.status === 'Done';
    const isArchived = task.status === 'Archived';

    const dueDateEl = task.dueDate ? (() => {
        const d = new Date(task.dueDate);
        const overdue = !isDone && isPast(d) && !isToday(d);
        const today = isToday(d);
        return (
            <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                overdue ? 'bg-red-100 text-red-600' : today ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
            )}>
                <CalIcon className="w-2.5 h-2.5" />{format(d, 'dd MMM')}
            </span>
        );
    })() : null;

    const checklist = task.checklist || [];
    const doneCount = checklist.filter(i => i.completed).length;

    return (
        <motion.div
            layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}
            className={cn(
                'group relative rounded-2xl border p-4 cursor-pointer select-none',
                'hover:shadow-md transition-shadow break-inside-avoid mb-3',
                col.bg, col.border, isDone && 'opacity-60',
            )}
            onClick={() => onOpen(task)}
        >
            {task.pinned && <span className="absolute top-2 right-2 text-muted-foreground/60"><Pin className="w-3 h-3 fill-current" /></span>}
            <p className={cn('text-sm font-semibold text-foreground leading-snug pr-5', isDone && 'line-through text-muted-foreground')}>
                {task.title}
            </p>
            {task.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">{task.description}</p>}
            {checklist.length > 0 && (
                <div className="mt-2 space-y-1">
                    {checklist.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            {item.completed ? <CheckSquare className="w-3 h-3 text-emerald-500 shrink-0" /> : <Square className="w-3 h-3 text-muted-foreground shrink-0" />}
                            <span className={cn('text-xs', item.completed && 'line-through text-muted-foreground')}>{item.text}</span>
                        </div>
                    ))}
                    {checklist.length > 3 && <p className="text-[10px] text-muted-foreground pl-4">+{checklist.length - 3} more</p>}
                </div>
            )}
            {(task.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {(task.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-black/8 text-foreground/70 px-1.5 py-0.5 rounded-full font-medium">#{tag}</span>
                    ))}
                </div>
            )}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                <span className={cn('flex items-center gap-1 text-[10px] font-bold', cfg.text)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />{cfg.label}
                </span>
                {checklist.length > 0 && <span className="text-[10px] text-muted-foreground">{doneCount}/{checklist.length}</span>}
                {dueDateEl}
                <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-auto',
                    task.status === 'To Do'       ? 'bg-slate-100 text-slate-600' :
                    task.status === 'In Progress'  ? 'bg-blue-100 text-blue-700' :
                    task.status === 'In Review'    ? 'bg-amber-100 text-amber-700' :
                    task.status === 'Done'         ? 'bg-emerald-100 text-emerald-700' :
                    'bg-muted text-muted-foreground'
                )}>{task.status}</span>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <ColorPicker current={task.color} onChange={id => onUpdate(task._id, { color: id } as any)} />
                <button type="button" className="p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100"
                    title={task.pinned ? 'Unpin' : 'Pin'} onClick={() => onUpdate(task._id, { pinned: !task.pinned } as any)}>
                    {task.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
                {!isArchived ? (
                    <button type="button" className="p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Archive" onClick={() => onUpdate(task._id, { status: 'Archived' } as any)}>
                        <Archive className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <button type="button" className="p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Restore" onClick={() => onUpdate(task._id, { status: 'To Do' } as any)}>
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                )}
                <button type="button" className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete" onClick={() => onDelete(task._id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </motion.div>
    );
}

// ─── Quick-add bar ────────────────────────────────────────────────────────────
function QuickAdd({ onAdd, teamId }: {
    onAdd: (title: string, description: string, priority: Priority) => Promise<void>;
    teamId?: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [saving, setSaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                if (title.trim()) save();
                else { setExpanded(false); setDescription(''); setPriority('Medium'); }
            }
        };
        if (expanded) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [expanded, title, description, priority]);

    const save = async () => {
        if (!title.trim()) return;
        setSaving(true);
        await onAdd(title.trim(), description.trim(), priority);
        setTitle(''); setDescription(''); setPriority('Medium'); setExpanded(false);
        setSaving(false);
    };

    const label = teamId ? 'Add team task…' : 'Take a note…';

    return (
        <div ref={containerRef} className="bg-card border border-border rounded-2xl shadow-md overflow-hidden transition-all" style={{ maxWidth: 480, margin: '0 auto 24px' }}>
            {!expanded ? (
                <div className="flex items-center gap-3 px-4 py-3 cursor-text" onClick={() => setExpanded(true)}>
                    <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">{label}</span>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    <input autoFocus className="w-full text-sm font-semibold text-foreground bg-transparent outline-none placeholder:text-muted-foreground/60"
                        placeholder="Title" value={title} onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } }} />
                    <textarea rows={2} className="w-full text-sm text-foreground bg-transparent outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed"
                        placeholder="Add a note… (optional)" value={description} onChange={e => setDescription(e.target.value)} />
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                        <div className="flex items-center gap-1">
                            {(['High', 'Medium', 'Low'] as Priority[]).map(p => {
                                const cfg = PRIORITY_CFG[p];
                                return (
                                    <button key={p} type="button" onClick={() => setPriority(p)}
                                        className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full transition-colors',
                                            priority === p ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
                                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />{p}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setExpanded(false); setTitle(''); setDescription(''); }}
                                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                                Discard
                            </button>
                            <button type="button" onClick={save} disabled={saving || !title.trim()}
                                className="text-xs font-semibold px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                                {saving && <Loader2 className="w-3 h-3 animate-spin" />}Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Team task row (kanban-style column view) ─────────────────────────────────
function TeamTaskRow({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
    const cfg = PRIORITY_CFG[task.priority];
    const isDone = task.status === 'Done';
    const checklist = task.checklist || [];
    const doneCount = checklist.filter(i => i.completed).length;

    return (
        <motion.div
            layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            onClick={() => onOpen(task)}
            className="group bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
        >
            <p className={cn('text-sm font-semibold text-foreground leading-snug', isDone && 'line-through text-muted-foreground')}>
                {task.title}
            </p>
            {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
            {checklist.length > 0 && (
                <div className="mt-2">
                    <div className="w-full bg-muted rounded-full h-1">
                        <div className="bg-primary h-1 rounded-full" style={{ width: `${Math.round((doneCount / checklist.length) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{doneCount}/{checklist.length} items</p>
                </div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn('flex items-center gap-1 text-[10px] font-bold', cfg.text)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />{cfg.label}
                </span>
                {task.dueDate && (
                    <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1',
                        !isDone && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
                            ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
                    )}>
                        <CalIcon className="w-2.5 h-2.5" />{format(new Date(task.dueDate), 'dd MMM')}
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// ─── Team Tasks board ─────────────────────────────────────────────────────────
function TeamTasksBoard({ teams }: { teams: any[] }) {
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | undefined>();
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0]._id);
    }, [teams]);

    useEffect(() => {
        if (!selectedTeamId) return;
        setLoading(true);
        getTeamTasks(selectedTeamId).then(res => {
            if (res.success) setTasks(res.data as Task[]);
            else toast.error(res.error);
            setLoading(false);
        });
    }, [selectedTeamId]);

    const tasksByStatus = STATUS_COLS.reduce((acc, s) => {
        acc[s] = tasks.filter(t => t.status === s);
        return acc;
    }, {} as Record<string, Task[]>);

    const COL_STYLE: Record<string, string> = {
        'To Do':      'border-slate-200 bg-slate-50/50',
        'In Progress': 'border-blue-200 bg-blue-50/30',
        'In Review':  'border-amber-200 bg-amber-50/30',
        'Done':       'border-emerald-200 bg-emerald-50/30',
    };
    const COL_LABEL: Record<string, string> = {
        'To Do':      'text-slate-600',
        'In Progress': 'text-blue-600',
        'In Review':  'text-amber-600',
        'Done':       'text-emerald-600',
    };

    const selectedTeam = teams.find(t => t._id === selectedTeamId);

    return (
        <div className="space-y-4">
            {/* Team selector */}
            <div className="flex items-center gap-2 flex-wrap">
                {teams.map(t => (
                    <button key={t._id} onClick={() => setSelectedTeamId(t._id)}
                        className={cn(
                            'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                            selectedTeamId === t._id
                                ? 'bg-primary text-white border-primary'
                                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                        )}>
                        <Users className="w-3.5 h-3.5" />{t.name}
                        <span className="text-[10px] opacity-70">({(t.members || []).length})</span>
                    </button>
                ))}
            </div>

            {/* Team members pill row */}
            {selectedTeam && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Members</span>
                    {(selectedTeam.members || []).map((m: any) => (
                        <span key={m._id || m} className="flex items-center gap-1 text-[11px] bg-muted border border-border text-foreground px-2 py-0.5 rounded-full">
                            <User className="w-3 h-3 text-muted-foreground" />
                            {m.name || 'Member'}
                        </span>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground border border-dashed border-border rounded-xl">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="font-semibold text-sm">No tasks for this team yet</p>
                    <p className="text-xs mt-1">Assign tasks to this team via the task detail modal.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {STATUS_COLS.map(col => (
                        <div key={col} className={cn('rounded-xl border p-3 space-y-2 min-h-[200px]', COL_STYLE[col])}>
                            <div className="flex items-center justify-between mb-1">
                                <p className={cn('text-[10px] font-bold uppercase tracking-widest', COL_LABEL[col])}>{col}</p>
                                <span className="text-[10px] font-bold text-muted-foreground bg-white/60 border border-border px-1.5 py-0.5 rounded-full">
                                    {tasksByStatus[col].length}
                                </span>
                            </div>
                            <AnimatePresence>
                                {tasksByStatus[col].map(t => (
                                    <TeamTaskRow key={t._id} task={t} onOpen={t => { setSelectedTask(t); setIsDetailOpen(true); }} />
                                ))}
                            </AnimatePresence>
                            {tasksByStatus[col].length === 0 && (
                                <p className="text-[11px] text-muted-foreground/50 text-center pt-4">Empty</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask as any}
                    isOpen={isDetailOpen}
                    onUpdate={() => {
                        if (selectedTeamId) {
                            getTeamTasks(selectedTeamId).then(res => { if (res.success) setTasks(res.data as Task[]); });
                        }
                    }}
                    onClose={() => { setIsDetailOpen(false); }}
                />
            )}
        </div>
    );
}

// ─── Main TodoList ────────────────────────────────────────────────────────────
export default function TodoList() {
    const [mode, setMode] = useState<'personal' | 'team'>('personal');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [teamsLoading, setTeamsLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
    const [selectedTask, setSelectedTask] = useState<Task | undefined>();
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        const res = await getTasks();
        if (res.success) setTasks(res.data as Task[]);
        else toast.error(res.error);
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
        getTeams().then(res => {
            setTeams(Array.isArray(res) ? res : []);
            setTeamsLoading(false);
        });
    }, []);

    const handleAdd = async (title: string, description: string, priority: Priority) => {
        const res = await createTask({ title, description, priority, status: 'To Do', color: 'default' } as any);
        if (res.success) { setTasks(prev => [res.data as Task, ...prev]); toast.success('Note added'); }
        else toast.error(res.error);
    };

    const handleUpdate = async (id: string, data: Partial<Task>) => {
        setTasks(prev => prev.map(t => t._id === id ? { ...t, ...data } : t));
        const res = await updateTask(id, data as any);
        if (!res.success) { toast.error(res.error); fetchTasks(); }
    };

    const handleDelete = async (id: string) => {
        setTasks(prev => prev.filter(t => t._id !== id));
        const res = await deleteTaskAction(id);
        if (!res.success) { toast.error(res.error); fetchTasks(); }
        else toast.success('Note deleted');
    };

    const active   = tasks.filter(t => t.status !== 'Archived');
    const archived = tasks.filter(t => t.status === 'Archived');
    const applyFilter = (list: Task[]) => filterStatus === 'All' ? list : list.filter(t => t.status === filterStatus);
    const pinned = applyFilter(active).filter(t => t.pinned);
    const others = applyFilter(active).filter(t => !t.pinned);

    const STATUS_FILTERS: (TaskStatus | 'All')[] = ['All', 'To Do', 'In Progress', 'In Review', 'Done'];

    return (
        <div className="space-y-4">
            {/* Mode tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-muted rounded-xl border border-border w-fit">
                <button
                    onClick={() => setMode('personal')}
                    className={cn(
                        'flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors',
                        mode === 'personal' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
                    )}>
                    <User className="w-3.5 h-3.5" /> My Notes
                </button>
                <button
                    onClick={() => setMode('team')}
                    className={cn(
                        'flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors',
                        mode === 'team' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
                    )}>
                    <Users className="w-3.5 h-3.5" /> Team Tasks
                    {!teamsLoading && teams.length > 0 && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{teams.length}</span>
                    )}
                </button>
            </div>

            {/* ── Personal notes ── */}
            {mode === 'personal' && (
                <>
                    <div className="flex items-center gap-2 flex-wrap">
                        {STATUS_FILTERS.map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={cn(
                                    'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                                    filterStatus === s
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                                )}>
                                {s}
                            </button>
                        ))}
                    </div>

                    <QuickAdd onAdd={handleAdd} />

                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <AlignLeft className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-semibold">No notes yet</p>
                            <p className="text-sm mt-1">Click "Take a note…" above to get started.</p>
                        </div>
                    ) : (
                        <>
                            {pinned.length > 0 && (
                                <section>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                                        <Pin className="w-3 h-3" /> Pinned
                                    </p>
                                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                                        <AnimatePresence>
                                            {pinned.map(t => (
                                                <NoteCard key={t._id} task={t} onUpdate={handleUpdate} onDelete={handleDelete}
                                                    onOpen={t => { setSelectedTask(t); setIsDetailOpen(true); }} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </section>
                            )}
                            {others.length > 0 && (
                                <section>
                                    {pinned.length > 0 && (
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Other notes</p>
                                    )}
                                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3">
                                        <AnimatePresence>
                                            {others.map(t => (
                                                <NoteCard key={t._id} task={t} onUpdate={handleUpdate} onDelete={handleDelete}
                                                    onOpen={t => { setSelectedTask(t); setIsDetailOpen(true); }} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </section>
                            )}
                            {pinned.length === 0 && others.length === 0 && filterStatus !== 'All' && (
                                <div className="text-center py-12 text-muted-foreground text-sm">No notes with status "{filterStatus}".</div>
                            )}
                            {archived.length > 0 && (
                                <section className="pt-2 border-t border-border">
                                    <button onClick={() => setShowArchived(v => !v)}
                                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-3">
                                        <Archive className="w-3.5 h-3.5" />Archived ({archived.length})
                                        {showArchived ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                    <AnimatePresence>
                                        {showArchived && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 overflow-hidden">
                                                {archived.map(t => (
                                                    <NoteCard key={t._id} task={t} onUpdate={handleUpdate} onDelete={handleDelete}
                                                        onOpen={t => { setSelectedTask(t); setIsDetailOpen(true); }} />
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </section>
                            )}
                        </>
                    )}

                    {selectedTask && (
                        <TaskDetailModal task={selectedTask as any} isOpen={isDetailOpen}
                            onUpdate={fetchTasks} onClose={() => { setIsDetailOpen(false); fetchTasks(); }} />
                    )}
                </>
            )}

            {/* ── Team tasks ── */}
            {mode === 'team' && (
                teamsLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-14 text-muted-foreground border border-dashed border-border rounded-xl">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="font-semibold text-sm">No teams found</p>
                        <p className="text-xs mt-1">You are not assigned to any team yet. Contact your manager.</p>
                    </div>
                ) : (
                    <TeamTasksBoard teams={teams} />
                )
            )}
        </div>
    );
}
