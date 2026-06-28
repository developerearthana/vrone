"use server";

import { z } from "zod";
import { createAction, createJSONAction } from "@/lib/safe-action";
import connectToDatabase from "@/lib/db";
import BankAccount from "@/models/BankAccount";
import Invoice from "@/models/Invoice";
import PettyCashTransaction from "@/models/PettyCashTransaction";
import { revalidatePath } from "next/cache";

// --- EXISTING SCHEMAS ---
const BankAccountSchema = z.object({
    bankName: z.string().min(1, "Bank Name is required"),
    accountName: z.string().min(1, "Account Name is required"),
    accountNumber: z.string().min(5, "Valid Account Number is required"),
    accountType: z.enum(["Savings", "Current", "Overdraft", "Credit Card"]),
    branch: z.string().optional(),
    ifscCode: z.string().optional(),
    openingBalance: z.coerce.number().default(0),
    isActive: z.boolean().default(true),
});

const TransactionSchema = z.object({
    accountId: z.string().min(1, "Account ID is required"),
    type: z.enum(["Deposit", "Withdrawal"]),
    amount: z.coerce.number().min(1, "Amount must be greater than 0"),
    date: z.string().min(1, "Date is required"),
    description: z.string().min(1, "Description is required"),
    reference: z.string().optional(), // Check/Ref No
});

// --- ACTIONS ---

export const createBankAccount = createAction(BankAccountSchema, async (data) => {
    await connectToDatabase();
    try {
        const newAccount = await BankAccount.create({
            ...data,
            currentBalance: data.openingBalance,
        });
        revalidatePath("/accounts/banking");
        return { success: true, data: JSON.parse(JSON.stringify(newAccount)) };
    } catch (error: any) {
        if (error.code === 11000) {
            return { error: "Account Number already exists" };
        }
        return { error: "Failed to create bank account" };
    }
});

export const getBankAccounts = async () => {
    await connectToDatabase();
    const accounts = await BankAccount.find({}).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(accounts));
};

export const getFinancialSummary = async () => {
    await connectToDatabase();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [accounts, invoices, pettyCash, lastMonthInvoices, lastMonthPetty] = await Promise.all([
        BankAccount.find({ isActive: true }).lean(),
        Invoice.find({ status: 'Paid', issueDate: { $gte: startOfMonth } }).lean(),
        PettyCashTransaction.find({ status: 'Approved', date: { $gte: startOfMonth } }).lean(),
        Invoice.find({ status: 'Paid', issueDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
        PettyCashTransaction.find({ status: 'Approved', date: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).lean(),
    ]);

    const cashOnHand = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
    const totalIncome = invoices.reduce((s, i) => s + (i.amount || 0), 0)
        + pettyCash.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = pettyCash.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    const lastMonthIncome = lastMonthInvoices.reduce((s, i) => s + (i.amount || 0), 0)
        + lastMonthPetty.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0);
    const lastMonthExpenses = lastMonthPetty.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    const lastMonthProfit = lastMonthIncome - lastMonthExpenses;

    const pct = (curr: number, prev: number) =>
        prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

    const recentTx = await PettyCashTransaction.find({})
        .sort({ date: -1 })
        .limit(8)
        .lean();

    return JSON.parse(JSON.stringify({
        cashOnHand,
        totalIncome,
        totalExpenses,
        netProfit,
        incomeChange: pct(totalIncome, lastMonthIncome),
        expenseChange: pct(totalExpenses, lastMonthExpenses),
        profitChange: pct(netProfit, lastMonthProfit),
        recentTransactions: recentTx.map(t => ({
            id: t._id.toString(),
            desc: t.party,
            category: t.category,
            date: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            amount: t.amount,
            type: t.type === 'Income' ? 'income' : 'expense',
        })),
        bankCount: accounts.length,
    }));
};

export const recordBankTransaction = createJSONAction(TransactionSchema, async (data) => {
    await connectToDatabase();

    try {
        const account = await BankAccount.findById(data.accountId);
        if (!account) throw new Error("Account not found");

        let newBalance = account.currentBalance;
        if (data.type === 'Deposit') {
            newBalance += data.amount;
        } else {
            newBalance -= data.amount;
        }

        // Update Balance
        await BankAccount.findByIdAndUpdate(data.accountId, { currentBalance: newBalance });

        revalidatePath(`/accounts/banking/${data.accountId}`);
        revalidatePath("/accounts/banking");

        return { newBalance };
    } catch (error: any) {
        throw new Error(error.message || "Failed to record transaction");
    }
});
