"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { PettyCashTable } from "@/components/accounts/PettyCashTable";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Transaction {
    _id: string;
    date: string;
    subsidiary: string;
    location: string;
    type: string;
    party: string;
    category: string;
    reference: string;
    amount: number;
    remarks: string;
    paymentMode: string;
    status: string;
}

const SAMPLE_TRANSACTIONS: Transaction[] = [
    { _id: "101", date: "2024-01-05", subsidiary: "Earthana India", location: "Head Office - Mumbai", type: "Expense", party: "Dell India", category: "Assets", reference: "INV-9988", amount: 45000, remarks: "New Laptops", paymentMode: "Bank", status: "Approved" },
    { _id: "102", date: "2024-01-06", subsidiary: "Earthana Global", location: "Remote", type: "Expense", party: "Zoom Video", category: "Software", reference: "SUB-22", amount: 1200, remarks: "Monthly Subscription", paymentMode: "Credit Card", status: "Pending" },
    { _id: "103", date: "2024-01-07", subsidiary: "Earthana LLC", location: "Branch - Delhi", type: "Income", party: "Client X", category: "Services", reference: "INV-005", amount: 150000, remarks: "Consulting Fees", paymentMode: "NEFT", status: "Approved" },
];

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/accounting/petty-cash");
            const data = await res.json();

            if (!res.ok || data.error) {
                const errorMessage = data.error || "Failed to fetch transactions";
                console.warn("API Error:", errorMessage);
                setError(errorMessage);
                setTransactions(SAMPLE_TRANSACTIONS);
                return;
            }

            if (!Array.isArray(data)) {
                console.warn("Unexpected API response format:", data);
                setError("Invalid data format received from server");
                setTransactions(SAMPLE_TRANSACTIONS);
                return;
            }

            setTransactions(data);
        } catch (error) {
            console.error("Network error:", error);
            setError("Connection failed. Showing sample data.");
            setTransactions(SAMPLE_TRANSACTIONS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-xs text-gray-500">Unified view of all financial transactions.</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </Button>
                    <Link href="/accounts/transactions/new">
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Record
                        </Button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="font-medium">System Notice</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Transactions List */}
            <div className="rounded-xl overflow-hidden shadow-sm border">
                <PettyCashTable transactions={transactions} loading={loading} onUpdate={fetchTransactions} />
            </div>
        </div>
    );
}
