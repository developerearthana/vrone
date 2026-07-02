"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, Upload, Shield, CheckCircle, Trash2, Loader2, Download,
    XCircle, Clock, Check, X, FileText, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardWrapper } from '@/components/ui/page-wrapper';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import {
    getHRMDocuments, uploadHRMDocument, deleteHRMDocument,
    getVaultUsers, approveHRMDocument, rejectHRMDocument
} from '@/app/actions/hrm-documents';
import { uploadFile } from '@/app/actions/upload';
import { toast } from 'sonner';

interface UserItem { _id: string; name: string; email: string; role: string; }

interface DocItem {
    _id: string;
    name: string;
    type: string;
    category?: string;
    createdAt: string;
    size: number;
    url: string;
    uploadedBy?: string;
    uploadedByName?: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
}

// File-type detection from the document name or data: URL mime, used to pick the right preview renderer.
function extOf(doc: DocItem | null): string {
    if (!doc) return '';
    if (doc.url?.startsWith('data:')) {
        const mime = doc.url.slice(5, doc.url.indexOf(';'));
        return mime.split('/')[1] || '';
    }
    return (doc.name?.split('.').pop() || doc.url?.split('.').pop() || '').toLowerCase();
}
const isImage = (d: DocItem | null) => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extOf(d)) || !!d?.url?.includes('data:image/');
const isPdf = (d: DocItem | null) => extOf(d) === 'pdf' || !!d?.url?.includes('application/pdf');
const isVideo = (d: DocItem | null) => ['mp4', 'webm', 'ogg', 'mov'].includes(extOf(d)) || !!d?.url?.includes('data:video/');
const isAudio = (d: DocItem | null) => ['mp3', 'wav', 'oga', 'm4a'].includes(extOf(d)) || !!d?.url?.includes('data:audio/');

const CATEGORIES = ['All', 'Identity', 'Contract', 'Certification', 'Other'];
const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

const CATEGORY_COLORS: Record<string, string> = {
    Identity: 'bg-blue-50 text-blue-700 border-blue-200',
    Contract: 'bg-purple-50 text-purple-700 border-purple-200',
    Certification: 'bg-amber-50 text-amber-700 border-amber-200',
    Other: 'bg-gray-50 text-gray-700 border-gray-200',
};

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    approved: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
};

export function DocumentVault() {
    const { data: session } = useSession();
    const userRole = session?.user?.role?.toLowerCase() || '';
    const isAdminOrHR = userRole.includes('admin') || userRole.includes('hr') || userRole.includes('manager');

    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('Contract');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewFile, setPreviewFile] = useState<DocItem | null>(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const triggerRefresh = () => setRefreshKey(k => k + 1);

    const loadDocs = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            const [res, usersData] = await Promise.all([
                getHRMDocuments(),
                isAdminOrHR ? getVaultUsers() : Promise.resolve(null)
            ]);
            setDocs(res.success && res.data ? res.data : []);
            if (isAdminOrHR && usersData?.success && usersData.data) setUsers(usersData.data);
        } catch {
            setDocs([]);
        } finally {
            setLoading(false);
        }
    }, [refreshKey, isAdminOrHR, session?.user?.id]);

    useEffect(() => { loadDocs(); }, [loadDocs]);

    // Convert base64 data: URLs to Blob URLs for preview — browsers block data: URIs in
    // <iframe>/<embed> under the default CSP, which is why PDFs previously showed blank.
    useEffect(() => {
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
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
        return () => { if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; } };
    }, [previewFile]);

    // ── Upload flow ──────────────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 10 MB.`);
            e.target.value = '';
            return;
        }
        setPendingFile(file);
        setShowCategoryPicker(true);
        e.target.value = '';
    };

    const handleUploadConfirm = async () => {
        if (!pendingFile) return;
        setShowCategoryPicker(false);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', pendingFile);
            const uploadRes = await uploadFile(formData);
            if (!uploadRes.url || uploadRes.error) { toast.error(uploadRes.error || 'Upload failed'); return; }

            const res = await uploadHRMDocument({
                name: pendingFile.name, url: uploadRes.url,
                type: uploadCategory, size: pendingFile.size, category: uploadCategory,
            });
            if (res.success) {
                toast.success(`"${pendingFile.name}" uploaded — awaiting admin approval`);
                triggerRefresh();
            } else {
                toast.error(res.error || 'Could not save document');
            }
        } catch { toast.error('Upload failed'); }
        finally { setUploading(false); setPendingFile(null); }
    };

    // ── Admin actions ────────────────────────────────────────
    const handleApprove = async (id: string) => {
        setActioningId(id);
        const res = await approveHRMDocument(id);
        if (res.success) { toast.success('Document approved'); triggerRefresh(); }
        else toast.error(res.error || 'Failed to approve');
        setActioningId(null);
    };

    const handleRejectSubmit = async () => {
        if (!rejectingId) return;
        setActioningId(rejectingId);
        const res = await rejectHRMDocument(rejectingId, rejectReason);
        if (res.success) { toast.success('Document rejected'); triggerRefresh(); }
        else toast.error(res.error || 'Failed to reject');
        setRejectingId(null);
        setRejectReason('');
        setActioningId(null);
    };

    const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const res = await deleteHRMDocument(id);
        if (res.success) { toast.success('Document deleted'); triggerRefresh(); }
        else toast.error(res.error || 'Deletion failed');
    };

    const handleDownload = (doc: DocItem, e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = doc.url; link.download = doc.name; link.target = '_blank';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        toast.success(`Downloading: ${doc.name}`);
    };

    // ── Filtering ────────────────────────────────────────────
    const filteredDocs = docs.filter(d => {
        const matchCat = categoryFilter === 'All' || (d.type || d.category) === categoryFilter;
        const matchStatus = statusFilter === 'All' || (d.status ?? 'approved') === statusFilter.toLowerCase();
        const matchUser = isAdminOrHR
            ? (selectedUserId === 'ALL' || d.uploadedBy === selectedUserId)
            : d.uploadedBy === session?.user?.id;
        return matchCat && matchStatus && matchUser;
    });

    const pendingCount = docs.filter(d => (d.status ?? 'approved') === 'pending').length;

    return (
        <div className="space-y-6">

            {/* ── Category Picker Modal ── */}
            {showCategoryPicker && pendingFile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Select Document Category</h3>
                        <p className="text-sm text-gray-500 mb-4">File: <span className="font-medium text-gray-700">{pendingFile.name}</span></p>
                        <div className="grid grid-cols-2 gap-2 mb-5">
                            {CATEGORIES.filter(c => c !== 'All').map(cat => (
                                <button key={cat} onClick={() => setUploadCategory(cat)}
                                    className={cn('px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                                        uploadCategory === cat ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowCategoryPicker(false); setPendingFile(null); }}
                                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleUploadConfirm}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">Upload Document</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reject Reason Modal ── */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Reject Document</h3>
                        <p className="text-sm text-gray-500 mb-4">Optionally provide a reason for rejection.</p>
                        <textarea
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
                            rows={3} placeholder="Reason (optional)"
                            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleRejectSubmit} disabled={!!actioningId}
                                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                                {actioningId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            Secure Document Vault
                            {isAdminOrHR && pendingCount > 0 && (
                                <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-bold animate-pulse">
                                    {pendingCount} pending
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {isAdminOrHR ? 'Review and manage all employee documents' : 'Upload documents for admin approval'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Category filter */}
                    {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setCategoryFilter(cat)}
                            className={cn('px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all',
                                categoryFilter === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}>
                            {cat}
                        </button>
                    ))}

                    {/* Upload button — available to everyone */}
                    <label className={cn('flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg shadow-lg cursor-pointer transition-colors ml-2',
                        uploading ? 'bg-emerald-400 text-white cursor-wait' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200')}>
                        {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : <><Upload className="w-3 h-3" /> Upload Document</>}
                        <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Max 10 MB</span>
                </div>
            </div>

            {/* ── Status filter (admin only) ── */}
            {isAdminOrHR && (
                <div className="flex items-center gap-2">
                    {STATUS_FILTERS.map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={cn('px-3 py-1 text-xs font-semibold rounded-full border transition-all',
                                statusFilter === s
                                    ? s === 'Pending' ? 'bg-amber-500 text-white border-amber-500'
                                        : s === 'Approved' ? 'bg-emerald-600 text-white border-emerald-600'
                                            : s === 'Rejected' ? 'bg-red-500 text-white border-red-500'
                                                : 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
                            {s}
                            {s === 'Pending' && pendingCount > 0 && <span className="ml-1">({pendingCount})</span>}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Layout ── */}
            <div className={isAdminOrHR ? "grid grid-cols-1 md:grid-cols-4 gap-6" : ""}>

                {/* Employee sidebar (admin only) */}
                {isAdminOrHR && (
                    <div className="md:col-span-1">
                        <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Employees</h4>
                            <div className="space-y-1 max-h-[200px] sm:max-h-[500px] overflow-y-auto pr-1">
                                <button onClick={() => setSelectedUserId('ALL')}
                                    className={cn('w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
                                        selectedUserId === 'ALL' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-600 hover:bg-gray-50 font-medium')}>
                                    All Employees
                                </button>
                                {users.map(u => (
                                    <button key={u._id} onClick={() => setSelectedUserId(u._id)}
                                        className={cn('w-full text-left px-3 py-2 text-sm rounded-lg transition-colors truncate',
                                            selectedUserId === u._id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-600 hover:bg-gray-50')}
                                        title={u.name}>
                                        {u.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Document grid */}
                <div className={isAdminOrHR ? "md:col-span-3" : "w-full"}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                <div key="loading" className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                    <p className="text-sm text-gray-400">Loading documents…</p>
                                </div>
                            ) : filteredDocs.length === 0 ? (
                                <div key="empty" className="col-span-3 flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-gray-200 rounded-2xl">
                                    <Shield className="w-12 h-12 text-gray-200" />
                                    <p className="font-semibold text-gray-500">No documents found</p>
                                    <p className="text-sm text-gray-400">
                                        {isAdminOrHR ? 'No documents match the current filters.' : 'Upload a document — it will be reviewed by admin.'}
                                    </p>
                                </div>
                            ) : filteredDocs.map((doc, i) => {
                                const canView = isAdminOrHR || (doc.status ?? 'approved') === 'approved';
                                const isActioning = actioningId === doc._id;

                                return (
                                    <CardWrapper key={doc._id} delay={i * 0.04}>
                                        <motion.div layout
                                            className={cn('group relative bg-white border rounded-xl p-4 transition-all hover:shadow-md',
                                                (doc.status ?? 'approved') === 'pending' ? 'border-amber-200 bg-amber-50/30' :
                                                    (doc.status ?? 'approved') === 'rejected' ? 'border-red-200 bg-red-50/20' :
                                                        'border-gray-100 cursor-pointer hover:border-emerald-200')}
                                            onClick={() => canView && setPreviewFile(doc)}>

                                            {/* File icon + name */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex shrink-0 items-center justify-center text-gray-500 font-bold text-[10px] uppercase">
                                                    {doc.url.split('.').pop()?.substring(0, 4) || 'FILE'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-bold text-gray-900 truncate" title={doc.name}>{doc.name}</h4>
                                                    <p className="text-xs text-gray-400">{(doc.size / 1024).toFixed(0)} KB</p>
                                                    {isAdminOrHR && doc.uploadedByName && (
                                                        <p className="text-xs text-gray-500 font-medium mt-0.5">by {doc.uploadedByName}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Category + Status badges */}
                                            <div className="flex items-center gap-2 flex-wrap mb-3">
                                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border',
                                                    CATEGORY_COLORS[doc.type] || CATEGORY_COLORS.Other)}>
                                                    {doc.type || 'Document'}
                                                </span>
                                                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border',
                                                    STATUS_BADGE[doc.status ?? 'approved'] ?? STATUS_BADGE.approved)}>
                                                    {STATUS_ICON[doc.status ?? 'approved']}
                                                    {(doc.status ?? 'approved').charAt(0).toUpperCase() + (doc.status ?? 'approved').slice(1)}
                                                </span>
                                            </div>

                                            {/* Rejection reason */}
                                            {(doc.status ?? 'approved') === 'rejected' && doc.rejectionReason && (
                                                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1 mb-3">
                                                    Reason: {doc.rejectionReason}
                                                </p>
                                            )}

                                            {/* Date */}
                                            <p className="text-xs text-gray-400 mb-3">
                                                {format(new Date(doc.createdAt), 'dd MMM yyyy')}
                                            </p>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1.5 border-t border-gray-100 pt-3">
                                                {/* View + Download — only if approved (or admin) */}
                                                {canView && (
                                                    <>
                                                        <button onClick={e => { e.stopPropagation(); setPreviewFile(doc); }}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                                            title="View">
                                                            <Eye className="w-3.5 h-3.5" /> View
                                                        </button>
                                                        <button onClick={e => handleDownload(doc, e)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                                                            title="Download">
                                                            <Download className="w-3.5 h-3.5" /> Download
                                                        </button>
                                                    </>
                                                )}

                                                {/* Approve / Reject — admin only, pending docs */}
                                                {isAdminOrHR && (doc.status ?? 'approved') === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handleApprove(doc._id); }}
                                                            disabled={isActioning}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 ml-auto"
                                                            title="Approve">
                                                            {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                                                        </button>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setRejectingId(doc._id); }}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                                            title="Reject">
                                                            <X className="w-3.5 h-3.5" /> Reject
                                                        </button>
                                                    </>
                                                )}

                                                {/* Delete — admin only */}
                                                {isAdminOrHR && (
                                                    <button
                                                        onClick={e => handleDelete(doc._id, doc.name, e)}
                                                        className={cn('flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors',
                                                            !canView && !isAdminOrHR ? '' : 'ml-auto')}
                                                        title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    </CardWrapper>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Preview Dialog */}
            <Dialog open={!!previewFile} onOpenChange={o => !o && setPreviewFile(null)}>
                <DialogContent className="glass-card w-[95vw] max-w-4xl h-[85vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-background">
                        <h3 className="font-bold truncate max-w-[55%] text-foreground">{previewFile?.name}</h3>
                        <div className="flex items-center gap-2">
                            {isPdf(previewFile) && previewBlobUrl && (
                                <a href={previewBlobUrl} target="_blank" rel="noreferrer"
                                    className="text-primary hover:underline text-sm flex items-center gap-1 px-2 py-1">
                                    <ExternalLink className="w-4 h-4" /> Open tab
                                </a>
                            )}
                            {previewBlobUrl && (
                                <a href={previewBlobUrl} download={previewFile?.name}
                                    className="text-primary hover:underline text-sm flex items-center gap-1 px-2 py-1">
                                    <Download className="w-4 h-4" /> Download
                                </a>
                            )}
                            <button className="text-sm font-medium text-foreground hover:bg-muted border border-border rounded-md px-3 py-1" onClick={() => setPreviewFile(null)}>Close</button>
                        </div>
                    </div>
                    <div className="flex-1 bg-muted/30 overflow-hidden flex items-center justify-center">
                        {!previewBlobUrl ? (
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        ) : isImage(previewFile) ? (
                            <img src={previewBlobUrl} alt={previewFile?.name} className="max-w-full max-h-full object-contain shadow-lg" />
                        ) : isPdf(previewFile) ? (
                            <embed src={`${previewBlobUrl}#toolbar=1`} type="application/pdf" className="w-full h-full" />
                        ) : isVideo(previewFile) ? (
                            <video src={previewBlobUrl} controls className="max-w-full max-h-full" />
                        ) : isAudio(previewFile) ? (
                            <audio src={previewBlobUrl} controls className="w-4/5" />
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-center p-8">
                                <FileText className="w-14 h-14 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                                <a href={previewBlobUrl} download={previewFile?.name}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
                                    <Download className="w-4 h-4" /> Download file
                                </a>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
