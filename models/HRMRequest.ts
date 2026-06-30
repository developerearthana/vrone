import mongoose, { Schema, Document } from 'mongoose';

export type HRMRequestCategory = 'Leave' | 'WFH' | 'On Duty' | 'Travel' | 'Other';
export type HRMRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type LeaveSubType = 'Sick' | 'Casual' | 'Festival' | 'Emergency' | 'Annual' | 'Earned' | 'Other';

export interface IHRMRequest extends Document {
    userId: mongoose.Types.ObjectId;
    userName: string;
    userImage?: string;
    dept?: string;
    category: HRMRequestCategory;
    leaveSubType?: LeaveSubType;
    startDate: Date;
    endDate: Date;
    halfDay?: boolean;
    reason: string;
    location?: string;
    destination?: string;
    status: HRMRequestStatus;
    adminNote?: string;
    approverId?: mongoose.Types.ObjectId;
    approverName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const HRMRequestSchema = new Schema<IHRMRequest>({
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName:     { type: String, required: true },
    userImage:    { type: String },
    dept:         { type: String },
    category:     { type: String, enum: ['Leave', 'WFH', 'On Duty', 'Travel', 'Other'], required: true },
    leaveSubType: { type: String, enum: ['Sick', 'Casual', 'Festival', 'Emergency', 'Annual', 'Earned', 'Other'] },
    startDate:    { type: Date, required: true },
    endDate:      { type: Date, required: true },
    halfDay:      { type: Boolean, default: false },
    reason:       { type: String, required: true },
    location:     { type: String },
    destination:  { type: String },
    status:       { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending' },
    adminNote:    { type: String },
    approverId:   { type: Schema.Types.ObjectId, ref: 'User' },
    approverName: { type: String },
}, { timestamps: true });

HRMRequestSchema.index({ userId: 1 });
HRMRequestSchema.index({ status: 1 });
HRMRequestSchema.index({ category: 1, status: 1 });
HRMRequestSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.models.HRMRequest ||
    mongoose.model<IHRMRequest>('HRMRequest', HRMRequestSchema);
