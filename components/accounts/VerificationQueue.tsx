"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, FileText, DollarSign, User, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardWrapper } from '@/components/ui/page-wrapper';

interface ExpenseClaim {
    id: number;
    employee: string;
    amount: number;
    category: string;
    date: string;
    description: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    receiptUrl?: string;
    autoVerified: boolean;
}

const MOCK_CLAIMS: ExpenseClaim[] = [
    { id: 1, employee: "Amit Patel", amount: 2500, category: "Transport", date: "2026-01-08", description: "Fuel for site visit", riskLevel: 'Low', autoVerified: true },
    { id: 2, employee: "Neha Gupta", amount: 12000, category: "Meals", date: "2026-01-07", description: "Team dinner at Taj", riskLevel: 'High', autoVerified: false },
    { id: 3, employee: "Rajesh S.", amount: 450, category: "Supplies", date: "2026-01-08", description: "Stationery for office", riskLevel: 'Low', autoVerified: true },
    { id: 4, employee: "Rahul T.", amount: 3200, category: "Transport", date: "2026-01-06", description: "Uber to Airport", riskLevel: 'Medium', autoVerified: false },
];

export function VerificationQueue() {
    const [claims, setClaims] = useState<ExpenseClaim[]>(MOCK_CLAIMS);
    const [history, setHistory] = useState<number[]>([]);

    const handleAction = (id: number, action: 'approve' | 'reject') => {
        setHistory([...history, id]);
        // Animate out then remove
        setTimeout(() => {
            setClaims(claims.filter(c => c.id !== id));
        }, 300);
    };

    if (claims.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[400px]">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">All Caught Up!</h3>
                <p className="text-gray-500">No pending verification requests.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Pending Approvals ({claims.length})</h3>
                <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded">
                    {claims.filter(c => c.riskLevel === 'High').length} High Risk
                </span>
            </div>

            <AnimatePresence mode='popLayout'>
                {claims.map((claim) => (
                    <motion.div
                        key={claim.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={cn(
                            "group bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden",
                            claim.riskLevel === 'High' ? "border-amber-200" : "border-gray-100"
                        )}
                    >
                        {claim.riskLevel === 'High' && (
                            <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1 z-10">
                                <AlertTriangle className="w-3 h-3" /> High Value Alert
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                                    {claim.employee.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                        {claim.employee}
                                        {claim.autoVerified && (
                                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title="Matches Receipt Scan">
                                                <Check className="w-2 h-2" /> Auto-Verified
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                        <Clock className="w-3 h-3" /> {claim.date} • {claim.category}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 px-4 border-l border-gray-100 ml-4 md:ml-0 md:border-none">
                                <p className="text-sm text-gray-700 font-medium line-clamp-1">"{claim.description}"</p>
                                <button className="text-xs text-blue-600 font-bold hover:underline mt-1 flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> View Receipt
                                </button>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right mr-4">
                                    <span className="block text-xs text-gray-400 font-bold uppercase">Amount</span>
                                    <span className="text-xl font-bold text-gray-900">₹{claim.amount.toLocaleString()}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAction(claim.id, 'reject')}
                                        className="p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-colors"
                                        title="Reject"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleAction(claim.id, 'approve')}
                                        className="py-2 px-4 rounded-lg bg-primary text-primary-foreground font-bold hover:brightness-[1.08] transition-colors shadow-lg flex items-center gap-2"
                                        title="Approve"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
