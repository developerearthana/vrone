"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, CheckSquare, MessageSquare, FileText } from 'lucide-react';
import { useSession } from 'next-auth/react';

const allLinks = [
    { name: 'Dashboard', href: '/activity', icon: LayoutDashboard, exact: true, adminOnly: false },
    { name: 'Calendar', href: '/activity/calendar', icon: Calendar, exact: false, adminOnly: false },
    { name: 'Team Tasks', href: '/activity/todo', icon: CheckSquare, exact: false, adminOnly: false },
    { name: 'Chat', href: '/activity/chat', icon: MessageSquare, exact: false, adminOnly: false },
    { name: 'Documents', href: '/activity/documents', icon: FileText, exact: false, adminOnly: false },
];

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = session?.user?.role?.toLowerCase() || '';
    const isAdmin = role === 'admin' || role === 'super-admin' || role === 'hr' || role === 'manager';
    const links = allLinks.filter(l => !l.adminOnly || isAdmin);

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
