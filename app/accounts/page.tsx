"use client";

import { Wallet, TrendingUp, TrendingDown, IndianRupee, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';

export default function AccountsDashboard() {
    const recentTransactions = [
        { id: 1, desc: "Payment from TechFlow", category: "Sales", date: "Today, 10:30 AM", amount: "+ ₹1,20,000", type: "income" },
        { id: 2, desc: "Office Rent - March", category: "Operations", date: "Yesterday, 4:00 PM", amount: "- ₹45,000", type: "expense" },
        { id: 3, desc: "Vendor Payment - Apex", category: "Purchase", date: "23 Mar, 11:20 AM", amount: "- ₹85,000", type: "expense" },
        { id: 4, desc: "Service Revenue", category: "Services", date: "22 Mar, 2:15 PM", amount: "+ ₹25,000", type: "income" },
    ];

    return (
        <div className="space-y-5">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Financial Overview</h1>
                    <p className="page-subtitle">Track cash flow and financial health.</p>
                </div>
            </div>

            <div className="stat-grid">
                <StatCard label="Total Income" value="₹24.5 Lakhs" sub="+12.5% vs last month" icon={TrendingUp} iconColor="text-green-600" trend="up" />
                <StatCard label="Total Expenses" value="₹12.8 Lakhs" sub="+5% vs last month" icon={TrendingDown} iconColor="text-red-600" trend="down" />
                <StatCard label="Net Profit" value="₹11.7 Lakhs" sub="+18% vs last month" icon={Wallet} iconColor="text-blue-600" trend="up" />
                <StatCard label="Cash on Hand" value="₹5.2 Lakhs" sub="Current balance" icon={IndianRupee} iconColor="text-primary" />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2 glass-card p-5 rounded-xl">
                    <h3 className="text-base font-semibold text-foreground mb-4">Cash Flow</h3>
                    <div className="h-56 bg-muted/30 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                        Cash Flow Chart
                    </div>
                </div>

                <div className="glass-card p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-foreground">Recent Transactions</h3>
                        <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                    </div>
                    <div className="space-y-1">
                        {recentTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-1.5 rounded-lg ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {tx.type === 'income'
                                            ? <ArrowUpRight className="w-3.5 h-3.5" />
                                            : <ArrowDownRight className="w-3.5 h-3.5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm leading-snug">{tx.desc}</p>
                                        <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                                    </div>
                                </div>
                                <span className={`font-semibold text-sm tabular-nums ${tx.type === 'income' ? 'text-green-600' : 'text-foreground'}`}>
                                    {tx.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
