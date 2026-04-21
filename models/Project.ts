import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
    name: string;
    client: string; // Could be a reference to Client model later
    description?: string;
    status: 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    startDate: Date;
    endDate: Date;
    progress: number;
    teamMembers: mongoose.Types.ObjectId[]; // Reference to User
    template?: string; // Workflow template name
    budget?: number;
    completedStageIds?: string[];
    stageExtraModules?: Map<string, string[]>;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        client: { type: String, required: true },
        description: { type: String },
        status: {
            type: String,
            enum: ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
            default: 'Planning'
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium'
        },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        template: { type: String },
        budget: { type: Number },
        completedStageIds: [{ type: String }],
        stageExtraModules: { type: Map, of: [String], default: {} },
    },
    { timestamps: true }
);

// Indexes
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ client: 1 });
ProjectSchema.index({ name: 'text' }); // Enable text search

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
