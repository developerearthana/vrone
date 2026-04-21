import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectBoardComment extends Document {
    projectId: string;
    stageId: string;
    moduleName: string;
    userId: string;
    userName: string;
    userEmail: string;
    userImage?: string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectBoardCommentSchema: Schema = new Schema(
    {
        projectId: { type: String, required: true },
        stageId: { type: String, required: true },
        moduleName: { type: String, required: true },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true },
        userImage: { type: String },
        text: { type: String, required: true },
    },
    { timestamps: true }
);

ProjectBoardCommentSchema.index({ projectId: 1, stageId: 1, moduleName: 1 });

export default mongoose.models.ProjectBoardComment ||
    mongoose.model<IProjectBoardComment>('ProjectBoardComment', ProjectBoardCommentSchema);
