"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, Users, FileText, ShoppingCart, PieChart, Sparkles } from 'lucide-react';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { SalesCopilot } from '@/components/sales/SalesCopilot';

const links = [
    { name: 'Dashboard', href: '/sales', icon: PieChart, exact: true },
    { name: 'Leads', href: '/sales/leads', icon: Users },
    { name: 'Pipeline', href: '/sales/pipeline', icon: BarChart3 },
    { name: 'Orders', href: '/sales/orders', icon: ShoppingCart },
    { name: 'Invoices', href: '/sales/invoices', icon: FileText },
    { name: 'AI Command Center', href: '/sales/automation', icon: Sparkles },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div className="flex flex-col h-full gap-6">
            <nav className="flex items-center gap-1 border-b border-border pb-0 flex-wrap gap-y-1">
                {links.map(link => {
                    const Icon = link.icon;
                    const isActive = link.exact
                        ? pathname === link.href
                        : pathname === link.href || pathname?.startsWith(link.href + '/');
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 -mb-px",
                                isActive
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
                <PageWrapper>{children}</PageWrapper>
            </div>
            <SalesCopilot />
        </div>
    );
}
