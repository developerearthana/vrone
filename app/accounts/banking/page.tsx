"use client";

import { Plus, Building, CreditCard, ArrowRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from "react";
import { getBankAccounts, createBankAccount } from "@/app/actions/banking";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import Link from 'next/link';

export default function BankingPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newAccount, setNewAccount] = useState({});

    async function fetchAccounts() {
        setLoading(true);
        try {
            const data = await getBankAccounts();
            setAccounts(data || []);
        } catch { toast.error('Failed to load accounts'); }
        finally { setLoading(false); }
    }

    useEffect(() => {
        fetchAccounts();
    }, []);


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
                    <p className="text-gray-500">Manage your connected bank accounts and cards.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 bg-white text-white px-4 py-2 rounded-lg hover:bg-white transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    Add Account
                </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 glass-card rounded-xl animate-pulse bg-white/50"></div>
                    ))
                ) : accounts.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-400 italic bg-background/50 rounded-xl border border-dashed border-gray-200">
                        No bank accounts linked yet. Click 'Add Account' to get started.
                    </div>
                ) : (
                    accounts.map((acc) => (
                        <Link href={`/accounts/banking/${acc._id}`} key={acc._id}>
                            <div className="glass-card p-6 rounded-xl hover:shadow-lg transition-all group relative overflow-hidden cursor-pointer hover:-translate-y-1 h-full">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${acc.accountType === 'Current' ? 'bg-blue-600' : (acc.accountType === 'Savings' ? 'bg-emerald-500' : 'bg-white0')}`}></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-background rounded-xl group-hover:bg-white transition-colors">
                                        <Building className="w-6 h-6 text-gray-700 group-hover:text-blue-600" />
                                    </div>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                        Active
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 truncate">{acc.bankName}</h3>
                                <p className="text-sm text-gray-500 mb-4">{acc.accountType} • {acc.accountNumber.slice(-4)}</p>

                                <div className="pt-4 border-t border-gray-100 mt-auto">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Available Balance</p>
                                    <div className="flex items-end justify-between">
                                        <span className={`text-2xl font-bold ${acc.currentBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            ₹ {acc.currentBalance.toLocaleString()}
                                        </span>
                                        <div className="text-blue-600 p-1 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}

                {/* Add New Placeholder Card */}
                <button onClick={() => setIsDialogOpen(true)} className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:bg-white/50 hover:text-blue-600 transition-all group min-h-[200px]">
                    <div className="p-4 rounded-full bg-background group-hover:bg-blue-100 transition-colors mb-3">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Connect New Bank</span>
                    <p className="text-xs mt-1 text-center">Link your bank account for auto-sync</p>
                </button>
            </div>

            <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Cards & Corporate Expense</h2>
                <div className="glass-card p-6 rounded-xl border border-gray-200/50 flex flex-col items-center justify-center py-12 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
                    <h3 className="font-medium text-gray-900">No cards linked yet</h3>
                    <p className="text-gray-500 text-sm max-w-sm mt-1">Issue corporate cards to employees and track expenses in real-time.</p>
                    <button className="mt-4 text-sm font-medium text-blue-600 hover:underline">Apply for Corporate Card</button>
                </div>
            </div>
            {/* Add Account Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Bank Account</DialogTitle>
                    </DialogHeader>
                    <AddAccountForm onSuccess={() => {
                        setIsDialogOpen(false);
                        fetchAccounts();
                        toast.success("Bank Account Added Successfully");
                    }} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AddAccountForm({ onSuccess }: { onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            bankName: formData.get("bankName"),
            accountName: formData.get("accountName"),
            accountNumber: formData.get("accountNumber"),
            accountType: formData.get("accountType"),
            branch: formData.get("branch"),
            ifscCode: formData.get("ifscCode"),
            openingBalance: formData.get("openingBalance"),
        };

        // @ts-ignore
        const res = await createBankAccount(data);
        setLoading(false);

        if (res?.data) {
            onSuccess();
        } else {
            toast.error(res?.error || "Failed to add account");
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Bank Name</label>
                    <Input name="bankName" placeholder="e.g. HDFC Bank" required />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Account Label</label>
                    <Input name="accountName" placeholder="e.g. Main Ops Account" required />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Account Number</label>
                <Input name="accountNumber" placeholder="Full Account Number" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select aria-label="Account Type" name="accountType" className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                        <option value="Current">Current</option>
                        <option value="Savings">Savings</option>
                        <option value="Overdraft">Overdraft</option>
                        <option value="Credit Card">Credit Card</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Opening Balance</label>
                    <Input name="openingBalance" type="number" step="0.01" defaultValue="0" required />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Branch</label>
                    <Input name="branch" placeholder="Branch Name" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">IFSC Code</label>
                    <Input name="ifscCode" placeholder="IFSC" />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Account
                </Button>
            </div>
        </form>
    )
}
