'use server';

import { auth } from '@/auth';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { isHtmlContent, sanitizeChatHtml, normalizeReadBy } from '@/lib/chat-format';

export async function sendMessage(
    conversationId: string,
    content: string,
    attachments: string[] = [],
    opts?: { replyTo?: string; mentions?: string[] }
) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const senderId = session.user.id;
        const clean = isHtmlContent(content) ? sanitizeChatHtml(content) : content;

        const newMessage = new Message({
            conversationId,
            sender: senderId,
            content: clean,
            attachments,
            readBy: [{ user: senderId, at: new Date() }],
            replyTo: opts?.replyTo || null,
            mentions: opts?.mentions || [],
        });


        const savedMessage = await newMessage.save();
        const plainMessage = savedMessage.toObject();

        // Update conversation: Set last message, update time, and un-archive for all
        const conv = await Conversation.findById(conversationId);
        if (conv) {
            conv.lastMessage = plainMessage._id;
            conv.lastMessageAt = new Date();
            conv.archivedBy = [];
            
            // Increment unread counts for everyone EXCEPT the sender
            const participants = conv.participants || [];
            participants.forEach((pId: string) => {
                if (String(pId) !== String(senderId)) {
                    const current = conv.unreadCounts.get(String(pId)) || 0;
                    conv.unreadCounts.set(String(pId), current + 1);
                }
            });
            
            await conv.save();
        }

        return { success: true, data: JSON.parse(JSON.stringify(plainMessage)) };
    } catch (error: any) {
        console.error("Send Message Error:", error);
        return { success: false, error: error.message };
    }
}

export async function editMessage(messageId: string, content: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        if (!content.trim()) throw new Error('Message cannot be empty');

        const msg = await Message.findById(messageId);
        if (!msg) throw new Error('Message not found');
        // Only the original sender may edit their own message
        if (String(msg.sender) !== String(session.user.id)) throw new Error('You can only edit your own messages');

        msg.content = isHtmlContent(content) ? sanitizeChatHtml(content) : content;
        msg.edited = true;
        msg.editedAt = new Date();
        await msg.save();

        return { success: true, data: JSON.parse(JSON.stringify(msg.toObject())) };
    } catch (error: any) {
        console.error('Edit Message Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getMessages(conversationId: string, limit = 200) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();

        return { success: true, data: JSON.parse(JSON.stringify(messages)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getConversations() {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const conversations = await Conversation.find({
            participants: session.user.id,
            archivedBy: { $ne: session.user.id }
        })
        .sort({ lastMessageAt: -1 })
        .populate('lastMessage')
        .lean();

        return { success: true, data: JSON.parse(JSON.stringify(conversations)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createConversation(participantIds: string[], type: 'Individual' | 'Group' = 'Individual', name?: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const allParticipants = [...new Set([session.user.id, ...participantIds])];

        // Check if exists
        if (type === 'Individual') {
            const existing = await Conversation.findOne({
                type: 'Individual',
                participants: { $all: allParticipants, $size: allParticipants.length }
            });

            if (existing) {
                // Un-archive if hidden
                if (existing.archivedBy && existing.archivedBy.includes(session.user.id)) {
                    await Conversation.findByIdAndUpdate(existing._id, {
                        $pull: { archivedBy: session.user.id }
                    });
                }
                return { success: true, data: JSON.parse(JSON.stringify(existing)) };
            }
        }

        const newConv = new Conversation({
            participants: allParticipants,
            type,
            name
        });

        await newConv.save();
        return { success: true, data: JSON.parse(JSON.stringify(newConv)) };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// getUsersForChat is already correctly implemented below

export async function getUsersForChat() {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const users = await User.find({ _id: { $ne: session.user.id } })
            .select('name email image role')
            .sort({ name: 1 })
            .lean();

        return { success: true, data: JSON.parse(JSON.stringify(users)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function clearChatHistory(conversationId: string, beforeDate?: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        // This is a DESTRUCTIVE clear for everyone?
        // Usually "Clear Chat" means "Clear for ME".
        // But implementing true "Clear for Me" requires "deletedFor: [{userId, timestamp}]" in every message or a "clearTime" in Conversation-User-Meta.
        // Given complexity, and user request "cleared not chat data", 
        // the user likely means "Remove from Recent List" which is achieved by "deleteConversation" (Archive).
        // If they explicitly click "Clear History" inside the chat, they probably mean DELETE ALL.
        // So I will keep this destructive for now as per original code, but "Board Area" text likely referred to the list.

        // Corporate policy: chat history is a permanent record and must NOT be destroyed.
        // "Clear" now only hides the conversation from the user's list (archive), preserving
        // every message. Kept the signature for backward compatibility.
        void beforeDate;
        await Conversation.findByIdAndUpdate(conversationId, {
            $addToSet: { archivedBy: session.user.id }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Rename this conceptually to "Archive" but keep name to match frontend call
export async function deleteConversation(conversationId: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        // Soft Delete (Archive) for this user
        await Conversation.findByIdAndUpdate(conversationId, {
            $addToSet: { archivedBy: session.user.id }
        });

        // DO NOT delete messages
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAllConversations() {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const conversations = await Conversation.find({ participants: session.user.id });

        // Archive all
        await Conversation.updateMany(
            { _id: { $in: conversations.map(c => c._id) } },
            { $addToSet: { archivedBy: session.user.id } }
        );

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markAsRead(conversationId: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const userId = session.user.id;

        // Find the conversation
        const conv = await Conversation.findById(conversationId);
        if (conv && conv.unreadCounts) {
            conv.unreadCounts.set(String(userId), 0);
            await conv.save();
        }

        // Timestamp each unread message as read by this user, lazily upgrading
        // any legacy string readBy entries in the same write.
        const msgs = await Message.find({ conversationId, deletedAt: null });
        for (const m of msgs) {
            const entries = normalizeReadBy(m.readBy as any[]);
            const hasLegacyStrings = (m.readBy as any[]).some((r: any) => typeof r === 'string');
            if (!entries.some(e => e.user === userId)) {
                m.readBy = [...entries, { user: userId, at: new Date() }] as any;
                m.markModified('readBy');
                await m.save();
            } else if (hasLegacyStrings) {
                m.readBy = entries as any;
                m.markModified('readBy');
                await m.save();
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Mark as read error:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleReaction(messageId: string, emoji: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        const userId = session.user.id;

        const msg = await Message.findById(messageId);
        if (!msg) throw new Error('Message not found');

        const entry = msg.reactions.find((r: any) => r.emoji === emoji);
        if (entry) {
            if (entry.users.includes(userId)) {
                entry.users = entry.users.filter((u: string) => u !== userId);
                if (entry.users.length === 0) {
                    msg.reactions = msg.reactions.filter((r: any) => r.emoji !== emoji);
                }
            } else {
                entry.users.push(userId);
            }
        } else {
            msg.reactions.push({ emoji, users: [userId] });
        }
        msg.markModified('reactions');
        await msg.save();

        return { success: true, data: JSON.parse(JSON.stringify(msg.reactions)) };
    } catch (error: any) {
        console.error('Toggle reaction error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteMessageForEveryone(messageId: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const msg = await Message.findById(messageId);
        if (!msg) throw new Error('Message not found');
        if (String(msg.sender) !== String(session.user.id)) {
            throw new Error('Only the sender can delete this message');
        }

        msg.deletedAt = new Date();
        msg.content = '';
        msg.attachments = [];
        await msg.save();

        return { success: true };
    } catch (error: any) {
        console.error('Delete message error:', error);
        return { success: false, error: error.message };
    }
}
