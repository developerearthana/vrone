import mongoose, { Schema, Document } from 'mongoose';

export type HolidayType = 'National' | 'State' | 'Optional' | 'Restricted';

export interface IHoliday extends Document {
    date: Date;
    name: string;
    type: HolidayType;
    theme: string;        // festival theme key → drives cell colour/animation (see lib/holiday-themes)
    region: string;       // 'National' | 'Tamil Nadu'
    isWorkingDay: boolean; // admin override: some optional holidays are worked
    description?: string;
    createdBy?: string;
}

const HolidaySchema: Schema = new Schema({
    date: { type: Date, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['National', 'State', 'Optional', 'Restricted'], default: 'National' },
    theme: { type: String, default: 'default' },
    region: { type: String, default: 'National' },
    isWorkingDay: { type: Boolean, default: false },
    description: { type: String },
    createdBy: { type: String },
}, { timestamps: true });

// One holiday entry per (date, name) — lets multiple observances share a date if needed
HolidaySchema.index({ date: 1, name: 1 }, { unique: true });
HolidaySchema.index({ date: 1 });

export default mongoose.models.Holiday || mongoose.model<IHoliday>('Holiday', HolidaySchema);
