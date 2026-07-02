"use client";

import { useState, use, useEffect } from "react";
import { ArrowLeft, Upload, FileText, ArrowUpRight, ArrowDownLeft, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { recordBankTransaction } from "@/app/actions/banking";
import { toast } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

import { getBankAccounts } from "@/app/actions/banking";

// Fetch from server action (real implementation)
const getAccountDetails = async (id: string) => {
    const accounts = await getBankAccounts();
    // @ts-ignore
    return accounts.find(a => a._id === id);
};

export default function BankAccountDetail({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [account, setAccount] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAccountDetails(resolvedParams.id)
            .then(data => { setAccount(data ?? null); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [resolvedParams.id]);

    if (loading) return <div className="p-8 text-center">Loading Account Details...</div>;
    if (!account) return <div className="p-8 text-center text-red-500">Account not found</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{account.bankName} - {account.accountType}</h1>
                    <p className="text-gray-500 text-sm">A/C: {account.accountNumber} • IFSC: {account.ifscCode || '-'}</p>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Current Balance</p>
                    <p className={`text-3xl font-bold ${account.currentBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        ₹ {account.currentBalance.toLocaleString()}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="grid w-full max-w-lg grid-cols-4 bg-background p-1">
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="deposit">Deposit</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    <TabsTrigger value="reconcile">Reconcile</TabsTrigger>
                </TabsList>

                {/* --- TRANSACTIONS TAB --- */}
                <TabsContent value="transactions" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search transaction history..." className="pl-9 bg-white" />
                        </div>
                        <Button variant="outline" size="sm">
                            <Filter className="w-4 h-4 mr-2" /> Filter
                        </Button>
                        <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-2" /> Download Statement
                        </Button>
                    </div>

                    <div className="glass-card rounded-xl overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[480px]">
                            <thead className="bg-background text-gray-600 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Particulars</th>
                                    <th className="px-6 py-3">Ref No.</th>
                                    <th className="px-6 py-3 text-right text-emerald-600">Credit (₹)</th>
                                    <th className="px-6 py-3 text-right text-red-600">Debit (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                        No recent transactions found for this account.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        </div>
                    </div>
                </TabsContent>

                {/* --- DEPOSIT TAB --- */}
                <TabsContent value="deposit" className="mt-6">
                    <TransactionForm type="Deposit" accountId={account._id} onSuccess={() => {
                        getAccountDetails(account._id).then(setAccount);
                    }} />
                </TabsContent>

                {/* --- WITHDRAW TAB --- */}
                <TabsContent value="withdraw" className="mt-6">
                    <TransactionForm type="Withdrawal" accountId={account._id} onSuccess={() => {
                        getAccountDetails(account._id).then(setAccount);
                    }} />
                </TabsContent>

                {/* --- RECONCILE TAB --- */}
                <TabsContent value="reconcile" className="mt-6">
                    <ReconciliationView accountId={account._id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TransactionForm({ type, accountId, onSuccess }: { type: "Deposit" | "Withdrawal", accountId: string, onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const isDeposit = type === "Deposit";

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            accountId,
            type,
            amount: parseFloat(formData.get("amount") as string),
            date: formData.get("date"),
            description: formData.get("description"),
            reference: formData.get("reference"),
        };

        // @ts-ignore
        const res = await recordBankTransaction(data);
        setLoading(false);

        if (res?.data?.newBalance !== undefined) {
            toast.success(`${type} recorded successfully. New Balance: ₹${res.data.newBalance}`);
            // @ts-ignore
            e.target.reset();
            onSuccess();
        } else {
            toast.error(res?.error || "Failed to record transaction");
        }
    }

    return (
        <div className="max-w-2xl mx-auto glass-card p-8 rounded-xl">
            <div className="text-center mb-8">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDeposit ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {isDeposit ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                </div>
                <h2 className="text-xl font-bold text-gray-900">Record {type}</h2>
                <p className="text-sm text-gray-500">Record money {isDeposit ? 'coming IN to' : 'going OUT from'} this bank account.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <Input name="amount" type="number" step="0.01" min="0" required placeholder="0.00" className="text-lg font-semibold" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Description / Particulars</label>
                    <Input name="description" placeholder={`e.g. ${isDeposit ? 'Cash Deposit' : 'ATM Withdrawal'}`} required />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Reference No. / Cheque No. (Optional)</label>
                    <Input name="reference" placeholder="e.g. CHQ-88291" />
                </div>

                <div className="pt-4">
                    <Button type="submit" className={`w-full ${isDeposit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (isDeposit ? <ArrowDownLeft className="w-4 h-4 mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />)}
                        Confirm {type}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function ReconciliationView({ accountId }: { accountId: string }) {
    const [statementLines, setStatementLines] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // Simulate CSV Parsing
        setTimeout(() => {
            const mockLines = [
                { id: "sl_1", date: "2024-03-20", description: "NEFT-IN: CLIENT PAY", amount: 25000, type: "Credit", status: "Unmatched" },
                { id: "sl_2", date: "2024-03-22", description: "ATM WDL", amount: 5000, type: "Debit", status: "Unmatched" },
                { id: "sl_3", date: "2024-03-25", description: "UPI-OUT: VENDOR X", amount: 1250, type: "Debit", status: "Matched" },
            ];
            setStatementLines(mockLines);
            setIsUploading(false);
            toast.success("Statement Uploaded & Parsed");
        }, 1500);
    };

    return (
        <div className="space-y-6">
            {statementLines.length === 0 ? (
                <div className="glass-card p-12 rounded-xl text-center space-y-4 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="w-16 h-16 bg-white text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Upload Bank Statement</h2>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2">
                            Upload your bank statement (CSV) to automatically match transactions.
                        </p>
                    </div>
                    <div className="pt-4">
                        <label className="cursor-pointer bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm inline-flex items-center gap-2">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            {isUploading ? "Parsing..." : "Select CSV File"}
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                    </div>
                </div>
            ) : (
                <div className="glass-card rounded-xl overflow-hidden border border-gray-100">
                    <div className="p-4 bg-background border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Reconciliation Queue ({statementLines.length} items)</h3>
                        <Button variant="outline" size="sm" onClick={() => setStatementLines([])} className="text-red-500 hover:text-red-600">Clear Data</Button>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {statementLines.map((line) => (
                                <tr key={line.id} className="hover:bg-background/50">
                                    <td className="px-6 py-3 text-gray-900">{format(new Date(line.date), "dd-MM-yyyy")}</td>
                                    <td className="px-6 py-3 text-gray-600">{line.description}</td>
                                    <td className={`px-6 py-3 text-right font-medium ${line.type === 'Credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {line.type === 'Credit' ? '+' : '-'} ₹{line.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${line.status === 'Matched' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {line.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {line.status === 'Unmatched' ? (
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-white">
                                                Match / Create
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-gray-400">Reconciled</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
