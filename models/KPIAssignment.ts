import mongoose, { Schema, Document } from 'mongoose';

export type KPIAssignmentStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Missed';

export interface IKPIAssignment extends Document {
    title: string;
    description?: string;
    metric: string;
    unit: string;
    target: number;
    actual: number;
    status: KPIAssignmentStatus;
    priority: 'Low' | 'Medium' | 'High';
    frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
    dueDate: Date;
    // Assignment can be to a user OR a team (or both)
    assignedToUser?: mongoose.Types.ObjectId;    // individual user
    assignedToTeam?: mongoose.Types.ObjectId;    // whole team
    assignedBy: mongoose.Types.ObjectId;         // who created the assignment
    progress: number;                            // 0-100 %
    notes?: string;                              // member-added progress notes
    contributions: {
        user: mongoose.Types.ObjectId;
        value: number;
        date: Date;
        notes?: string;
    }[];
    category?: 'Financial' | 'HR' | 'Operations' | 'Sales' | 'Customer' | 'Quality' | 'Growth';
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const KPIAssignmentSchema = new Schema<IKPIAssignment>(
    {
        title: { type: String, required: true },
        description: { type: String },
        metric: { type: String, required: true },
        unit: { type: String, default: 'Count' },
        target: { type: Number, required: true, default: 100 },
        actual: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['Not Started', 'In Progress', 'Completed', 'Missed'],
            default: 'Not Started',
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium',
        },
        frequency: {
            type: String,
            enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
            default: 'Monthly',
        },
        dueDate: { type: Date, required: true },
        assignedToUser: { type: Schema.Types.ObjectId, ref: 'User' },
        assignedToTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
        assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        notes: { type: String },
        contributions: [
            {
                user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                value: { type: Number, required: true },
                date: { type: Date, default: Date.now },
                notes: { type: String },
            }
        ],
        category: { type: String, enum: ['Financial', 'HR', 'Operations', 'Sales', 'Customer', 'Quality', 'Growth'], default: 'Operations' },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

// Indexes for efficient querying
KPIAssignmentSchema.index({ assignedToUser: 1, status: 1 });
KPIAssignmentSchema.index({ assignedToTeam: 1, status: 1 });
KPIAssignmentSchema.index({ assignedBy: 1 });
KPIAssignmentSchema.index({ dueDate: 1 });

export default mongoose.models.KPIAssignment ||
    mongoose.model<IKPIAssignment>('KPIAssignment', KPIAssignmentSchema);
