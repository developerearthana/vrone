import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectStageMoodBoard extends Document {
    projectId: string;
    stageId: string;
    moduleName: string;
    completed: boolean;
    status?: string;
    description?: string;
    attachments: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ProjectStageMoodBoardSchema: Schema = new Schema(
    {
        projectId: { type: String, required: true },
        stageId: { type: String, required: true },
        moduleName: { type: String, required: true },
        completed: { type: Boolean, default: false },
        status: { type: String, default: 'Open' },
        description: { type: String },
        attachments: [{ type: String }],
    },
    { timestamps: true }
);

// One record per project + stage + module
ProjectStageMoodBoardSchema.index({ projectId: 1, stageId: 1, moduleName: 1 }, { unique: true });

export default mongoose.models.ProjectStageMoodBoard ||
    mongoose.model<IProjectStageMoodBoard>('ProjectStageMoodBoard', ProjectStageMoodBoardSchema);
