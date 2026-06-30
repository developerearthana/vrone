import mongoose, { Schema, Document } from 'mongoose';

export type CompanyEventType =
    | 'National Holiday'
    | 'State Holiday'
    | 'Optional Holiday'
    | 'Office Managed Leave'
    | 'Client Meeting'
    | 'Vendor Meeting'
    | 'Internal Meeting'
    | 'Leadership Review'
    | 'Announcement'
    | 'Employee Birthday'
    | 'Work Anniversary';

export type MeetingMode = 'In Person' | 'Google Meet' | 'Phone Call' | 'Site Visit';

export interface ICompanyEvent extends Document {
    title: string;
    description?: string;
    type: CompanyEventType;
    start: Date;
    end?: Date;
    isAllDay: boolean;
    participants: Array<{
        refType: 'employee' | 'contact';
        refId?: string;
        name: string;
        email?: string;
    }>;
    meetingMode?: MeetingMode;
    meetingLink?: string;
    location?: string;
    googleEventId?: string;
    googleCalendarId?: string;
    isRecurring?: boolean;
    createdBy: string;
}

const ParticipantSchema = new Schema({
    refType: { type: String, enum: ['employee', 'contact'], default: 'employee' },
    refId: { type: String },
    name: { type: String, required: true },
    email: { type: String },
}, { _id: false });

const CompanyEventSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    type: {
        type: String,
        enum: [
            'National Holiday', 'State Holiday', 'Optional Holiday', 'Office Managed Leave',
            'Client Meeting', 'Vendor Meeting', 'Internal Meeting', 'Leadership Review',
            'Announcement', 'Employee Birthday', 'Work Anniversary',
        ],
        required: true,
    },
    start: { type: Date, required: true },
    end: { type: Date },
    isAllDay: { type: Boolean, default: true },
    participants: { type: [ParticipantSchema], default: [] },
    meetingMode: { type: String, enum: ['In Person', 'Google Meet', 'Phone Call', 'Site Visit'] },
    meetingLink: { type: String },
    location: { type: String },
    googleEventId: { type: String },
    googleCalendarId: { type: String },
    isRecurring: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
}, { timestamps: true });

CompanyEventSchema.index({ start: 1 });
CompanyEventSchema.index({ type: 1 });

export default mongoose.models.CompanyEvent || mongoose.model<ICompanyEvent>('CompanyEvent', CompanyEventSchema);
