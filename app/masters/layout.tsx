"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Building2, Layers, Users, Network, Settings, Briefcase, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
    { name: 'Company', href: '/masters/company', icon: Building2 },
    { name: 'Entities', href: '/masters/subsidiaries', icon: Layers },
    { name: 'Departments', href: '/masters/departments', icon: Briefcase },
    { name: 'Job Titles', href: '/masters/job-titles', icon: FileText },
    { name: 'User Types', href: '/masters/usertypes', icon: Users },
    { name: 'Users', href: '/masters/users', icon: Users },
    { name: 'Teams', href: '/masters/teams', icon: Network },
    { name: 'Templates', href: '/masters/project-templates', icon: Layers },
    { name: 'Work Board', href: '/masters/mood-board', icon: Settings },
];

export default function MastersLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full gap-6">
            <nav className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto no-scrollbar">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'relative flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-all duration-150 -mb-px select-none outline-none',
                                isActive
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-muted-foreground border-b-2 border-transparent hover:text-foreground hover:border-border'
                            )}
                        >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="flex-1 w-full max-w-7xl mx-auto min-h-0">
                {children}
            </div>
        </div>
    );
}
