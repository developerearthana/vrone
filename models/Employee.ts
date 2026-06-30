import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
    // Personal Info
    name: string;
    initial?: string;
    employeeId?: string;
    email?: string;
    jobTitle?: string;
    dept?: string;
    phone?: string;
    fatherName?: string;
    alternatePhone?: string;
    address?: string;
    dateOfBirth?: Date;
    gender?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    image?: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    // Employment Details
    reportingManager?: string; // name or ref
    probationEndDate?: Date;
    noticePeriod?: number; // months
    // Banking Details
    bankDetails?: {
        accountType?: string;
        accountHolderName?: string;
        bankName?: string;
        accountNumber?: string;
        upiId?: string;
        ifscCode?: string;
        bankBranch?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        initial: { type: String },
        employeeId: { type: String },
        email: { type: String },
        jobTitle: { type: String },
        dept: { type: String, default: 'General' },
        phone: { type: String },
        fatherName: { type: String },
        alternatePhone: { type: String },
        address: { type: String },
        dateOfBirth: { type: Date },
        gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
        bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
        image: { type: String },
        status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
        reportingManager: { type: String },
        probationEndDate: { type: Date },
        noticePeriod: { type: Number },
        bankDetails: {
            accountType: { type: String, enum: ['Savings', 'Checking'] },
            accountHolderName: { type: String },
            bankName: { type: String },
            accountNumber: { type: String },
            upiId: { type: String },
            ifscCode: { type: String },
            bankBranch: { type: String },
        },
    },
    { timestamps: true }
);

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
