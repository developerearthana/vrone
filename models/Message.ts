import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    conversationId: string;
    sender: string; // User ID
    content: string;
    attachments: string[];
    // Mixed for lazy legacy upgrade: strings (old) or { user, at } (new)
    readBy: (string | { user: string; at?: Date })[]; // User IDs who have read the message
    edited?: boolean;
    editedAt?: Date;
    replyTo?: string | null;
    reactions: { emoji: string; users: string[] }[];
    mentions: string[];
    deletedAt?: Date | null;
}

const MessageSchema: Schema = new Schema(
    {
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        sender: { type: String, required: true },
        content: { type: String, required: true },
        attachments: [{ type: String }],
        readBy: [{ type: Schema.Types.Mixed }],
        edited: { type: Boolean, default: false },
        editedAt: { type: Date },
        replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
        reactions: [{ emoji: { type: String, required: true }, users: [{ type: String }], _id: false }],
        mentions: [{ type: String }],
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
