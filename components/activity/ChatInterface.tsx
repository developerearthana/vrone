"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Search, MoreVertical, Paperclip, Smile,
    Check, CheckCheck, Plus, X, Users, EyeOff, Phone,
    Loader2, ArrowLeft, Bold, Italic, Strikethrough, Code, Pencil, Baseline, Highlighter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    getConversations, getMessages, sendMessage, createConversation,
    getUsersForChat, deleteConversation, markAsRead, editMessage,
} from '@/app/actions/activity/chat';
import { playChatPing } from '@/lib/chat-notify';
import { format, isToday, isYesterday } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { uploadFile } from '@/app/actions/upload';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';

interface Message {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
    readBy: string[];
    attachments?: string[];
    edited?: boolean;
}

interface Conversation {
    _id: string;
    participants: string[];
    type: 'Individual' | 'Group';
    name?: string;
    lastMessage?: Message;
    unreadCounts?: Record<string, number>;
    updatedAt: string;
}

// ─── Date separator label ─────────────────────────────────────────────────────
function dateSeparatorLabel(dateStr: string) {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd MMM yyyy');
}

// ─── Emoji-only detection ──────────────────────────────────────────────────────
const EMOJI_ONLY_RE = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})[\p{Emoji_Presentation}\p{Extended_Pictographic}\s‍️]*$/u;
function isEmojiOnly(text: string): boolean {
    const t = text.trim();
    return t.length > 0 && EMOJI_ONLY_RE.test(t) && t.length <= 12;
}

// Word-style colour palettes for the composer toolbar
const TEXT_SWATCHES = ['#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];
const HIGHLIGHT_SWATCHES = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#fecaca', '#d9f99d'];

// Only allow a safe subset of colour values in [fg=…] / [bg=…] tags — hex, rgb(), or a
// short word list — so a message can never inject arbitrary CSS.
function safeColor(v: string): string | null {
    const c = v.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
    if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(c)) return c;
    if (/^[a-zA-Z]{3,20}$/.test(c)) return c;
    return null;
}

// ─── Inline markdown renderer ──────────────────────────────────────────────────
// Supports: *bold*, _italic_, ~strikethrough~, `code`
function renderInline(text: string, keyBase = 0): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    const re = /\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~|`([^`\n]+)`/g;
    let lastIndex = 0;
    let key = keyBase;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) result.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        if (match[1] !== undefined) result.push(<strong key={key++} className="font-bold">{match[1]}</strong>);
        else if (match[2] !== undefined) result.push(<em key={key++} className="italic">{match[2]}</em>);
        else if (match[3] !== undefined) result.push(<span key={key++} className="line-through opacity-75">{match[3]}</span>);
        else if (match[4] !== undefined) result.push(<code key={key++} className="bg-black/10 rounded px-1 py-px font-mono text-[12.5px] select-all">{match[4]}</code>);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) result.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    return result;
}

// ─── Rich renderer ─────────────────────────────────────────────────────────────
// Adds Word-style [fg=colour]…[/fg] (text colour) and [bg=colour]…[/bg] (highlight),
// recursively, on top of the inline markdown. Colours are validated by safeColor().
const RICH_TAG_RE = /\[(fg|bg)=([^\]]+)\]([\s\S]*?)\[\/\1\]/;
function renderRich(text: string, keyBase = 0): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    let rest = text;
    let key = keyBase;
    while (rest.length) {
        const m = RICH_TAG_RE.exec(rest);
        if (!m) { out.push(...renderInline(rest, key)); break; }
        if (m.index > 0) { out.push(...renderInline(rest.slice(0, m.index), key)); key += 500; }
        const [full, tag, rawColor, inner] = m;
        const color = safeColor(rawColor);
        if (color) {
            const style: React.CSSProperties = tag === 'fg'
                ? { color }
                : { backgroundColor: color, borderRadius: '3px', padding: '0 3px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' };
            out.push(<span key={key++} style={style}>{renderRich(inner, key + 1000)}</span>);
        } else {
            // Invalid colour → render the inner text without styling
            out.push(<span key={key++}>{renderRich(inner, key + 1000)}</span>);
        }
        key += 100;
        rest = rest.slice(m.index + full.length);
    }
    return out;
}

function FormattedMessage({ content, isMe }: { content: string; isMe: boolean }) {
    const lines = content.split('\n');
    return (
        <>
            {lines.map((line, i) => (
                <span key={i} className="block leading-relaxed">
                    {i > 0 && line === '' ? <span className="block h-1" /> : null}
                    {line.startsWith('> ')
                        ? <span className={`block pl-2 border-l-2 ${isMe ? 'border-green-600/40' : 'border-gray-400/60'} italic opacity-80`}>{renderRich(line.slice(2))}</span>
                        : renderRich(line)
                    }
                </span>
            ))}
        </>
    );
}

// ─── Avatar circle ─────────────────────────────────────────────────────────────
function ChatAvatar({ name, isGroup, size = 'md', image }: { name: string; isGroup?: boolean; size?: 'sm' | 'md' | 'lg'; image?: string }) {
    const s = size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs';
    const initials = name.substring(0, 2).toUpperCase();
    return (
        <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden", s,
            isGroup ? "bg-indigo-100 text-indigo-700" : "bg-primary/15 text-primary")}>
            {image
                ? <img src={image} alt={name} className="w-full h-full object-cover" />
                : isGroup ? <Users className="w-4 h-4" /> : initials}
        </div>
    );
}

// ─── Colour swatch popover ─────────────────────────────────────────────────────
function ColorSwatches({ swatches, label, onPick, onClose }: {
    swatches: string[]; label: string; onPick: (c: string) => void; onClose: () => void;
}) {
    return (
        <div className="absolute bottom-9 left-0 z-50 bg-popover border border-border rounded-xl shadow-xl p-2.5 w-[168px]"
            onMouseDown={e => e.preventDefault()}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
            <div className="grid grid-cols-5 gap-1.5">
                {swatches.map(c => (
                    <button key={c} type="button" onClick={() => onPick(c)}
                        className="w-6 h-6 rounded-md border border-black/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }} title={c} />
                ))}
                <label className="w-6 h-6 rounded-md border border-dashed border-muted-foreground/40 flex items-center justify-center cursor-pointer hover:bg-muted"
                    title="Custom colour">
                    <span className="text-[9px] font-bold text-muted-foreground">+</span>
                    <input type="color" className="sr-only" onChange={e => onPick(e.target.value)} />
                </label>
            </div>
            <button type="button" onClick={onClose} className="mt-2 w-full text-[10px] text-muted-foreground hover:text-foreground">Close</button>
        </div>
    );
}

export default function ChatInterface() {
    const { data: session } = useSession();
    const userId = session?.user?.id as string | undefined;
    const me = session?.user as { name?: string | null; image?: string | null } | undefined;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
    const [isSending, setIsSending] = useState(false);

    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'Recent' | 'Groups' | 'Contacts'>('Recent');
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [newChatTab, setNewChatTab] = useState<'Direct' | 'Group'>('Direct');
    const [groupName, setGroupName] = useState('');
    const [groupSelected, setGroupSelected] = useState<string[]>([]);
    const [dialogSearch, setDialogSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [colorMenu, setColorMenu] = useState<'fg' | 'bg' | null>(null);

    // Tracks the newest message id we've already seen per conversation, so the poller can
    // detect a genuinely new *incoming* message and fire the notification sound.
    const lastSeenMsgRef = useRef<Record<string, string>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior }), 60);
    }, []);

    // ── Unified user lookup (includes the current user) ─────────────────────────
    // getUsersForChat excludes self, so without this own name/avatar resolved to "Unknown".
    const userById = useCallback((id?: string): { _id?: string; name?: string; image?: string } | undefined => {
        if (!id) return undefined;
        if (id === userId) return { _id: userId, name: me?.name || 'You', image: me?.image || undefined };
        return availableUsers.find(u => u._id === id);
    }, [availableUsers, userId, me]);

    // ── Conversation name helper ───────────────────────────────────────────────
    const convName = useCallback((c: Conversation) => {
        if (c.type === 'Group') return c.name || 'Group Chat';
        const otherId = c.participants.find(p => p !== userId);
        const u = userById(otherId);
        return u?.name || `User ${String(otherId).slice(0, 5)}`;
    }, [userId, userById]);

    const convImage = useCallback((c: Conversation) => {
        if (c.type === 'Group') return undefined;
        const otherId = c.participants.find(p => p !== userId);
        return userById(otherId)?.image;
    }, [userId, userById]);

    // ── Fetch conversations ────────────────────────────────────────────────────
    const fetchConversations = useCallback(async () => {
        if (!userId) return;
        const res = await getConversations();
        if (res.success) setConversations(res.data);
    }, [userId]);

    // ── Fetch messages for active conversation ────────────────────────────────
    const fetchMessages = useCallback(async (convId: string, scrollBehavior?: ScrollBehavior) => {
        const res = await getMessages(convId);
        if (res.success) {
            const data: Message[] = res.data;
            // Detect a genuinely new incoming message (from someone else) since our last poll
            const latest = data[data.length - 1];
            const prevSeen = lastSeenMsgRef.current[convId];
            if (latest && latest._id !== prevSeen && !latest._id.startsWith('temp-')) {
                if (prevSeen !== undefined && latest.sender !== userId) {
                    playChatPing();
                    scrollToBottom();
                }
                lastSeenMsgRef.current[convId] = latest._id;
            }
            setMessages(data);
            if (scrollBehavior) scrollToBottom(scrollBehavior);
        }
    }, [scrollToBottom, userId]);

    // ── Start polling (3 s) for active conversation ───────────────────────────
    const startPolling = useCallback((convId: string) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchMessages(convId);
                fetchConversations();
            }
        }, 3000);
    }, [fetchMessages, fetchConversations]);

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!userId) return;
        const init = async () => {
            const usersRes = await getUsersForChat();
            if (usersRes?.success) setAvailableUsers(usersRes.data);
        };
        init();
        fetchConversations();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [userId]);

    // ── Select conversation ───────────────────────────────────────────────────
    const handleSelectConversation = async (id: string) => {
        setActiveConvId(id);
        setShowMobileChat(true);
        await fetchMessages(id, 'instant');
        await markAsRead(id);
        fetchConversations();
        startPolling(id);
    };

    // ── Edit message ──────────────────────────────────────────────────────────
    const startEdit = (msg: Message) => {
        setEditingId(msg._id);
        setDraft(msg.content);
        requestAnimationFrame(() => inputRef.current?.focus());
    };
    const cancelEdit = () => { setEditingId(null); setDraft(''); };

    // ── Send message ──────────────────────────────────────────────────────────
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        // Edit mode: update the existing message instead of sending a new one
        if (editingId) {
            const newContent = draft.trim();
            if (!newContent) { cancelEdit(); return; }
            const id = editingId;
            setMessages(prev => prev.map(m => m._id === id ? { ...m, content: newContent, edited: true } : m));
            setEditingId(null);
            setDraft('');
            const res = await editMessage(id, newContent);
            if (!res.success) { toast.error('Failed to edit message'); if (activeConvId) fetchMessages(activeConvId); }
            return;
        }

        if (!activeConvId || (!draft.trim() && pendingAttachments.length === 0)) return;
        setShowEmoji(false);

        const tempId = `temp-${Date.now()}`;
        const tempMsg: Message = {
            _id: tempId,
            content: draft,
            sender: userId || '',
            createdAt: new Date().toISOString(),
            readBy: [],
            attachments: pendingAttachments.map(a => a.url),
        };
        setMessages(prev => [...prev, tempMsg]);
        setDraft('');
        setPendingAttachments([]);
        scrollToBottom();
        setIsSending(true);

        const res = await sendMessage(activeConvId, tempMsg.content, tempMsg.attachments);
        setIsSending(false);
        if (res.success) {
            setMessages(prev => prev.map(m => m._id === tempId ? res.data : m));
            fetchConversations();
        } else {
            toast.error('Failed to send message');
            setMessages(prev => prev.filter(m => m._id !== tempId));
        }
    };

    // ── Text formatting: wrap selection in markers ────────────────────────────
    const handleFormat = (open: string, close?: string) => {
        const el = inputRef.current;
        if (!el) return;
        const cm = close || open;
        const start = el.selectionStart ?? draft.length;
        const end = el.selectionEnd ?? draft.length;
        let newVal: string;
        let cursorStart: number;
        if (start === end) {
            newVal = draft.slice(0, start) + open + cm + draft.slice(end);
            cursorStart = start + open.length;
        } else {
            newVal = draft.slice(0, start) + open + draft.slice(start, end) + cm + draft.slice(end);
            cursorStart = start + open.length;
        }
        setDraft(newVal);
        requestAnimationFrame(() => {
            el.setSelectionRange(cursorStart, start === end ? cursorStart : end + open.length);
            el.focus();
            // Re-trigger auto-resize
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        });
    };

    // Wrap the current selection in a [fg=…] text-colour or [bg=…] highlight tag
    const applyColor = (kind: 'fg' | 'bg', color: string) => {
        handleFormat(`[${kind}=${color}]`, `[/${kind}]`);
        setColorMenu(null);
    };

    // ── Emoji picker close on outside click ───────────────────────────────────
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
        };
        if (showEmoji) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showEmoji]);

    const handleEmojiClick = (emojiData: any) => {
        setDraft(prev => prev + emojiData.emoji);
        inputRef.current?.focus();
    };

    // ── File upload ───────────────────────────────────────────────────────────
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setIsUploading(true);
        for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append('file', file);
            const res = await uploadFile(fd);
            if (res.success && res.url) {
                setPendingAttachments(prev => [...prev, { url: res.url!, name: file.name, type: file.type }]);
            } else {
                toast.error(`Upload failed: ${file.name}`);
            }
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Start chat ────────────────────────────────────────────────────────────
    const startChat = async (targetId: string) => {
        setIsNewChatOpen(false);
        setActiveTab('Recent'); // clicking a person surfaces the conversation in Recent
        const existing = conversations.find(c => c.type === 'Individual' && c.participants.includes(targetId));
        if (existing) { handleSelectConversation(existing._id); return; }
        const res = await createConversation([targetId], 'Individual');
        if (res.success) { await fetchConversations(); handleSelectConversation(res.data._id); }
    };

    const startGroupChat = async () => {
        if (!groupName.trim() || groupSelected.length < 2) return;
        setIsNewChatOpen(false);
        const res = await createConversation(groupSelected, 'Group', groupName.trim());
        if (res.success) {
            await fetchConversations();
            handleSelectConversation(res.data._id);
            setGroupName('');
            setGroupSelected([]);
            setNewChatTab('Direct');
            setDialogSearch('');
        } else {
            toast.error('Failed to create group chat');
        }
    };

    const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Hide this conversation from your list? History is preserved.')) return;
        const res = await deleteConversation(id);
        if (res.success) {
            toast.success('Conversation hidden');
            if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
            fetchConversations();
        }
    };

    // Corporate policy: messages are never deleted. "Hide" only removes the conversation from
    // this user's list (archive) while preserving the full history for compliance.
    const handleHideConversation = async () => {
        if (!activeConvId || !confirm('Hide this conversation from your list? The message history is preserved and will reappear when either party sends a new message.')) return;
        const res = await deleteConversation(activeConvId);
        if (res.success) { toast.success('Conversation hidden'); setActiveConvId(null); setMessages([]); fetchConversations(); }
    };

    const isImage = (url: string) => /\.(jpeg|jpg|gif|png|webp)$/i.test(url) || url.startsWith('data:image/');

    const activeConversation = conversations.find(c => c._id === activeConvId);

    // ── Sender helpers (for group message attribution) ────────────────────────
    const getSenderName = useCallback((senderId: string) =>
        userById(senderId)?.name || 'Unknown',
    [userById]);

    const getSenderImage = useCallback((senderId: string) =>
        userById(senderId)?.image,
    [userById]);

    // ── Sidebar list ──────────────────────────────────────────────────────────
    const displayList = (() => {
        const q = searchQuery.toLowerCase();
        if (activeTab === 'Contacts') return availableUsers.filter(u => u.name?.toLowerCase().includes(q));
        if (activeTab === 'Groups') return conversations.filter(c => c.type === 'Group' && convName(c).toLowerCase().includes(q));
        return conversations.filter(c => convName(c).toLowerCase().includes(q));
    })();

    // ── Message date groups ───────────────────────────────────────────────────
    const groupedMessages = messages.reduce<{ label: string; msgs: Message[] }[]>((acc, msg) => {
        const label = dateSeparatorLabel(msg.createdAt);
        const last = acc[acc.length - 1];
        if (last && last.label === label) last.msgs.push(msg);
        else acc.push({ label, msgs: [msg] });
        return acc;
    }, []);

    // ── Read status icon ──────────────────────────────────────────────────────
    const ReadIcon = ({ msg }: { msg: Message }) => {
        if (msg._id.startsWith('temp-')) return <Check className="w-3 h-3 text-white/50 inline" />;
        if (msg.readBy && msg.readBy.some(id => id !== userId)) return <CheckCheck className="w-3 h-3 text-sky-300 inline" />;
        return <Check className="w-3 h-3 text-white/60 inline" />;
    };

    return (
        <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* ── Sidebar ── */}
            <div className={cn(
                "flex flex-col border-r border-border bg-muted/20 shrink-0 transition-all",
                "w-full md:w-72 lg:w-80",
                showMobileChat ? "hidden md:flex" : "flex"
            )}>
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-foreground">Messages</h2>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsNewChatOpen(true)} title="New chat" className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-0.5 p-0.5 bg-muted/60 rounded-lg border border-border">
                        {(['Recent', 'Groups', 'Contacts'] as const).map(tab => (
                            <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                                className={cn("flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all",
                                    activeTab === tab ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/60")}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            placeholder="Search…"
                            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto py-2">
                    {displayList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-xs">Nothing here yet</p>
                        </div>
                    ) : (
                        displayList.map((item: any) => {
                            const id = item._id;
                            const isConvTab = activeTab === 'Recent' || activeTab === 'Groups';
                            const isGroup = activeTab === 'Groups' || item.type === 'Group';
                            const name = activeTab === 'Contacts' ? item.name : convName(item as Conversation);
                            const img = isConvTab ? convImage(item as Conversation) : item.image;
                            const subtitle = activeTab === 'Contacts'
                                ? (item.jobTitle || item.role || item.email)
                                : ((item.lastMessage as any)?.content || '');
                            const unread = isConvTab && userId ? (item.unreadCounts?.[userId] || 0) : 0;
                            const time = isConvTab && item.updatedAt
                                ? format(new Date(item.updatedAt), isToday(new Date(item.updatedAt)) ? 'HH:mm' : 'dd MMM')
                                : null;
                            const onClick = activeTab === 'Contacts' ? () => startChat(id) : () => handleSelectConversation(id);

                            return (
                                <div key={id} onClick={onClick}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors group mx-1 rounded-xl",
                                        activeConvId === id ? "bg-primary/10" : "hover:bg-muted/50"
                                    )}>
                                    <ChatAvatar name={name} isGroup={isGroup} size="md" image={img} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className={cn("text-sm truncate", unread ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>{name}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {time && <span className="text-[10px] text-muted-foreground">{time}</span>}
                                                {unread > 0 && (
                                                    <span className="min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                        {unread}
                                                    </span>
                                                )}
                                                {(activeTab === 'Recent' || activeTab === 'Groups') && (
                                                    <button onClick={e => handleDeleteConversation(e, id)} title="Hide (history preserved)"
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-amber-500 rounded transition-all">
                                                        <EyeOff className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className={cn("text-xs truncate mt-0.5", unread ? "text-foreground/80 font-medium" : "text-muted-foreground")}>
                                            {subtitle || ' '}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Chat pane ── */}
            <div className={cn(
                "flex-1 flex flex-col overflow-hidden min-w-0 bg-[#efeae2]",
                showMobileChat ? "flex" : "hidden md:flex"
            )}
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 0h80v80H0z' fill='none'/%3E%3C/svg%3E\")" }}
            >
                {activeConvId && activeConversation ? (
                    <>
                        {/* Chat header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] border-b border-border shadow-sm shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                <button className="md:hidden p-1 -ml-1 text-muted-foreground" onClick={() => setShowMobileChat(false)}>
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <ChatAvatar name={convName(activeConversation)} isGroup={activeConversation.type === 'Group'} size="md" image={convImage(activeConversation)} />
                                <div>
                                    <p className="font-bold text-sm text-foreground leading-tight">{convName(activeConversation)}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {activeConversation.type === 'Group'
                                            ? `${activeConversation.participants.length} participants`
                                            : 'ERP chat'}
                                    </p>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white">
                                    <DropdownMenuItem onClick={handleHideConversation}>
                                        <EyeOff className="w-4 h-4 mr-2" /> Hide conversation
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[url('/chat-bg.png')] bg-opacity-5">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                                    <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center shadow">
                                        <Phone className="w-7 h-7 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-sm font-medium">No messages yet</p>
                                    <p className="text-xs">Say hello!</p>
                                </div>
                            ) : (
                                groupedMessages.map(group => (
                                    <div key={group.label}>
                                        {/* Date separator */}
                                        <div className="flex justify-center my-3">
                                            <span className="text-[11px] font-semibold text-muted-foreground bg-white/80 px-3 py-1 rounded-full shadow-sm">
                                                {group.label}
                                            </span>
                                        </div>

                                        {group.msgs.map((msg, i) => {
                                            const isMe = msg.sender === userId;
                                            const prevMsg = group.msgs[i - 1];
                                            const sameAsPrev = prevMsg?.sender === msg.sender;
                                            const isGroup = activeConversation.type === 'Group';
                                            const emojiOnly = msg.content ? isEmojiOnly(msg.content) : false;
                                            const senderName = getSenderName(msg.sender);
                                            const senderImg = getSenderImage(msg.sender);

                                            return (
                                                <motion.div
                                                    key={msg._id}
                                                    initial={{ opacity: 0, y: 5, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                                                    className={cn("flex items-end mb-0.5 gap-1.5", isMe ? "justify-end" : "justify-start", sameAsPrev ? "mt-0.5" : "mt-3")}
                                                >
                                                    {/* Incoming avatar — group only */}
                                                    {!isMe && isGroup && (
                                                        <div className="w-7 shrink-0 self-end mb-0.5">
                                                            {!sameAsPrev
                                                                ? <ChatAvatar name={senderName} size="sm" image={senderImg} />
                                                                : <div className="w-7" />}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col" style={{ alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                                                        {/* Sender name (group, first in run) */}
                                                        {!isMe && isGroup && !sameAsPrev && (
                                                            <span className="text-[11px] font-semibold text-primary/80 mb-0.5 px-1">{senderName}</span>
                                                        )}

                                                        <div className={cn(
                                                            "group/msg",
                                                            emojiOnly
                                                                ? "px-1 py-0.5 bg-transparent shadow-none"
                                                                : cn(
                                                                    "relative px-3 py-2 shadow-sm",
                                                                    isMe
                                                                        ? "bg-[#d9fdd3] text-gray-900 rounded-tl-2xl rounded-bl-2xl rounded-tr-md rounded-br-2xl"
                                                                        : "bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-tl-md rounded-bl-2xl",
                                                                    sameAsPrev && (isMe ? "rounded-tr-2xl" : "rounded-tl-2xl")
                                                                )
                                                        )}>
                                                            {/* Edit affordance — own text messages only */}
                                                            {isMe && msg.content && !emojiOnly && !msg._id.startsWith('temp-') && (
                                                                <button
                                                                    onClick={() => startEdit(msg)}
                                                                    title="Edit message"
                                                                    className="absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-primary opacity-0 group-hover/msg:opacity-100 transition-opacity"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            {/* Attachments */}
                                                            {msg.attachments && msg.attachments.length > 0 && (
                                                                <div className="flex flex-col gap-1.5 mb-1.5">
                                                                    {msg.attachments.map((url, idx) => (
                                                                        isImage(url)
                                                                            ? <img key={idx} src={url} alt="Attachment" className="rounded-lg max-h-52 object-contain bg-black/5" />
                                                                            : <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                                                                className="flex items-center gap-2 text-[13px] bg-black/5 rounded-lg p-2 hover:bg-black/10">
                                                                                <Paperclip className="w-3.5 h-3.5" /> View attachment
                                                                            </a>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Content */}
                                                            {msg.content && (
                                                                emojiOnly
                                                                    ? <span className="text-[42px] leading-none block select-none">{msg.content}</span>
                                                                    : <FormattedMessage content={msg.content} isMe={isMe} />
                                                            )}

                                                            {/* Timestamp + read receipt */}
                                                            {!emojiOnly && (
                                                                <div className={cn("flex items-center justify-end gap-0.5 mt-1", msg.content ? "pl-8" : "")}>
                                                                    {msg.edited && <span className="text-[10px] text-gray-400 italic mr-0.5">edited</span>}
                                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                                        {format(new Date(msg.createdAt), 'HH:mm')}
                                                                    </span>
                                                                    {isMe && <ReadIcon msg={msg} />}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Emoji-only timestamp below */}
                                                        {emojiOnly && (
                                                            <div className="flex items-center gap-0.5 px-1 mt-0.5">
                                                                <span className="text-[10px] text-gray-400">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                                                {isMe && <ReadIcon msg={msg} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <div className="px-3 py-2.5 bg-[#f0f2f5] border-t border-border shrink-0">
                            {/* Editing banner */}
                            {editingId && (
                                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                    <Pencil className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-medium">Editing message</span>
                                    <button type="button" onClick={cancelEdit} className="ml-auto text-amber-600 hover:text-amber-900 font-semibold">Cancel</button>
                                </div>
                            )}
                            {/* Pending attachments */}
                            {pendingAttachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {pendingAttachments.map((f, i) => (
                                        <div key={i} className="relative group">
                                            {f.type.startsWith('image/') ? (
                                                <img src={f.url} alt="preview" className="w-12 h-12 rounded object-cover border border-border" />
                                            ) : (
                                                <div className="w-12 h-12 bg-muted rounded border border-border flex items-center justify-center">
                                                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            <button onClick={() => setPendingAttachments(p => p.filter((_, j) => j !== i))}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleSend} className="flex flex-col gap-1.5">
                                {/* Formatting toolbar */}
                                <div className="flex items-center gap-0.5 px-1">
                                    {[
                                        { icon: Bold, title: 'Bold (*)', open: '*' },
                                        { icon: Italic, title: 'Italic (_)', open: '_' },
                                        { icon: Strikethrough, title: 'Strike (~)', open: '~' },
                                        { icon: Code, title: 'Code (`)', open: '`' },
                                    ].map(({ icon: Icon, title, open }) => (
                                        <button key={open} type="button" title={title}
                                            onMouseDown={e => { e.preventDefault(); handleFormat(open); }}
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/8 transition-colors">
                                            <Icon className="w-3.5 h-3.5" />
                                        </button>
                                    ))}
                                    <button type="button" title="Quote (> )" onMouseDown={e => { e.preventDefault(); handleFormat('> ', ''); }}
                                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/8 transition-colors text-[11px] font-bold leading-none">
                                        "
                                    </button>

                                    <span className="mx-1 text-border">|</span>

                                    {/* Text colour */}
                                    <div className="relative">
                                        <button type="button" title="Text colour"
                                            onMouseDown={e => { e.preventDefault(); setColorMenu(m => m === 'fg' ? null : 'fg'); }}
                                            className={cn("p-1.5 rounded-md transition-colors", colorMenu === 'fg' ? 'bg-black/10 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-black/8')}>
                                            <Baseline className="w-3.5 h-3.5" />
                                        </button>
                                        {colorMenu === 'fg' && (
                                            <ColorSwatches swatches={TEXT_SWATCHES} label="Text colour"
                                                onPick={c => applyColor('fg', c)} onClose={() => setColorMenu(null)} />
                                        )}
                                    </div>

                                    {/* Highlight */}
                                    <div className="relative">
                                        <button type="button" title="Highlight"
                                            onMouseDown={e => { e.preventDefault(); setColorMenu(m => m === 'bg' ? null : 'bg'); }}
                                            className={cn("p-1.5 rounded-md transition-colors", colorMenu === 'bg' ? 'bg-black/10 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-black/8')}>
                                            <Highlighter className="w-3.5 h-3.5" />
                                        </button>
                                        {colorMenu === 'bg' && (
                                            <ColorSwatches swatches={HIGHLIGHT_SWATCHES} label="Highlight"
                                                onPick={c => applyColor('bg', c)} onClose={() => setColorMenu(null)} />
                                        )}
                                    </div>

                                    <span className="ml-auto text-[10px] text-muted-foreground/50 pr-1 hidden sm:block">Shift+Enter for newline</span>
                                </div>

                                {/* Input row */}
                                <div className="flex items-end gap-2">
                                    {/* Emoji */}
                                    <div ref={emojiRef} className="relative shrink-0">
                                        <button type="button" onClick={() => setShowEmoji(v => !v)}
                                            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5 transition-colors">
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        <AnimatePresence>
                                            {showEmoji && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                    transition={{ duration: 0.14 }}
                                                    className="absolute bottom-12 left-0 z-50"
                                                >
                                                    <EmojiPicker
                                                        onEmojiClick={handleEmojiClick}
                                                        theme={Theme.LIGHT}
                                                        emojiStyle={EmojiStyle.NATIVE}
                                                        height={380}
                                                        width={320}
                                                        previewConfig={{ showPreview: false }}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* File attach */}
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5 transition-colors shrink-0 self-end mb-0.5">
                                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                    </button>
                                    <input ref={fileInputRef} type="file" className="hidden" multiple
                                        accept="image/*,application/pdf,.doc,.docx" onChange={handleFileSelect} />

                                    {/* Textarea (auto-resize, max 3 rows) */}
                                    <textarea
                                        ref={inputRef}
                                        rows={1}
                                        value={draft}
                                        onChange={e => {
                                            setDraft(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e as any);
                                            }
                                        }}
                                        placeholder="Type a message… (*bold* _italic_ ~strike~ `code`)"
                                        className="flex-1 bg-white rounded-xl px-4 py-2.5 text-[14px] outline-none border border-border focus:ring-2 focus:ring-primary/20 shadow-sm resize-none overflow-hidden leading-relaxed"
                                        style={{ minHeight: '42px', maxHeight: '120px' }}
                                    />

                                    {/* Send */}
                                    <button
                                        type="submit"
                                        disabled={(!draft.trim() && pendingAttachments.length === 0) || isUploading || isSending}
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all self-end",
                                            draft.trim() || pendingAttachments.length > 0
                                                ? "bg-primary text-white shadow-md hover:bg-primary/90"
                                                : "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                    >
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground p-8">
                        <div className="w-20 h-20 rounded-full bg-white/80 shadow-inner flex items-center justify-center">
                            <Users className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                        <div>
                            <p className="font-semibold text-base">Vrone Messages</p>
                            <p className="text-sm mt-1">Select a conversation or start a new one.</p>
                        </div>
                        <button onClick={() => setIsNewChatOpen(true)}
                            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow">
                            <Plus className="w-4 h-4" /> Start chat
                        </button>
                    </div>
                )}
            </div>

            {/* ── New chat dialog ── */}
            <Dialog open={isNewChatOpen} onOpenChange={(open) => {
                setIsNewChatOpen(open);
                if (!open) { setNewChatTab('Direct'); setGroupName(''); setGroupSelected([]); setDialogSearch(''); }
            }}>
                <DialogContent className="bg-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Start a new chat</DialogTitle>
                    </DialogHeader>

                    {/* Mode tabs */}
                    <div className="flex gap-1 p-0.5 bg-muted rounded-lg border border-border">
                        {(['Direct', 'Group'] as const).map(tab => (
                            <button key={tab} onClick={() => { setNewChatTab(tab); setDialogSearch(''); }}
                                className={cn(
                                    "flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors",
                                    newChatTab === tab ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}>
                                {tab === 'Direct' ? 'Direct' : '👥 Group'}
                            </button>
                        ))}
                    </div>

                    {newChatTab === 'Direct' ? (
                        <>
                            <input
                                placeholder="Search people…"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none"
                                value={dialogSearch}
                                onChange={e => setDialogSearch(e.target.value)}
                            />
                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                                {availableUsers
                                    .filter(u => u.name?.toLowerCase().includes(dialogSearch.toLowerCase()))
                                    .map(u => (
                                        <div key={u._id} onClick={() => startChat(u._id)}
                                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                                            <ChatAvatar name={u.name} image={u.image} size="md" />
                                            <div>
                                                <p className="text-sm font-semibold">{u.name}</p>
                                                <p className="text-xs text-muted-foreground">{u.jobTitle || u.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                {availableUsers.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-6">No users found</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <input
                                placeholder="Group name…"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                            />

                            {/* Selected chips — you are always a member */}
                            <div className="flex flex-wrap gap-1.5 pb-1">
                                <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1 font-semibold">
                                    {me?.name ? `${me.name} (You)` : 'You'}
                                </span>
                                {groupSelected.length > 0 && groupSelected.map(id => {
                                        const u = availableUsers.find(u => u._id === id);
                                        if (!u) return null;
                                        return (
                                            <span key={id} className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1 font-medium">
                                                {u.name}
                                                <button onClick={() => setGroupSelected(p => p.filter(x => x !== id))}
                                                    className="ml-0.5 hover:text-red-500 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                            </div>

                            <input
                                placeholder="Search people to add…"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none"
                                value={dialogSearch}
                                onChange={e => setDialogSearch(e.target.value)}
                            />

                            <div className="max-h-[200px] overflow-y-auto space-y-1">
                                {availableUsers
                                    .filter(u => u.name?.toLowerCase().includes(dialogSearch.toLowerCase()))
                                    .map(u => {
                                        const isSelected = groupSelected.includes(u._id);
                                        return (
                                            <div key={u._id}
                                                onClick={() => setGroupSelected(p => isSelected ? p.filter(x => x !== u._id) : [...p, u._id])}
                                                className={cn(
                                                    "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                                                    isSelected ? "bg-primary/10" : "hover:bg-muted"
                                                )}>
                                                <div className={cn(
                                                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                                                )}>
                                                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                                <ChatAvatar name={u.name} image={u.image} size="md" />
                                                <div>
                                                    <p className="text-sm font-semibold">{u.name}</p>
                                                    <p className="text-xs text-muted-foreground">{u.jobTitle || u.email}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            <Button
                                onClick={startGroupChat}
                                disabled={!groupName.trim() || groupSelected.length < 2}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Create Group{groupSelected.length >= 2 ? ` (${groupSelected.length})` : ''}
                            </Button>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
