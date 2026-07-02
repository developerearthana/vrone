"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Search, MoreVertical, Paperclip, Smile,
    Check, CheckCheck, Plus, X, Users, EyeOff, Phone,
    Loader2, ArrowLeft, Pencil,
    Reply, Trash2, CornerUpLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    getConversations, getMessages, sendMessage, createConversation,
    getUsersForChat, deleteConversation, markAsRead, editMessage,
    toggleReaction, deleteMessageForEveryone,
} from '@/app/actions/activity/chat';
import { playChatPing } from '@/lib/chat-notify';
import { isHtmlContent, sanitizeChatHtml, normalizeReadBy, type ReadEntry } from '@/lib/chat-format';
import { format, isToday, isYesterday } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { uploadFile } from '@/app/actions/upload';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import RichComposer, { type RichComposerHandle } from '@/components/chat/RichComposer';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏'];

interface Message {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
    readBy: (string | ReadEntry)[];
    attachments?: string[];
    edited?: boolean;
    replyTo?: string | null;
    reactions?: { emoji: string; users: string[] }[];
    mentions?: string[];
    deletedAt?: string | null;
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
    if (isHtmlContent(content)) {
        return (
            <span className="chat-html leading-relaxed [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: sanitizeChatHtml(content) }} />
        );
    }
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

export default function ChatInterface({ mode = 'page' }: { mode?: 'page' | 'popup' }) {
    const { data: session } = useSession();
    const userId = session?.user?.id as string | undefined;
    const me = session?.user as { name?: string | null; image?: string | null } | undefined;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
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

    // Tracks the newest message id we've already seen per conversation, so the poller can
    // detect a genuinely new *incoming* message and fire the notification sound.
    const lastSeenMsgRef = useRef<Record<string, string>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<RichComposerHandle>(null);
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
    // Tracks each conversation's unread count so we can flash its row in the
    // picker when a new message arrives for a conversation the user isn't in.
    const prevUnreadRef = useRef<Record<string, number>>({});
    const [flashConvId, setFlashConvId] = useState<string | null>(null);
    const fetchConversations = useCallback(async () => {
        if (!userId) return;
        const res = await getConversations();
        if (res.success) {
            const data: Conversation[] = res.data;
            for (const conv of data) {
                const unread = conv.unreadCounts?.[userId] || 0;
                const prev = prevUnreadRef.current[conv._id];
                if (prev !== undefined && unread > prev && conv._id !== activeConvId) {
                    setFlashConvId(conv._id);
                    setTimeout(() => setFlashConvId(id => id === conv._id ? null : id), 2000);
                }
                prevUnreadRef.current[conv._id] = unread;
            }
            setConversations(data);
        }
    }, [userId, activeConvId]);

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
    const [editingContent, setEditingContent] = useState('');
    const startEdit = (msg: Message) => {
        setEditingId(msg._id);
        setEditingContent(msg.content);
        setReplyTo(null);
    };
    const cancelEdit = () => { setEditingId(null); setEditingContent(''); };

    // ── Emoji picker close on outside click ───────────────────────────────────
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
        };
        if (showEmoji) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showEmoji]);

    const handleEmojiClick = (emojiData: any) => {
        composerRef.current?.insertText(emojiData.emoji);
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

    // ── Group members for @mention suggestions ─────────────────────────────────
    const groupMembers = (activeConversation?.participants || [])
        .filter(p => p !== userId)
        .map(p => ({ id: p, name: userById(p)?.name || 'Unknown' }));

    // ── Read receipts ───────────────────────────────────────────────────────────
    // "Read by everyone" = every other participant of the conversation has a readBy entry.
    const readByEveryone = useCallback((msg: Message) => {
        if (!activeConversation) return false;
        const readers = new Set(normalizeReadBy(msg.readBy).map(e => e.user));
        const others = activeConversation.participants.filter(p => p !== msg.sender);
        return others.length > 0 && others.every(p => readers.has(p));
    }, [activeConversation]);

    const ReadIcon = ({ msg }: { msg: Message }) => {
        if (msg._id.startsWith('temp-')) return <Check className="w-3 h-3 text-white/50 inline" />;
        if (readByEveryone(msg)) return <CheckCheck className="w-3 h-3 text-sky-500 inline" />;
        const entries = normalizeReadBy(msg.readBy);
        if (entries.some(e => e.user !== userId)) return <CheckCheck className="w-3 h-3 text-white/60 inline" />;
        return <Check className="w-3 h-3 text-white/60 inline" />;
    };

    // ── Message info popover (per-reader read times) ────────────────────────────
    const [msgInfoId, setMsgInfoId] = useState<string | null>(null);
    const MessageInfo = ({ msg }: { msg: Message }) => {
        const entries = normalizeReadBy(msg.readBy).filter(e => e.user !== msg.sender);
        return (
            <div className="absolute bottom-full right-0 mb-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-2.5 w-52"
                onMouseDown={e => e.stopPropagation()}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Read by</p>
                {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Not read yet</p>
                ) : (
                    <div className="space-y-1">
                        {entries.map(e => (
                            <div key={e.user} className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-medium text-foreground truncate">{userById(e.user)?.name || 'Unknown'}</span>
                                <span className="text-muted-foreground shrink-0">
                                    {e.at ? format(e.at, 'd MMM, h:mm a') : 'read (time unknown)'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ── Reactions ────────────────────────────────────────────────────────────────
    const handleToggleReaction = async (msgId: string, emoji: string) => {
        if (!userId) return;
        setMessages(prev => prev.map(m => {
            if (m._id !== msgId) return m;
            const reactions = m.reactions ? [...m.reactions] : [];
            const idx = reactions.findIndex(r => r.emoji === emoji);
            if (idx >= 0) {
                const users = reactions[idx].users.includes(userId)
                    ? reactions[idx].users.filter(u => u !== userId)
                    : [...reactions[idx].users, userId];
                if (users.length === 0) reactions.splice(idx, 1);
                else reactions[idx] = { ...reactions[idx], users };
            } else {
                reactions.push({ emoji, users: [userId] });
            }
            return { ...m, reactions };
        }));
        const res = await toggleReaction(msgId, emoji);
        if (!res.success && activeConvId) fetchMessages(activeConvId);
    };

    // ── Reply ────────────────────────────────────────────────────────────────────
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const startReply = (msg: Message) => setReplyTo(msg);
    const scrollToMessage = (id: string) => {
        document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ── Delete for everyone ─────────────────────────────────────────────────────
    const handleDeleteMessage = async (msg: Message) => {
        if (!confirm('Delete this message for everyone?')) return;
        setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, deletedAt: new Date().toISOString(), content: '', attachments: [] } : m));
        const res = await deleteMessageForEveryone(msg._id);
        if (!res.success) { toast.error('Failed to delete message'); if (activeConvId) fetchMessages(activeConvId); }
    };

    // ── Send via the rich composer ──────────────────────────────────────────────
    const handleRichSend = async (html: string, mentions: string[]) => {
        if (!activeConvId) return;

        if (editingId) {
            const id = editingId;
            setMessages(prev => prev.map(m => m._id === id ? { ...m, content: html, edited: true } : m));
            setEditingId(null);
            const res = await editMessage(id, html);
            if (!res.success) { toast.error('Failed to edit message'); fetchMessages(activeConvId); }
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const tempMsg: Message = {
            _id: tempId,
            content: html,
            sender: userId || '',
            createdAt: new Date().toISOString(),
            readBy: [],
            attachments: pendingAttachments.map(a => a.url),
            replyTo: replyTo?._id || null,
            mentions,
        };
        setMessages(prev => [...prev, tempMsg]);
        setPendingAttachments([]);
        const currentReplyTo = replyTo?._id;
        setReplyTo(null);
        scrollToBottom();
        setIsSending(true);

        const res = await sendMessage(activeConvId, html, tempMsg.attachments, { replyTo: currentReplyTo, mentions });
        setIsSending(false);
        if (res.success) {
            setMessages(prev => prev.map(m => m._id === tempId ? res.data : m));
            fetchConversations();
            if (mentions.length > 0) toast.success('Mentions sent');
        } else {
            toast.error('Failed to send message');
            setMessages(prev => prev.filter(m => m._id !== tempId));
        }
    };

    const sidebarPane = (
            <div className={cn(
                "flex flex-col border-r border-border bg-muted/20 shrink-0 transition-all h-full",
                mode === 'popup'
                    ? "w-full"
                    : cn("w-full md:w-72 lg:w-80", showMobileChat ? "hidden md:flex" : "flex")
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
                                        activeConvId === id ? "bg-primary/10" : "hover:bg-muted/50",
                                        flashConvId === id && "animate-pulse bg-primary/15"
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
    );

    const chatPane = (
            <div className={cn(
                "flex-1 flex flex-col overflow-hidden min-w-0 bg-[#efeae2] h-full",
                mode === 'popup' ? "flex w-full" : (showMobileChat ? "flex" : "hidden md:flex")
            )}
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 0h80v80H0z' fill='none'/%3E%3C/svg%3E\")" }}
            >
                {activeConvId && activeConversation ? (
                    <>
                        {/* Chat header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] border-b border-border shadow-sm shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                <button className={cn(mode === 'popup' ? "" : "md:hidden", "p-1 -ml-1 text-muted-foreground")} onClick={() => setShowMobileChat(false)}>
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
                                            const isDeleted = !!msg.deletedAt;
                                            const prevMsg = group.msgs[i - 1];
                                            const sameAsPrev = prevMsg?.sender === msg.sender;
                                            const emojiOnly = msg.content && !isDeleted ? isEmojiOnly(msg.content) : false;
                                            const senderName = getSenderName(msg.sender);
                                            const senderImg = getSenderImage(msg.sender);
                                            const quoted = msg.replyTo ? messages.find(m => m._id === msg.replyTo) : undefined;
                                            const canEditOrDelete = !msg._id.startsWith('temp-') && !isDeleted;

                                            return (
                                                <motion.div
                                                    key={msg._id}
                                                    id={`msg-${msg._id}`}
                                                    initial={{ opacity: 0, y: 5, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                                                    className={cn("flex items-end mb-0.5 gap-1.5", isMe ? "justify-end" : "justify-start", sameAsPrev ? "mt-0.5" : "mt-3")}
                                                >
                                                    {/* Incoming avatar — every non-own message */}
                                                    {!isMe && (
                                                        <div className="w-7 shrink-0 self-end mb-0.5">
                                                            {!sameAsPrev
                                                                ? <ChatAvatar name={senderName} size="sm" image={senderImg} />
                                                                : <div className="w-7" />}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col" style={{ alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                                                        {/* Sender name (first message in a run) */}
                                                        {!isMe && !sameAsPrev && (
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
                                                            {/* Hover toolbar: reply, edit (own), delete (own) */}
                                                            {!isDeleted && (
                                                                <div className={cn(
                                                                    "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-white rounded-full shadow-sm border border-border px-0.5",
                                                                    isMe ? "-left-[4.7rem]" : "-right-[4.7rem]"
                                                                )}>
                                                                    <button onClick={() => startReply(msg)} title="Reply"
                                                                        className="p-1.5 rounded-full text-gray-400 hover:text-primary transition-colors">
                                                                        <Reply className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    {isMe && canEditOrDelete && msg.content && !emojiOnly && (
                                                                        <button onClick={() => startEdit(msg)} title="Edit message"
                                                                            className="p-1.5 rounded-full text-gray-400 hover:text-primary transition-colors">
                                                                            <Pencil className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                    {isMe && canEditOrDelete && (
                                                                        <button onClick={() => handleDeleteMessage(msg)} title="Delete for everyone"
                                                                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {isDeleted ? (
                                                                <span className="italic text-gray-400 text-xs flex items-center gap-1.5">
                                                                    <Trash2 className="w-3 h-3" /> message deleted
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    {/* Quoted reply preview */}
                                                                    {quoted && (
                                                                        <button onClick={() => scrollToMessage(quoted._id)}
                                                                            className="block w-full text-left mb-1.5 pl-2 border-l-2 border-primary/50 bg-black/[0.03] rounded-r px-2 py-1">
                                                                            <p className="text-[10px] font-semibold text-primary/80">{getSenderName(quoted.sender)}</p>
                                                                            <p className="text-[11px] text-gray-500 truncate">
                                                                                {quoted.deletedAt ? 'message deleted' : (quoted.content || '').replace(/<[^>]+>/g, '') || 'Attachment'}
                                                                            </p>
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
                                                                        <div className={cn("relative flex items-center justify-end gap-0.5 mt-1", msg.content ? "pl-8" : "")}>
                                                                            {msg.edited && <span className="text-[10px] text-gray-400 italic mr-0.5">edited</span>}
                                                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                                                {format(new Date(msg.createdAt), 'HH:mm')}
                                                                            </span>
                                                                            {isMe && (
                                                                                <button onClick={() => setMsgInfoId(id => id === msg._id ? null : msg._id)} className="leading-none">
                                                                                    <ReadIcon msg={msg} />
                                                                                </button>
                                                                            )}
                                                                            {isMe && msgInfoId === msg._id && <MessageInfo msg={msg} />}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Reaction cluster */}
                                                        {!isDeleted && msg.reactions && msg.reactions.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1 px-1">
                                                                {msg.reactions.map(r => (
                                                                    <button key={r.emoji} onClick={() => handleToggleReaction(msg._id, r.emoji)}
                                                                        className={cn(
                                                                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border shadow-sm transition-colors",
                                                                            userId && r.users.includes(userId)
                                                                                ? "bg-primary/10 border-primary/30"
                                                                                : "bg-white border-border hover:bg-muted"
                                                                        )}>
                                                                        <span>{r.emoji}</span>
                                                                        <span className="font-semibold text-gray-500">{r.users.length}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Quick-react bar (own + incoming) */}
                                                        {!isDeleted && (
                                                            <div className="flex items-center gap-0.5 mt-0.5 px-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                                {QUICK_REACTIONS.map(e => (
                                                                    <button key={e} onClick={() => handleToggleReaction(msg._id, e)}
                                                                        className="text-xs hover:scale-125 transition-transform">
                                                                        {e}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

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
                            {/* Reply banner */}
                            {replyTo && !editingId && (
                                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                                    <CornerUpLeft className="w-3.5 h-3.5 shrink-0 text-primary" />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-primary">{getSenderName(replyTo.sender)}</p>
                                        <p className="text-muted-foreground truncate max-w-[220px]">
                                            {replyTo.deletedAt ? 'message deleted' : replyTo.content.replace(/<[^>]+>/g, '') || 'Attachment'}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
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

                            <div className="flex items-end gap-2">
                                {/* Emoji */}
                                <div ref={emojiRef} className="relative shrink-0">
                                    <button type="button" onClick={() => setShowEmoji(v => !v)}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5 transition-colors mb-1">
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
                                    className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5 transition-colors shrink-0 self-end mb-1.5">
                                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                </button>
                                <input ref={fileInputRef} type="file" className="hidden" multiple
                                    accept="image/*,application/pdf,.doc,.docx" onChange={handleFileSelect} />

                                {/* Rich composer */}
                                <div className="flex-1">
                                    <RichComposer
                                        key={editingId || 'new'}
                                        ref={composerRef}
                                        onSend={handleRichSend}
                                        members={groupMembers}
                                        initialContent={editingId ? editingContent : undefined}
                                        placeholder="Type a message…"
                                        disabled={isUploading || isSending}
                                    />
                                </div>
                            </div>
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
    );

    const newChatDialog = (
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
    );

    // ── Popup mode: single-pane step flow (picker <-> conversation) ────────────
    if (mode === 'popup') {
        return (
            <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <AnimatePresence initial={false} mode="popLayout">
                    {!showMobileChat ? (
                        <motion.div
                            key="picker"
                            className="absolute inset-0 flex flex-col"
                            initial={{ x: -24, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -24, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        >
                            {sidebarPane}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="conversation"
                            className="absolute inset-0 flex flex-col"
                            initial={{ x: 24, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 24, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        >
                            {chatPane}
                        </motion.div>
                    )}
                </AnimatePresence>
                {newChatDialog}
            </div>
        );
    }

    // ── Page mode: classic two-pane layout (also handles narrow-viewport step flow) ──
    return (
        <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {sidebarPane}
            {chatPane}
            {newChatDialog}
        </div>
    );
}
