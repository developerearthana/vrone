"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ShoppingCart, Truck, ClipboardList, Receipt } from 'lucide-react';

const links = [
    { name: 'Dashboard', href: '/purchase', icon: LayoutDashboard, exact: true },
    { name: 'Orders', href: '/purchase/orders', icon: ShoppingCart },
    { name: 'Vendors / RFQ', href: '/purchase/vendors', icon: ClipboardList },
    { name: 'GRN (Goods Rec)', href: '/purchase/grn', icon: Truck },
    { name: 'Reports', href: '/purchase/reports', icon: Receipt },
];

export default function PurchaseLayout({ children }: { children: React.ReactNode }) {
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
            <div className="flex-1 h-full min-h-0 overflow-y-auto">{children}</div>
        </div>
    );
}
