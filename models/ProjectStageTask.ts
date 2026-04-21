import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectStageTask extends Document {
    projectId: string;
    stageId: string;
    moduleName?: string;
    title: string;
    description?: string;
    completed: boolean;
    attachments: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ProjectStageTaskSchema: Schema = new Schema(
    {
        projectId: { type: String, required: true },
        stageId: { type: String, required: true },
        moduleName: { type: String },
        title: { type: String, required: true },
        description: { type: String },
        completed: { type: Boolean, default: false },
        attachments: [{ type: String }],
    },
    { timestamps: true }
);

export default mongoose.models.ProjectStageTask ||
    mongoose.model<IProjectStageTask>('ProjectStageTask', ProjectStageTaskSchema);
