"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

const projectsLinks = [
    { name: 'Dashboard', href: '/projects', icon: LayoutDashboard },
];

export default function ProjectsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center gap-1 border-b border-gray-100 pb-0 overflow-x-auto">
                {projectsLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 outline-none select-none rounded-t-lg",
                                isActive
                                    ? "text-primary bg-white/50"
                                    : "text-muted-foreground hover:text-gray-900 hover:bg-background/50"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                            {link.name}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabProject"
                                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
            <div className="flex-1 h-full min-h-0 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    );
}
