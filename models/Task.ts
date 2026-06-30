import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
    title: string;
    description?: string;
    status: 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Archived';
    priority: 'Low' | 'Medium' | 'High';
    color?: string; // Google Keep-style card colour token
    pinned?: boolean;
    dueDate?: Date;
    assignees: string[];
    tags: string[];
    attachments: string[];
    checklist?: { text: string; completed: boolean }[];
    remarks?: string;
    project?: string;
    teamId?: string;
    createdBy: string;
}

const TaskSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        status: {
            type: String,
            enum: ['To Do', 'In Progress', 'In Review', 'Done', 'Archived'],
            default: 'To Do',
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium',
        },
        color: { type: String, default: 'default' },
        pinned: { type: Boolean, default: false },
        dueDate: { type: Date },
        assignees: [{ type: String }],
        tags: [{ type: String }],
        attachments: [{ type: String }],
        checklist: [{
            text: { type: String, required: true },
            completed: { type: Boolean, default: false },
        }],
        remarks: { type: String },
        project: { type: String },
        teamId: { type: String },
        createdBy: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
