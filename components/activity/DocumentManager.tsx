"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText, Download, Folder, FolderOpen, UploadCloud, Trash2, File,
    FileImage, FileSpreadsheet, Video, Loader2, LayoutGrid, List, Eye,
    Edit2, ChevronRight, ChevronDown, HardDrive, Search, ExternalLink, X, Maximize2, Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { getContents, uploadFile, createFolder, deleteItem, renameFolder } from '@/app/actions/activity/documents';
import { getProjects } from '@/app/actions/projects';
import { getTasks } from '@/app/actions/activity/tasks';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocItem {
    _id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    updatedAt: string;
}

interface FolderItem {
    _id: string;
    name: string;
    parentId?: string;
}

interface BreadcrumbEntry {
    id: string | undefined;
    name: string;
}

interface ProjectItem {
    _id: string;
    name: string;
    status?: string;
}

interface TaskItem {
    _id: string;
    title: string;
    status?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number) {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function FileIcon({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
    const cls = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-8 h-8' : 'w-12 h-12';
    if (type.includes('pdf')) return <FileText className={cn(cls, 'text-red-500')} />;
    if (type.includes('image')) return <FileImage className={cn(cls, 'text-purple-500')} />;
    if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv')) return <FileSpreadsheet className={cn(cls, 'text-green-500')} />;
    if (type.includes('word') || type.includes('doc')) return <FileText className={cn(cls, 'text-blue-500')} />;
    if (type.includes('video')) return <Video className={cn(cls, 'text-orange-500')} />;
    return <File className={cn(cls, 'text-gray-400')} />;
}

// ── Sidebar Tree Node ─────────────────────────────────────────────────────────

interface TreeNodeProps {
    folder: FolderItem;
    depth: number;
    currentFolderId: string | undefined;
    expandedFolders: Set<string>;
    folderChildren: Record<string, FolderItem[]>;
    fetchedFolders: Set<string>;
    onNavigate: (id: string, name: string) => void;
    onToggleExpand: (id: string) => Promise<void>;
}

function FolderTreeNode({
    folder, depth, currentFolderId, expandedFolders,
    folderChildren, fetchedFolders, onNavigate, onToggleExpand,
}: TreeNodeProps) {
    const isActive = currentFolderId === folder._id;
    const isExpanded = expandedFolders.has(folder._id);
    const isFetched = fetchedFolders.has(folder._id);
    const children = folderChildren[folder._id] ?? [];
    // Show chevron until we know for sure it has no children
    const showChevron = !isFetched || children.length > 0;

    return (
        <div>
            <div
                className={cn(
                    'flex items-center gap-1 py-1 rounded-md cursor-pointer group transition-colors text-sm',
                    isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-foreground',
                )}
                style={{ paddingLeft: `${10 + depth * 14}px`, paddingRight: '6px' }}
            >
                {/* Expand chevron */}
                <button
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(folder._id); }}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {showChevron
                        ? (isExpanded
                            ? <ChevronDown className="w-3 h-3" />
                            : <ChevronRight className="w-3 h-3" />)
                        : <span className="w-3" />
                    }
                </button>

                {/* Icon + name */}
                <div
                    className="flex items-center gap-1.5 flex-1 min-w-0"
                    onClick={() => onNavigate(folder._id, folder.name)}
                >
                    {isExpanded
                        ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500" />
                        : <Folder className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500" />
                    }
                    <span className="truncate text-[13px] leading-snug">{folder.name}</span>
                </div>
            </div>

            {/* Children */}
            <AnimatePresence initial={false}>
                {isExpanded && children.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        {children.map(child => (
                            <FolderTreeNode
                                key={child._id}
                                folder={child}
                                depth={depth + 1}
                                currentFolderId={currentFolderId}
                                expandedFolders={expandedFolders}
                                folderChildren={folderChildren}
                                fetchedFolders={fetchedFolders}
                                onNavigate={onNavigate}
                                onToggleExpand={onToggleExpand}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DocumentManager() {
    // ── Navigation ──────────────────────────────────────────────────────────
    const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
    const [folderStack, setFolderStack] = useState<BreadcrumbEntry[]>([{ id: undefined, name: 'My Drive' }]);

    // ── Current folder contents ─────────────────────────────────────────────
    const [documents, setDocuments] = useState<DocItem[]>([]);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [loading, setLoading] = useState(true);

    // ── View ────────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');

    // ── Sidebar tree ────────────────────────────────────────────────────────
    const [rootFolders, setRootFolders] = useState<FolderItem[]>([]);
    const [folderChildren, setFolderChildren] = useState<Record<string, FolderItem[]>>({});
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [fetchedFolders, setFetchedFolders] = useState<Set<string>>(new Set());
    // Maps folderId → full breadcrumb path to that folder
    const [folderPaths, setFolderPaths] = useState<Record<string, BreadcrumbEntry[]>>({});

    // ── Shortcuts ───────────────────────────────────────────────────────────
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [showProjects, setShowProjects] = useState(false);
    const [showTasks, setShowTasks] = useState(false);

    // ── Dialogs ─────────────────────────────────────────────────────────────
    const [previewFile, setPreviewFile] = useState<DocItem | null>(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
    const [previewFullscreen, setPreviewFullscreen] = useState(false);
    const blobUrlRef = useRef<string | null>(null);
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [renameData, setRenameData] = useState<{ id: string; name: string } | null>(null);

    // ── Preview Blob URL ─────────────────────────────────────────────────────
    // Browsers block data: URLs in <iframe>/<embed>. Convert to an object URL instead.
    useEffect(() => {
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
        if (!previewFile) { setPreviewBlobUrl(null); return; }

        const src = previewFile.url;
        if (src?.startsWith('data:')) {
            try {
                const [header, b64] = src.split(',');
                const mime = header.slice(5, header.indexOf(';'));
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
                blobUrlRef.current = url;
                setPreviewBlobUrl(url);
            } catch {
                setPreviewBlobUrl(src);
            }
        } else {
            setPreviewBlobUrl(src);
        }
        return () => {
            if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
        };
    }, [previewFile]);

    // ── Init ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        const saved = localStorage.getItem('docViewMode');
        if (saved === 'grid' || saved === 'list') setViewMode(saved);
        fetchRootTree();
        fetchShortcuts();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchRootTree = async () => {
        const res = await getContents(undefined);
        if (res.success && res.data) {
            const rf = res.data.folders as FolderItem[];
            setRootFolders(rf);
            // Seed folderPaths for root-level folders
            const paths: Record<string, BreadcrumbEntry[]> = {};
            for (const f of rf) {
                paths[f._id] = [{ id: undefined, name: 'My Drive' }, { id: f._id, name: f.name }];
            }
            setFolderPaths(prev => ({ ...prev, ...paths }));
        }
    };

    const fetchShortcuts = async () => {
        try {
            const [pRes, tRes] = await Promise.all([
                getProjects({ status: 'active' }),
                getTasks({}),
            ]);
            if (pRes.success && pRes.data) setProjects((pRes.data as ProjectItem[]).slice(0, 5));
            if (tRes.success && tRes.data) setTasks((tRes.data as TaskItem[]).slice(0, 5));
        } catch {
            // shortcuts are non-critical
        }
    };

    // ── Content fetch ─────────────────────────────────────────────────────────

    const fetchContents = useCallback(async (folderId?: string) => {
        setLoading(true);
        const res = await getContents(folderId);
        if (res.success && res.data) {
            setDocuments(res.data.documents as DocItem[]);
            setFolders(res.data.folders as FolderItem[]);
        } else {
            toast.error(res.error ?? 'Failed to load contents');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchContents(currentFolderId);
    }, [currentFolderId, fetchContents]);

    // ── Tree: expand / collapse ───────────────────────────────────────────────

    const toggleExpand = useCallback(async (folderId: string) => {
        const alreadyFetched = fetchedFolders.has(folderId);

        if (!alreadyFetched) {
            const res = await getContents(folderId);
            if (res.success && res.data) {
                const children = res.data.folders as FolderItem[];
                setFolderChildren(prev => ({ ...prev, [folderId]: children }));
                setFetchedFolders(prev => new Set([...prev, folderId]));

                // Build breadcrumb paths for the fetched children
                const parentPath = folderPaths[folderId] ?? [{ id: undefined, name: 'My Drive' }];
                const newPaths: Record<string, BreadcrumbEntry[]> = {};
                for (const c of children) {
                    newPaths[c._id] = [...parentPath, { id: c._id, name: c.name }];
                }
                setFolderPaths(prev => ({ ...prev, ...newPaths }));
            }
        }

        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    }, [fetchedFolders, folderPaths]);

    // Invalidate tree cache for a given parent (used after create/delete inside it)
    const invalidateTreeParent = (parentId: string | undefined) => {
        if (!parentId) {
            fetchRootTree();
        } else {
            setFetchedFolders(prev => { const n = new Set(prev); n.delete(parentId); return n; });
            setFolderChildren(prev => { const n = { ...prev }; delete n[parentId]; return n; });
        }
    };

    // ── Navigation ─────────────────────────────────────────────────────────────

    const handleNavigate = (folderId: string | undefined, folderName: string) => {
        setSearchQuery('');
        if (folderId === undefined) {
            setFolderStack([{ id: undefined, name: 'My Drive' }]);
        } else {
            const idx = folderStack.findIndex(f => f.id === folderId);
            if (idx !== -1) {
                setFolderStack(folderStack.slice(0, idx + 1));
            } else {
                setFolderStack([...folderStack, { id: folderId, name: folderName }]);
            }
        }
        setCurrentFolderId(folderId);
    };

    // Navigate from tree sidebar (uses pre-computed path for correct breadcrumb)
    const handleTreeNavigate = (folderId: string, folderName: string) => {
        setSearchQuery('');
        const path = folderPaths[folderId] ?? [
            { id: undefined, name: 'My Drive' },
            { id: folderId, name: folderName },
        ];
        setFolderStack(path);
        setCurrentFolderId(folderId);
    };

    // ── Upload ─────────────────────────────────────────────────────────────────

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        if (currentFolderId) fd.append('folderId', currentFolderId);
        const tid = toast.loading('Uploading…');
        try {
            const res = await uploadFile(fd);
            if (res.success) {
                toast.success('File uploaded', { id: tid });
                fetchContents(currentFolderId);
            } else {
                toast.error(res.error, { id: tid });
            }
        } catch {
            toast.error('Upload failed', { id: tid });
        }
        e.target.value = '';
    };

    // ── Create folder ──────────────────────────────────────────────────────────

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const res = await createFolder(newFolderName, currentFolderId);
            if (res.success) {
                toast.success('Folder created');
                setNewFolderName('');
                setIsNewFolderOpen(false);
                fetchContents(currentFolderId);
                invalidateTreeParent(currentFolderId);
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error('Failed to create folder');
        }
    };

    // ── Rename ─────────────────────────────────────────────────────────────────

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!renameData?.name.trim()) return;
        try {
            const res = await renameFolder(renameData.id, renameData.name);
            if (res.success) {
                toast.success('Renamed');
                setIsRenameOpen(false);
                setRenameData(null);
                fetchContents(currentFolderId);
                // Refresh entire tree since paths may have changed
                setFetchedFolders(new Set());
                setFolderChildren({});
                fetchRootTree();
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error('Rename failed');
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────

    const handleDelete = async (id: string, type: 'file' | 'folder') => {
        if (!confirm(`Delete this ${type}?`)) return;
        try {
            const res = await deleteItem(id, type);
            if (res.success) {
                toast.success('Deleted');
                fetchContents(currentFolderId);
                if (type === 'folder') invalidateTreeParent(currentFolderId);
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error('Delete failed');
        }
    };

    // ── Filtered lists ─────────────────────────────────────────────────────────

    const q = searchQuery.toLowerCase();
    const filteredFolders = q ? folders.filter(f => f.name.toLowerCase().includes(q)) : folders;
    const filteredDocs = q ? documents.filter(d => d.name.toLowerCase().includes(q)) : documents;

    const toggleView = (mode: 'list' | 'grid') => {
        setViewMode(mode);
        localStorage.setItem('docViewMode', mode);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-[calc(100vh-140px)] rounded-xl overflow-hidden border border-border bg-card shadow-sm">

            {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════ */}
            <aside className="w-[260px] flex-shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">

                {/* My Drive header */}
                <button
                    onClick={() => handleNavigate(undefined, 'My Drive')}
                    className={cn(
                        'flex items-center gap-2.5 px-4 py-3.5 text-sm font-semibold transition-colors border-b border-border hover:bg-muted',
                        !currentFolderId ? 'text-primary' : 'text-foreground',
                    )}
                >
                    <HardDrive className="w-4 h-4 flex-shrink-0" />
                    My Drive
                </button>

                {/* Folder tree */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-1.5 px-1">
                    {rootFolders.map(folder => (
                        <FolderTreeNode
                            key={folder._id}
                            folder={folder}
                            depth={0}
                            currentFolderId={currentFolderId}
                            expandedFolders={expandedFolders}
                            folderChildren={folderChildren}
                            fetchedFolders={fetchedFolders}
                            onNavigate={handleTreeNavigate}
                            onToggleExpand={toggleExpand}
                        />
                    ))}
                    {rootFolders.length === 0 && (
                        <p className="text-[12px] text-muted-foreground px-3 py-2">No folders yet</p>
                    )}
                </div>

                {/* Shortcuts section */}
                <div className="border-t border-border">
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Shortcuts
                    </p>

                    {/* Project Files */}
                    <div className="px-1 pb-0.5">
                        <button
                            onClick={() => setShowProjects(v => !v)}
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-[13px] rounded-md hover:bg-muted transition-colors text-foreground"
                        >
                            {showProjects
                                ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            }
                            <span className="font-medium">Project Files</span>
                        </button>
                        <AnimatePresence initial={false}>
                            {showProjects && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.13 }}
                                    className="overflow-hidden"
                                >
                                    {projects.length === 0
                                        ? <p className="text-[11px] text-muted-foreground px-7 py-1">No active projects</p>
                                        : projects.map(p => (
                                            <a
                                                key={p._id}
                                                href={`/projects/${p._id}`}
                                                className="flex items-center gap-2 px-7 py-1 text-[11px] text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                                            >
                                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                                <span className="truncate">{p.name}</span>
                                            </a>
                                        ))
                                    }
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Task Files */}
                    <div className="px-1 pb-3">
                        <button
                            onClick={() => setShowTasks(v => !v)}
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-[13px] rounded-md hover:bg-muted transition-colors text-foreground"
                        >
                            {showTasks
                                ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            }
                            <span className="font-medium">Task Files</span>
                        </button>
                        <AnimatePresence initial={false}>
                            {showTasks && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.13 }}
                                    className="overflow-hidden"
                                >
                                    {tasks.length === 0
                                        ? <p className="text-[11px] text-muted-foreground px-7 py-1">No recent tasks</p>
                                        : tasks.map(t => (
                                            <a
                                                key={t._id}
                                                href="/activity/todo"
                                                className="flex items-center gap-2 px-7 py-1 text-[11px] text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                                            >
                                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                                <span className="truncate">{t.title}</span>
                                            </a>
                                        ))
                                    }
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </aside>

            {/* ══ MAIN CONTENT ══════════════════════════════════════════════ */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background">

                {/* Toolbar: breadcrumb + controls */}
                <div className="flex flex-col gap-2.5 px-5 py-3 border-b border-border bg-card flex-shrink-0">

                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-0.5 text-sm overflow-x-auto min-h-[20px]">
                        {folderStack.map((entry, idx) => (
                            <span key={entry.id ?? 'root'} className="flex items-center gap-0.5 shrink-0">
                                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mx-0.5" />}
                                <button
                                    onClick={() => handleNavigate(entry.id, entry.name)}
                                    className={cn(
                                        'hover:text-primary transition-colors whitespace-nowrap flex items-center gap-1',
                                        idx === folderStack.length - 1
                                            ? 'text-foreground font-semibold'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {idx === 0 && <HardDrive className="w-3.5 h-3.5" />}
                                    {entry.name}
                                </button>
                            </span>
                        ))}
                    </nav>

                    {/* Action row */}
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                className="pl-8 h-8 text-sm"
                                placeholder="Search in this folder…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            {/* View toggle */}
                            <div className="flex bg-muted rounded-md p-0.5 gap-0.5">
                                <button
                                    onClick={() => toggleView('list')}
                                    title="List view"
                                    className={cn(
                                        'p-1.5 rounded transition-colors',
                                        viewMode === 'list'
                                            ? 'bg-card shadow-sm text-primary'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => toggleView('grid')}
                                    title="Grid view"
                                    className={cn(
                                        'p-1.5 rounded transition-colors',
                                        viewMode === 'grid'
                                            ? 'bg-card shadow-sm text-primary'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-8 text-sm"
                                onClick={() => setIsNewFolderOpen(true)}
                            >
                                <Folder className="w-3.5 h-3.5" />
                                New Folder
                            </Button>

                            <label
                                htmlFor="doc-upload"
                                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 rounded-md text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors h-8"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                Upload
                                <input id="doc-upload" type="file" className="hidden" onChange={handleUpload} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Contents area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    )}

                    {/* ── LIST VIEW ── */}
                    {viewMode === 'list' && (
                        <table className="w-full text-left min-w-[520px]">
                            <thead className="bg-card border-b border-border sticky top-0 z-[5]">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Size</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-36">Modified</th>
                                    <th className="px-5 py-2.5 w-24" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">

                                {/* Folders */}
                                {filteredFolders.map(folder => (
                                    <tr
                                        key={folder._id}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => handleNavigate(folder._id, folder.name)}
                                    >
                                        <td className="px-5 py-3 flex items-center gap-3">
                                            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                            <span className="font-medium text-sm text-foreground">{folder.name}</span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-muted-foreground">—</td>
                                        <td className="px-5 py-3 text-xs text-muted-foreground">—</td>
                                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setRenameData({ id: folder._id, name: folder.name }); setIsRenameOpen(true); }}
                                                    className="p-1 rounded text-muted-foreground hover:text-blue-500"
                                                    title="Rename"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(folder._id, 'folder')}
                                                    className="p-1 rounded text-muted-foreground hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {/* Files */}
                                {filteredDocs.map(doc => (
                                    <tr key={doc._id} className="hover:bg-muted/50 transition-colors group">
                                        <td
                                            className="px-5 py-3 flex items-center gap-3 cursor-pointer"
                                            onClick={() => setPreviewFile(doc)}
                                        >
                                            <FileIcon type={doc.type} size="sm" />
                                            <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                                {doc.name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-muted-foreground">{formatSize(doc.size)}</td>
                                        <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(doc.updatedAt)}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setPreviewFile(doc)}
                                                    className="p-1 rounded text-muted-foreground hover:text-blue-500"
                                                    title="Preview"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <a
                                                    href={doc.url}
                                                    download
                                                    target="_blank"
                                                    title="Download"
                                                    className="p-1 rounded text-muted-foreground hover:text-primary"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(doc._id, 'file')}
                                                    className="p-1 rounded text-muted-foreground hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {filteredFolders.length === 0 && filteredDocs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-16 text-muted-foreground">
                                            <Folder className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">
                                                {searchQuery ? 'No results found' : 'This folder is empty'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* ── GRID VIEW ── */}
                    {viewMode === 'grid' && (
                        <div className="p-5 space-y-6">

                            {filteredFolders.length > 0 && (
                                <section>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Folders</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {filteredFolders.map(folder => (
                                            <div
                                                key={folder._id}
                                                onClick={() => handleNavigate(folder._id, folder.name)}
                                                className="group p-4 rounded-xl border border-border bg-card hover:border-yellow-300 hover:bg-yellow-50/40 dark:hover:bg-yellow-900/10 cursor-pointer transition-all flex flex-col items-center text-center gap-2 relative"
                                            >
                                                <Folder className="w-10 h-10 text-yellow-500 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-medium text-foreground truncate w-full">{folder.name}</span>
                                                <div
                                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex gap-0.5"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => { setRenameData({ id: folder._id, name: folder.name }); setIsRenameOpen(true); }}
                                                        className="p-1 hover:bg-card rounded-full text-muted-foreground hover:text-blue-500"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(folder._id, 'folder')}
                                                        className="p-1 hover:bg-card rounded-full text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {filteredDocs.length > 0 && (
                                <section>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Files</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {filteredDocs.map(doc => (
                                            <div
                                                key={doc._id}
                                                onClick={() => setPreviewFile(doc)}
                                                className="group p-4 rounded-xl border border-border bg-card hover:border-blue-200 hover:shadow-md cursor-pointer transition-all flex flex-col items-center text-center gap-2 relative"
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-lg group-hover:scale-110 transition-transform">
                                                    <FileIcon type={doc.type} size="md" />
                                                </div>
                                                <div className="w-full">
                                                    <p className="text-xs font-medium text-foreground truncate w-full" title={doc.name}>{doc.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{formatSize(doc.size)}</p>
                                                </div>
                                                <div
                                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex gap-0.5"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setPreviewFile(doc); }}
                                                        className="p-1 hover:bg-card rounded-full text-muted-foreground hover:text-blue-500"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                    </button>
                                                    <a
                                                        href={doc.url}
                                                        download
                                                        target="_blank"
                                                        onClick={e => e.stopPropagation()}
                                                        className="p-1 hover:bg-card rounded-full text-muted-foreground hover:text-primary"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDelete(doc._id, 'file'); }}
                                                        className="p-1 hover:bg-card rounded-full text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {filteredFolders.length === 0 && filteredDocs.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <Folder className="w-14 h-14 mb-4 opacity-20" />
                                    <p className="text-sm">
                                        {searchQuery ? 'No results found' : 'This folder is empty'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* ══ DIALOGS ═══════════════════════════════════════════════════ */}

            {/* New Folder */}
            <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>New Folder</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateFolder}>
                        <div className="py-3">
                            <Input
                                placeholder="Folder name"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsNewFolderOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm">Create</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Rename */}
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Rename Folder</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRenameSubmit}>
                        <div className="py-3">
                            <Input
                                placeholder="Folder name"
                                value={renameData?.name ?? ''}
                                onChange={e => setRenameData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsRenameOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* File Preview */}
            {previewFile && (
                <div
                    className={cn(
                        'fixed inset-0 z-[200] flex flex-col bg-black/80 backdrop-blur-sm',
                        previewFullscreen ? '' : 'p-4 md:p-10'
                    )}
                    onClick={e => { if (e.target === e.currentTarget) { setPreviewFile(null); setPreviewFullscreen(false); } }}
                >
                    <div className={cn(
                        'flex flex-col bg-card shadow-2xl overflow-hidden w-full mx-auto',
                        previewFullscreen ? 'h-full rounded-none' : 'max-w-5xl h-full rounded-2xl'
                    )}>
                        {/* Toolbar */}
                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card flex-shrink-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {previewFile.type.includes('pdf') && <FileText className="w-4 h-4 text-red-500 shrink-0" />}
                                {previewFile.type.includes('image') && <FileImage className="w-4 h-4 text-blue-500 shrink-0" />}
                                {!previewFile.type.includes('pdf') && !previewFile.type.includes('image') && <File className="w-4 h-4 text-muted-foreground shrink-0" />}
                                <span className="font-medium text-sm truncate text-foreground">{previewFile.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {previewBlobUrl && (
                                    <a
                                        href={previewBlobUrl}
                                        download={previewFile.name}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download
                                    </a>
                                )}
                                {previewBlobUrl && previewFile.type.includes('pdf') && (
                                    <a
                                        href={previewBlobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Open tab
                                    </a>
                                )}
                                <button
                                    onClick={() => setPreviewFullscreen(f => !f)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    title={previewFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                                >
                                    {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => { setPreviewFile(null); setPreviewFullscreen(false); }}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                            {!previewBlobUrl ? (
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            ) : previewFile.type.includes('image') ? (
                                <img
                                    src={previewBlobUrl}
                                    alt={previewFile.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : previewFile.type.includes('pdf') ? (
                                <embed
                                    src={`${previewBlobUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                                    type="application/pdf"
                                    className="w-full h-full border-0"
                                    title={previewFile.name}
                                />
                            ) : previewFile.type.includes('video') ? (
                                <video
                                    src={previewBlobUrl}
                                    controls
                                    className="max-w-full max-h-full rounded shadow-lg"
                                />
                            ) : previewFile.type.includes('audio') ? (
                                <div className="flex flex-col items-center gap-4 p-8">
                                    <File className="w-16 h-16 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">{previewFile.name}</p>
                                    <audio src={previewBlobUrl} controls className="w-full max-w-sm" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 p-8 text-center">
                                    <File className="w-16 h-16 text-muted-foreground" />
                                    <p className="font-medium text-foreground">{previewFile.name}</p>
                                    <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                                    <a
                                        href={previewBlobUrl}
                                        download={previewFile.name}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download to view
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
