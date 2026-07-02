import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    title: string;
    description?: string;
    start: Date;
    end?: Date;
    isAllDay?: boolean;
    type: 'Meeting' | 'Task' | 'Reminder' | 'Holiday';
    attendees?: string[]; // User IDs or Names
    location?: string;
    createdBy: string;
    createdAt: Date;
}

const EventSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        start: { type: Date, required: true },
        end: { type: Date },
        isAllDay: { type: Boolean, default: false },
        type: {
            type: String,
            enum: ['Meeting', 'Task', 'Reminder', 'Holiday'],
            default: 'Meeting'
        },
        attendees: [{ type: String }],
        location: { type: String },
        // New Fields
        recurrence: {
            frequency: { type: String, enum: ['None', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'], default: 'None' },
            interval: { type: Number, default: 1 },
            endDate: { type: Date }
        },
        alert: { type: Boolean, default: false },
        alertType: { type: String, enum: ['Login', 'Dashboard', 'Email', 'None'], default: 'None' },
        linkedModel: { type: String, enum: ['Project', 'Lead', 'Deal', 'None'], default: 'None' },
        linkedId: { type: String },
        createdBy: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
