"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Users, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { getConversations, getUsersForChat } from '@/app/actions/activity/chat';
import { playChatPing } from '@/lib/chat-notify';
import { toPreviewText } from '@/lib/chat-format';
import ChatInterface from '@/components/activity/ChatInterface';

interface ChatNotif {
    id: string;
    senderName: string;
    senderImage?: string;
    isGroup: boolean;
    preview: string;
    addedAt: number;
}

type ViewState = 'closed' | 'panel' | 'full';

export default function ChatLauncher() {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    const [view, setView] = useState<ViewState>('closed');
    const [notifs, setNotifs] = useState<ChatNotif[]>([]);
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [pulse, setPulse] = useState(false);

    const prevUnread = useRef<Record<string, number>>({});
    const initialized = useRef(false);
    const usersRef = useRef<any[]>([]);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const viewRef = useRef<ViewState>('closed');
    useEffect(() => { viewRef.current = view; }, [view]);

    const isChatPage = pathname?.includes('/activity/chat');
    const dismiss = useCallback((id: string) => setNotifs(prev => prev.filter(n => n.id !== id)), []);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id) return;

        const loadUsers = async () => {
            const res = await getUsersForChat();
            if (res?.success) usersRef.current = res.data;
        };
        loadUsers();

        const poll = async () => {
            const res = await getConversations();
            if (!res.success) return;
            const userId = String(session.user.id);
            const newNotifs: ChatNotif[] = [];
            let total = 0;

            for (const conv of res.data) {
                const unread = (conv.unreadCounts as any)?.[userId] || 0;
                total += unread;
                const prev = prevUnread.current[conv._id] ?? null;

                if (initialized.current && prev !== null && unread > prev) {
                    const isGroup = conv.type === 'Group';
                    let senderName = 'Someone';
                    let senderImage: string | undefined;
                    if (isGroup) {
                        senderName = conv.name || 'Group';
                    } else {
                        const otherId = (conv.participants as string[]).find(p => p !== userId);
                        const other = usersRef.current.find(u => u._id === otherId);
                        senderName = other?.name || 'Someone';
                        senderImage = other?.image;
                    }
                    const preview = toPreviewText((conv.lastMessage as any)?.content || '') || '📎 Attachment';
                    newNotifs.push({
                        id: `${conv._id}-${Date.now()}`,
                        senderName, senderImage, isGroup,
                        preview: preview.length > 60 ? preview.slice(0, 60) + '…' : preview,
                        addedAt: Date.now(),
                    });
                }
                prevUnread.current[conv._id] = unread;
            }

            setUnreadTotal(total);

            if (!initialized.current) {
                initialized.current = true;
            } else if (newNotifs.length > 0) {
                // New message arrived: sound + bubble animation always; toast cards only while collapsed
                playChatPing();
                setPulse(true);
                setTimeout(() => setPulse(false), 1400);
                if (viewRef.current === 'closed') {
                    setNotifs(prev => [...prev, ...newNotifs].slice(-4));
                }
            }
        };

        poll();
        pollRef.current = setInterval(poll, 12000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [status, session?.user?.id]);

    // Auto-dismiss oldest toast after 8s
    useEffect(() => {
        if (notifs.length === 0) return;
        const t = setTimeout(() => {
            setNotifs(prev => {
                const oldest = prev.find(n => Date.now() - n.addedAt >= 8000);
                return oldest ? prev.filter(n => n.id !== oldest.id) : prev;
            });
        }, 8000);
        return () => clearTimeout(t);
    }, [notifs]);

    // Don't show the launcher on the dedicated full chat page (it has its own UI)
    if (status !== 'authenticated' || isChatPage) return null;

    const openChat = () => { setView('panel'); setNotifs([]); };

    return (
        <>
            {/* ── Expanded chat panel / fullscreen ── */}
            <AnimatePresence>
                {view !== 'closed' && (
                    <motion.div
                        key="chat-panel"
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                        className={
                            view === 'full'
                                ? "fixed inset-0 sm:inset-4 z-[260] flex flex-col bg-card rounded-none sm:rounded-2xl shadow-2xl border border-border overflow-hidden"
                                : "fixed bottom-4 right-4 z-[260] flex flex-col w-[calc(100vw-2rem)] sm:w-[400px] h-[600px] max-h-[calc(100vh-2rem)] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
                        }
                    >
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-primary text-primary-foreground shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-sm font-bold">Messages</span>
                                {unreadTotal > 0 && (
                                    <span className="text-[10px] font-bold bg-white/25 rounded-full px-1.5 py-0.5">{unreadTotal}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button onClick={() => setView(view === 'full' ? 'panel' : 'full')}
                                    title={view === 'full' ? 'Restore' : 'Fullscreen'}
                                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors">
                                    {view === 'full' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setView('closed')} title="Minimize to bubble"
                                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors">
                                    <Minus className="w-4 h-4" />
                                </button>
                                <button onClick={() => setView('closed')} title="Close"
                                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {/* Chat body */}
                        <div className="flex-1 min-h-0">
                            <ChatInterface mode={view === 'full' ? 'page' : 'popup'} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Notification toast cards (only while collapsed) ── */}
            {view === 'closed' && (
                <div className="fixed bottom-24 right-5 z-[250] flex flex-col-reverse gap-2.5 items-end pointer-events-none">
                    <AnimatePresence mode="popLayout">
                        {notifs.map((n, idx) => (
                            <motion.div
                                key={n.id}
                                layout
                                initial={{ opacity: 0, x: 60, scale: 0.88 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 60, scale: 0.88, transition: { duration: 0.18 } }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30, delay: idx * 0.04 }}
                                className="pointer-events-auto w-[300px] flex items-start gap-3 bg-card border border-border/60 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.18)] rounded-2xl px-4 py-3.5 cursor-pointer group"
                                onClick={openChat}
                            >
                                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm overflow-hidden ${n.isGroup ? 'bg-indigo-100 text-indigo-700' : 'bg-primary/15 text-primary'}`}>
                                    {n.senderImage
                                        ? <img src={n.senderImage} alt={n.senderName} className="w-full h-full object-cover" />
                                        : n.isGroup ? <Users className="w-4 h-4" /> : n.senderName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0 pr-1">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <MessageCircle className="w-3 h-3 text-primary shrink-0" />
                                        <p className="text-xs font-bold text-foreground truncate">{n.senderName}</p>
                                    </div>
                                    <p className="text-[12.5px] text-muted-foreground leading-snug line-clamp-2">{n.preview}</p>
                                </div>
                                <button onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                                    className="shrink-0 p-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors -mt-0.5 -mr-1"
                                    aria-label="Dismiss">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Floating chat bubble ── */}
            {view === 'closed' && (
                <motion.button
                    onClick={openChat}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={pulse
                        ? { scale: [1, 1.15, 1], opacity: 1 }
                        : { scale: 1, opacity: 1 }}
                    transition={pulse ? { duration: 0.6, repeat: 1 } : { type: 'spring', stiffness: 400, damping: 22 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    title="Open chat"
                    className="fixed bottom-5 right-5 z-[255] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] flex items-center justify-center hover:bg-primary/90"
                >
                    <MessageCircle className="w-6 h-6" />
                    {/* Ping ring on new message */}
                    {pulse && (
                        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                    )}
                    {/* Unread badge */}
                    {unreadTotal > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-card">
                            {unreadTotal > 99 ? '99+' : unreadTotal}
                        </span>
                    )}
                </motion.button>
            )}
        </>
    );
}
