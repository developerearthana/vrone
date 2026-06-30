import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    image?: string;
    role: 'user' | 'admin' | 'vendor' | 'customer' | 'super-admin' | 'manager' | 'staff';
    provider: 'credentials' | 'google';
    customRole?: mongoose.Types.ObjectId; // Reference to Role model
    createdAt: Date;
    updatedAt: Date;
    salaryStructure?: {
        basic: number;
        hra: number;
        allowances: number;
        deductions: {
            pf: number;
            tax: number;
            other: number;
        }
    };
}

const UserSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, select: false },
        phone: { type: String },
        companyEmails: { type: [String], default: [] },
        image: { type: String },
        role: { type: String, enum: ['user', 'admin', 'vendor', 'customer', 'super-admin', 'manager', 'staff'], default: 'user' }, // Flexible role for UI
        dept: { type: String, default: 'General' },
        status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
        jobTitle: { type: String },
        customRole: { type: Schema.Types.ObjectId, ref: 'Role' },
        customPermissions: { type: [String], default: [] }, // User-specific permission overrides
        provider: { type: String, enum: ['credentials', 'google'], default: 'credentials' },
        ipRestrictionEnabled: { type: Boolean, default: false },
        allowedIP: { type: String },
        ipRestrictionLiftedUntil: { type: Date },
        salaryStructure: {
            basic: { type: Number, default: 0 },
            hra: { type: Number, default: 0 },
            allowances: { type: Number, default: 0 },
            deductions: {
                pf: { type: Number, default: 0 },
                tax: { type: Number, default: 0 },
                other: { type: Number, default: 0 }
            }
        },
        viewPreferences: { type: Map, of: String, default: {} },
        // Extended employee profile
        isEmployee: { type: Boolean, default: false },
        employeeId: { type: String },
        employeeCategory: { type: String },
        alternatePhone: { type: String },
        dateOfBirth: { type: Date },
        gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
        maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
        reportingManager: { type: Schema.Types.ObjectId, ref: 'User' },
        probationEndDate: { type: Date },
        noticePeriod: { type: Number }, // in months
        bankDetails: {
            bankName: { type: String },
            accountType: { type: String, enum: ['Savings', 'Checking'] },
            accountHolderName: { type: String },
            accountNumber: { type: String },
            upiId: { type: String }
        }
    },
    { timestamps: true }
);

UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isEmployee: 1 });
UserSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
