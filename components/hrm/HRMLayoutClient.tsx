"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Users, UserCheck, Banknote,
    CalendarDays, Briefcase, ClipboardList, Shield, CalendarRange,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

const ALL_HRM_LINKS = [
    { name: 'Dashboard', href: '/hrm', icon: LayoutDashboard, adminOnly: true, staffOnly: false },
    { name: 'Employees', href: '/hrm/employees', icon: Users, adminOnly: true, staffOnly: false },
    { name: 'Attendance', href: '/hrm/attendance', icon: UserCheck, adminOnly: false, staffOnly: true },
    { name: 'Attendance Report', href: '/hrm/attendance-report', icon: ClipboardList, adminOnly: true, staffOnly: false },
    { name: 'Payroll', href: '/hrm/payroll', icon: Banknote, adminOnly: true, staffOnly: false },
    { name: 'Requests', href: '/hrm/leave', icon: CalendarDays, adminOnly: false, staffOnly: false },
    { name: 'Staff Access', href: '/hrm/staff-access', icon: Shield, adminOnly: true, staffOnly: false },
    { name: 'Documents', href: '/hrm/documents', icon: Briefcase, adminOnly: true, staffOnly: false },
    { name: 'Interview', href: '/hrm/interview', icon: Users, adminOnly: true, staffOnly: false },
];

const STAFF_ALLOWED = ['/hrm/attendance', '/hrm/leave'];

function isAdminRole(role: string) {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'admin' || r === 'super-admin' || r === 'manager' || r === 'hr';
}

export default function HRMLayoutClient({ children, role: initialRole }: { children: React.ReactNode, role: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    
    // Combine Server Prop with Client Session to ensure it updates during soft nav
    const currentRole = session?.user?.role || initialRole;
    
    const confirmedAdmin = isAdminRole(currentRole);
    const confirmedStaff = currentRole ? !isAdminRole(currentRole) : false;

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // ── Staff redirect guard ──────────────────
    useEffect(() => {
        if (!currentRole) return;
        if (isAdminRole(currentRole)) return;

        const allowed = STAFF_ALLOWED.some(
            p => pathname === p || pathname.startsWith(p + '/')
        );
        if (!allowed) {
            router.replace('/hrm/attendance');
        }
    }, [pathname, currentRole, router]);

    const visibleLinks = ALL_HRM_LINKS.filter(link => {
        if (link.staffOnly && confirmedAdmin) return false;
        return !link.adminOnly || confirmedAdmin;
    });

    // If no role yet
    if (!currentRole && !mounted) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-4">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-muted-foreground">Synchronizing Workspace...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-6">
            <nav
                className={cn(
                    "flex items-center gap-1 border-b border-border pb-0 overflow-x-auto no-scrollbar transition-opacity duration-300",
                    mounted ? "opacity-100" : "opacity-0"
                )}
            >
                {visibleLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                        pathname === link.href ||
                        (link.href !== '/hrm' && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.name}
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
                <div
                    className={cn(
                        "h-full transition-opacity duration-300",
                        (confirmedStaff && !STAFF_ALLOWED.some(p => pathname === p || pathname.startsWith(p + '/'))) || (!currentRole && mounted)
                            ? "opacity-0 pointer-events-none select-none"
                            : "opacity-100"
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
