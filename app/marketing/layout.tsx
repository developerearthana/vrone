"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Megaphone, Share2, Image as ImageIcon, MessageCircle, Bot } from 'lucide-react';

const links = [
    { name: 'Dashboard', href: '/marketing', icon: LayoutDashboard, exact: true },
    { name: 'Campaigns', href: '/marketing/campaigns', icon: Megaphone },
    { name: 'Social', href: '/marketing/social', icon: Share2 },
    { name: 'WhatsApp', href: '/marketing/whatsapp', icon: MessageCircle },
    { name: 'AI Content', href: '/marketing/ai-content', icon: Bot },
    { name: 'Assets', href: '/marketing/assets', icon: ImageIcon },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div className="flex flex-col h-full gap-6">
            <nav className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto no-scrollbar">
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
