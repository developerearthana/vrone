"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ShieldCheck, Activity, Users, Settings, CalendarRange } from 'lucide-react';

const adminLinks = [
    { name: 'Overview', href: '/dashboards/super-admin', icon: ShieldCheck },
    { name: 'Company Calendar', href: '/dashboards/super-admin/calendar', icon: CalendarRange },
    { name: 'System Health', href: '/dashboards/super-admin/health', icon: Activity },
    { name: 'User Types', href: '/masters/usertypes', icon: Users },
    { name: 'Settings', href: '/dashboards/super-admin/settings', icon: Settings },
];

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full gap-0 -mt-6">
            <div className="flex items-center gap-x-6 gap-y-2 border-b pb-4 flex-wrap">
                {adminLinks.map((link) => {
                    const Icon = link.icon;
                    // Strict match for exactly '/dashboards/super-admin', simplistic for others
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {link.name}
                        </Link>
                    );
                })}
            </div>
            <div className="flex-1 h-full min-h-0 overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
