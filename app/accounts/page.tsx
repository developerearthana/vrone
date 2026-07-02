import { Wallet, TrendingUp, TrendingDown, IndianRupee, ArrowUpRight, ArrowDownRight, Landmark } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getFinancialSummary } from '@/app/actions/banking';

function formatINR(amount: number) {
    if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(2)} L`;
    if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
}

function changeSub(pct: number | null, label = 'vs last month') {
    if (pct === null) return 'No prior data';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct}% ${label}`;
}

export default async function AccountsDashboard() {
    const summary = await getFinancialSummary();

    return (
        <div className="space-y-5">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Financial Overview</h1>
                    <p className="page-subtitle">Track cash flow and financial health.</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/accounts/banking">Bank Accounts ({summary.bankCount})</Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href="/accounts/transactions">New Transaction</Link>
                    </Button>
                </div>
            </div>

            <div className="stat-grid">
                <StatCard
                    index={0}
                    label="Total Income"
                    value={formatINR(summary.totalIncome)}
                    sub={changeSub(summary.incomeChange)}
                    icon={TrendingUp}
                    iconColor="text-green-600"
                    trend={summary.incomeChange !== null ? (summary.incomeChange >= 0 ? 'up' : 'down') : undefined}
                />
                <StatCard
                    index={1}
                    label="Total Expenses"
                    value={formatINR(summary.totalExpenses)}
                    sub={changeSub(summary.expenseChange)}
                    icon={TrendingDown}
                    iconColor="text-red-600"
                    trend={summary.expenseChange !== null ? (summary.expenseChange <= 0 ? 'up' : 'down') : undefined}
                />
                <StatCard
                    index={2}
                    label="Net Profit"
                    value={formatINR(summary.netProfit)}
                    sub={changeSub(summary.profitChange)}
                    icon={Wallet}
                    iconColor="text-blue-600"
                    trend={summary.profitChange !== null ? (summary.profitChange >= 0 ? 'up' : 'down') : undefined}
                />
                <StatCard
                    index={3}
                    label="Cash on Hand"
                    value={formatINR(summary.cashOnHand)}
                    sub={`Across ${summary.bankCount} bank account${summary.bankCount !== 1 ? 's' : ''}`}
                    icon={IndianRupee}
                    iconColor="text-primary"
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2 glass-card p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-foreground">Quick Links</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { href: '/accounts/banking', label: 'Bank Accounts', icon: Landmark, desc: 'Manage accounts & balances' },
                            { href: '/accounts/transactions', label: 'Petty Cash', icon: IndianRupee, desc: 'Income & expense entries' },
                            { href: '/accounts/receipts', label: 'Receipts', icon: ArrowUpRight, desc: 'Payment receipts' },
                            { href: '/accounts/reports', label: 'Reports', icon: TrendingUp, desc: 'Financial statements' },
                        ].map(({ href, label, icon: Icon, desc }) => (
                            <Link key={href} href={href}
                                className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-foreground">{label}</p>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-foreground">Recent Transactions</h3>
                        <Button asChild variant="ghost" size="sm" className="text-xs">
                            <Link href="/accounts/transactions">View All</Link>
                        </Button>
                    </div>

                    {summary.recentTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <IndianRupee className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">No transactions yet</p>
                            <Button asChild size="sm" className="mt-3">
                                <Link href="/accounts/transactions">Add first entry</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {summary.recentTransactions.map((tx: any) => (
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
                                        {tx.type === 'income' ? '+' : '-'} {formatINR(tx.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
