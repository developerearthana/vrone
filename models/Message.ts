import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    conversationId: string;
    sender: string; // User ID
    content: string;
    attachments: string[];
    readBy: string[]; // User IDs who have read the message
    edited?: boolean;
    editedAt?: Date;
}

const MessageSchema: Schema = new Schema(
    {
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        sender: { type: String, required: true },
        content: { type: String, required: true },
        attachments: [{ type: String }],
        readBy: [{ type: String }],
        edited: { type: Boolean, default: false },
        editedAt: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
