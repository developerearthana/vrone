"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ShieldCheck, Briefcase, User, Store, Users, ChevronDown, Activity } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDashboardUsers } from '@/app/actions/user';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
    { name: 'Admin', href: '/dashboards/super-admin', icon: ShieldCheck, roleGroup: 'admins' },
    { name: 'Manager', href: '/dashboards/manager', icon: Briefcase, roleGroup: 'managers' },
    { name: 'Staff', href: '/dashboards/employee', icon: User, roleGroup: 'staff' },
    { name: 'Client', href: '/dashboards/customer', icon: Users, roleGroup: 'clients' },
    { name: 'Vendor', href: '/dashboards/vendor', icon: Store, roleGroup: 'vendors' },
];

export default function DashboardNav({ userRole }: { userRole?: string }) {
    const pathname = usePathname();
    const [users, setUsers] = useState<any>({
        admins: [],
        managers: [],
        staff: [],
        vendors: [],
        clients: []
    });

    useEffect(() => {
        if (userRole !== 'super-admin') return;
        const loadUsers = async () => {
            const data = await getDashboardUsers();
            setUsers(data);
        };
        loadUsers();
    }, [userRole]);

    // If not super-admin, do not render anything
    if (userRole !== 'super-admin') {
        return null;
    }

    return (
        <div className="w-full bg-card border-b border-border py-2 z-30 relative">
            <div className="flex items-center gap-x-6 gap-y-1 px-6 min-h-[50px] flex-wrap">
                {navItems.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                    const groupUsers = link.roleGroup ? users[link.roleGroup] : [];

                    if (!link.roleGroup) {
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-all px-4 py-2.5 rounded-lg whitespace-nowrap",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {link.name}
                            </Link>
                        )
                    }

                    return (
                        <DropdownMenu key={link.name}>
                            <DropdownMenuTrigger
                                id={`nav-trigger-${link.name.toLowerCase()}`}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-all px-4 py-2.5 rounded-lg whitespace-nowrap focus:outline-none",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                )}>
                                <Icon className="w-4 h-4" />
                                {link.name}
                                <ChevronDown className="w-3 h-3 opacity-70 ml-1" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" sideOffset={8} className="w-[220px] bg-popover border border-border shadow-xl z-50">
                                <DropdownMenuItem asChild>
                                    <Link href={link.href} className="cursor-pointer font-semibold flex items-center">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        <span>{link.name} Overview</span>
                                    </Link>
                                </DropdownMenuItem>

                                {groupUsers.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">Individual Boards</DropdownMenuLabel>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {groupUsers.map((u: any) => (
                                                <DropdownMenuItem key={u.id} asChild>
                                                    <Link href={`${link.href}?userId=${u.id}`} className="cursor-pointer flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={u.image} />
                                                            <AvatarFallback className="text-[10px]">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="truncate">{u.name}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                })}
            </div>
        </div>
    );
}

// Add CSS to hide scrollbar but keep functionality
const styles = `
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
`;
