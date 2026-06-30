import connectToDatabase from '@/lib/db';
import PettyCashTransaction from '@/models/PettyCashTransaction';
import { logDataChange } from '@/lib/audit';
import { sanitizeObject } from '@/lib/sanitize';
import mongoose from 'mongoose';

export interface PettyCashData {
    subsidiary: string;
    location: string;
    type: 'Income' | 'Expense';
    party: string;
    category: string;
    reference: string;
    date: string | Date;
    amount: number;
    remarks?: string;
    paymentMode: string;
    bankAccount?: string;
    createdBy?: string;
}

/**
 * Service layer for Accounting/Petty Cash operations
 * Handles business logic and database transactions
 */
export class AccountingService {
    /**
     * Create a petty cash transaction
     */
    async createPettyCashEntry(data: PettyCashData, userId?: string): Promise<any> {
        await connectToDatabase();

        // Sanitize input data
        const sanitizedData = sanitizeObject(data);

        // Validate business rules
        if (sanitizedData.type === 'Expense' && sanitizedData.amount <= 0) {
            throw new Error('Expense amount must be greater than 0');
        }

        // Create transaction
        const transaction = await PettyCashTransaction.create({
            ...(sanitizedData as any),
            amount: typeof sanitizedData.amount === 'string'
                ? parseFloat(sanitizedData.amount)
                : sanitizedData.amount,
            date: new Date(sanitizedData.date),
            status: 'Pending',
            createdBy: userId,
        });

        if (userId) {
            await logDataChange('create', 'PettyCashTransaction', transaction._id.toString(), userId, {
                type: sanitizedData.type,
                amount: sanitizedData.amount,
                party: sanitizedData.party,
            });
        }

        return JSON.parse(JSON.stringify(transaction));
    }

    /**
     * Approve a petty cash transaction
     */
    async approvePettyCashEntry(
        transactionId: string,
        approverId: string
    ): Promise<void> {
        await connectToDatabase();

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await PettyCashTransaction.findById(transactionId).session(session);

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            if (transaction.status !== 'Pending') {
                throw new Error('Transaction is not pending approval');
            }

            // Update transaction status
            transaction.status = 'Approved';
            transaction.approvedBy = new mongoose.Types.ObjectId(approverId);
            transaction.approvalDate = new Date();
            await transaction.save({ session });

            await session.commitTransaction();

            await logDataChange('update', 'PettyCashTransaction', transactionId, approverId, {
                action: 'approve',
            });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Reject a petty cash transaction
     */
    async rejectPettyCashEntry(
        transactionId: string,
        approverId: string,
        reason?: string
    ): Promise<void> {
        await connectToDatabase();

        const transaction = await PettyCashTransaction.findById(transactionId);

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.status !== 'Pending') {
            throw new Error('Transaction is not pending approval');
        }

        transaction.status = 'Rejected';
        transaction.approvedBy = new mongoose.Types.ObjectId(approverId);
        transaction.approvalDate = new Date();
        if (reason) {
            transaction.remarks = `${transaction.remarks || ''}\nRejection reason: ${reason}`;
        }
        await transaction.save();

        await logDataChange('update', 'PettyCashTransaction', transactionId, approverId, {
            action: 'reject',
            reason,
        });
    }

    /**
     * Get transactions by status
     */
    async getTransactionsByStatus(status: 'Pending' | 'Approved' | 'Rejected'): Promise<any[]> {
        await connectToDatabase();

        const transactions = await PettyCashTransaction.find({ status })
            .sort({ date: -1 })
            .lean();

        return JSON.parse(JSON.stringify(transactions));
    }

    /**
     * Get transactions for a date range
     */
    async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
        await connectToDatabase();

        const transactions = await PettyCashTransaction.find({
            date: {
                $gte: startDate,
                $lte: endDate,
            },
        })
            .sort({ date: -1 })
            .lean();

        return JSON.parse(JSON.stringify(transactions));
    }
}

// Export singleton instance
export const accountingService = new AccountingService();
