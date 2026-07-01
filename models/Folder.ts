import mongoose, { Schema, Document } from 'mongoose';

export interface IFolder extends Document {
    name: string;
    parentId?: string; // If nested
    createdBy: string; // User ID
    // Sharing: 'private' = creator only; 'shared' = everyone if sharedWith is empty, else the listed users
    visibility: 'private' | 'shared';
    sharedWith: string[]; // User IDs explicitly granted access
    path: string; // For breadcrumbs logic, optional but helpful
}

const FolderSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        parentId: { type: Schema.Types.ObjectId, ref: 'Folder' },
        createdBy: { type: String, required: true },
        visibility: { type: String, enum: ['private', 'shared'], default: 'private' },
        sharedWith: { type: [String], default: [] },
    },
    { timestamps: true }
);

export default mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);
