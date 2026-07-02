"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Users } from 'lucide-react';
import { getConversations, getUsersForChat } from '@/app/actions/activity/chat';
import { toPreviewText } from '@/lib/chat-format';

interface ChatNotif {
    id: string;
    senderName: string;
    senderImage?: string;
    isGroup: boolean;
    convId: string;
    preview: string;
    addedAt: number;
}

export default function ChatNotificationBubble() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const [notifs, setNotifs] = useState<ChatNotif[]>([]);
    const prevUnread = useRef<Record<string, number>>({});
    const initialized = useRef(false);
    const usersRef = useRef<any[]>([]);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isChatPage = pathname?.includes('/activity/chat') || pathname?.includes('/chat');

    const dismiss = useCallback((id: string) => {
        setNotifs(prev => prev.filter(n => n.id !== id));
    }, []);

    const handleClick = useCallback((notif: ChatNotif) => {
        dismiss(notif.id);
        router.push('/activity/chat');
    }, [dismiss, router]);

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

            for (const conv of res.data) {
                const unread = (conv.unreadCounts as any)?.[userId] || 0;
                const prev = prevUnread.current[conv._id] ?? null;

                if (!initialized.current) {
                    // First poll: snapshot baseline — don't notify for pre-existing unreads
                    prevUnread.current[conv._id] = unread;
                    continue;
                }

                if (prev !== null && unread > prev) {
                    const isGroup = conv.type === 'Group';
                    let senderName = 'Unknown';
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
                        senderName,
                        senderImage,
                        isGroup,
                        convId: conv._id,
                        preview: preview.length > 60 ? preview.slice(0, 60) + '…' : preview,
                        addedAt: Date.now(),
                    });
                }

                prevUnread.current[conv._id] = unread;
            }

            if (!initialized.current) {
                initialized.current = true;
            } else if (newNotifs.length > 0 && !isChatPage) {
                setNotifs(prev => [...prev, ...newNotifs].slice(-4));
            }
        };

        poll();
        pollRef.current = setInterval(poll, 12000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [status, session?.user?.id, isChatPage]);

    // Auto-dismiss after 8 seconds
    useEffect(() => {
        if (notifs.length === 0) return;
        const timer = setTimeout(() => {
            setNotifs(prev => {
                const oldest = prev.find(n => Date.now() - n.addedAt >= 8000);
                if (!oldest) return prev;
                return prev.filter(n => n.id !== oldest.id);
            });
        }, 8000);
        return () => clearTimeout(timer);
    }, [notifs]);

    if (isChatPage || notifs.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-5 z-[250] flex flex-col-reverse gap-2.5 items-end pointer-events-none">
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
                        onClick={() => handleClick(n)}
                        style={{ willChange: 'transform, opacity' }}
                    >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm overflow-hidden ${n.isGroup ? 'bg-indigo-100 text-indigo-700' : 'bg-primary/15 text-primary'}`}>
                            {n.senderImage
                                ? <img src={n.senderImage} alt={n.senderName} className="w-full h-full object-cover" />
                                : n.isGroup
                                    ? <Users className="w-4.5 h-4.5" />
                                    : n.senderName.substring(0, 2).toUpperCase()}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <MessageCircle className="w-3 h-3 text-primary shrink-0" />
                                <p className="text-xs font-bold text-foreground truncate">{n.senderName}</p>
                            </div>
                            <p className="text-[12.5px] text-muted-foreground leading-snug line-clamp-2">{n.preview}</p>
                        </div>

                        {/* Close */}
                        <button
                            onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                            className="shrink-0 p-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors -mt-0.5 -mr-1"
                            aria-label="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
