"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Layers, Users, Network, Settings, Briefcase, Tag, Briefcase as TitleIcon } from 'lucide-react';

export default function MastersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const navItems = [
        { name: 'Company', href: '/masters/company', icon: Building2 },
        { name: 'Entities', href: '/masters/subsidiaries', icon: Layers },
        { name: 'Depts', href: '/masters/departments', icon: Briefcase },
        { name: 'Job Titles', href: '/masters/job-titles', icon: TitleIcon },
        { name: 'User Types', href: '/masters/usertypes', icon: Users },
        { name: 'Users', href: '/masters/users', icon: Users },
        { name: 'Teams', href: '/masters/teams', icon: Network },
        { name: 'Vendors', href: '/masters/vendors', icon: Tag },
        { name: 'Templates', href: '/masters/project-templates', icon: Layers },
        { name: 'Work Board', href: '/masters/mood-board', icon: Settings },
    ];

    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-screen bg-background/50 gap-2 p-2 pt-1">
            {/* Top Navigation Bar */}
            <div className="w-full glass-card rounded-xl p-2 flex flex-col items-start gap-2 sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 w-full">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap border
                                    ${isActive
                                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                                        : 'bg-background text-muted-foreground border-border hover:bg-primary/5 hover:text-primary'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>


            </div>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}
