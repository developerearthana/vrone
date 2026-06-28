"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Calendar,
    Users,
    DollarSign,
    Megaphone,
    BookOpen,
    ShoppingCart,
    Package,
    UserPlus,
    Settings,
    BarChart3,
    Briefcase,
    ClipboardList,
    Monitor,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    CalendarDays
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"
import { useEffect, useRef, useCallback } from "react"

const textStyle = "text-sm font-medium tracking-wide";

export const navItems = [
    { name: "Master Dashboard", href: "/", icon: LayoutDashboard, permission: 'dashboard' },
    { name: "Activity", href: "/activity", icon: Calendar, permission: 'activity' },
    { name: "Goals", href: "/goals", icon: BarChart3, permission: 'goals' },
    { name: "Contacts", href: "/contacts", icon: Users, permission: 'contacts' },
    { name: "Sales", href: "/sales", icon: DollarSign, permission: 'sales' },
    { name: "Marketing", href: "/marketing", icon: Megaphone, permission: 'marketing' },
    { name: "Projects", href: "/projects", icon: Briefcase, permission: 'projects' },
    { name: "Work Orders", href: "/work-orders", icon: ClipboardList, permission: 'work-orders' },
    { name: "Accounting", href: "/accounts", icon: BookOpen, permission: 'accounting' },
    { name: "Purchase", href: "/purchase", icon: ShoppingCart, permission: 'purchase' },
    { name: "Inventory", href: "/inventory", icon: Package, permission: 'inventory' },
    { name: "HRM Admin", href: "/hrm", icon: UserPlus, permission: 'hrm' },
    { name: "Attendance", href: "/hrm/attendance", icon: UserCheck, permission: 'basic-hrm' },
    { name: "Leave", href: "/hrm/leave", icon: CalendarDays, permission: 'basic-hrm' },
    { name: "Assets", href: "/assets", icon: Monitor, permission: 'assets' },
    { name: "Masters", href: "/masters", icon: Settings, permission: 'masters' },
    { name: "Admin", href: "/admin", icon: ShieldCheck, permission: 'admin' },
]

export function Sidebar({
    userRole,
    userPermissions = [],
    isCollapsed = false,
    toggleCollapse,
    company,
    user,
}: {
    userRole?: string | null,
    userPermissions?: string[],
    isCollapsed?: boolean,
    toggleCollapse?: () => void,
    company?: any,
    user?: any,
}) {
    const pathname = usePathname()
    const desktopScrollRef = useRef<HTMLDivElement>(null)
    const desktopScrollPos = useRef(0)

    const saveDesktopScroll = useCallback(() => {
        if (desktopScrollRef.current) desktopScrollPos.current = desktopScrollRef.current.scrollTop
    }, [])

    // Restore scroll position after route change
    useEffect(() => {
        if (desktopScrollRef.current) desktopScrollRef.current.scrollTop = desktopScrollPos.current
    }, [pathname])

    const filteredNavItems = navItems.filter(item => {
        if (item.permission === 'basic-hrm') return true;
        if (userRole === 'super-admin' || userRole === 'admin') return true;
        if (userPermissions?.includes('*') || userPermissions?.includes('all')) return true;
        if (userPermissions?.includes(item.permission)) return true;
        return false;
    });

    const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
        <>
            {/* Brand */}
            <div className={cn(
                "sidebar-brand-divider flex border-b transition-all duration-300",
                collapsed
                    ? "items-center justify-center px-4 py-6"
                    : "flex-col items-start px-6 py-4"
            )}>
                <div className={cn(
                    "flex shrink-0 items-center justify-center transition-all duration-300 overflow-visible",
                    collapsed ? "h-10 w-10" : "h-12 w-full max-w-[220px]"
                )}>
                    {company?.fullLogo && !collapsed ? (
                        <img src={company.fullLogo} alt="Company Logo" className="w-full h-full object-contain" />
                    ) : company?.iconLogo ? (
                        <img src={company.iconLogo} alt="Company Logo" className="w-full h-full object-contain" />
                    ) : (
                        <Logo
                            variant={collapsed ? "icon" : "full"}
                            className={cn("transition-all duration-300", collapsed ? "h-10 w-10" : "h-12 w-full")}
                        />
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div
                ref={collapsed ? undefined : desktopScrollRef}
                onScroll={collapsed ? undefined : saveDesktopScroll}
                className="flex-1 overflow-y-auto py-4 px-3 dark-scrollbar overflow-x-hidden"
            >
                <nav className="grid gap-1.5">
                    {filteredNavItems.map((item, index) => {
                        const isSuperAdmin = userRole === 'super-admin' || userRole === 'admin';

                        let itemHref = item.href;
                        let displayName = item.name;

                        if (item.href === '/') {
                            itemHref = isSuperAdmin ? '/dashboards/super-admin' : '/dashboards/employee';
                            if (!isSuperAdmin) displayName = 'Dashboard';
                        }

                        const isActive = pathname === itemHref || (itemHref !== '/' && pathname?.startsWith(itemHref));

                        return (
                            <Link
                                key={index}
                                href={itemHref}
                                title={collapsed ? displayName : ""}
                                className={cn(
                                    "sidebar-nav-link group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-in-out relative",
                                    isActive && "sidebar-nav-link-active font-semibold",
                                    collapsed && "justify-center px-1"
                                )}
                            >
                                <item.icon className="h-5 w-5 transition-transform group-hover:scale-110 shrink-0" />

                                {!collapsed && (
                                    <span className={cn(textStyle, "overflow-hidden whitespace-nowrap")}>
                                        {displayName}
                                    </span>
                                )}

                                {isActive && !collapsed && (
                                    <div className="sidebar-active-pulse ml-auto h-2 w-2 rounded-full animate-pulse" />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </>
    )

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-50 hidden md:flex flex-col transition-all duration-300 ease-in-out",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            <div className="app-sidebar app-sidebar-desktop h-full flex flex-col relative overflow-hidden transition-all duration-300">
                {/* Collapse toggle */}
                <button
                    onClick={toggleCollapse}
                    className="sidebar-collapse-btn absolute -right-3 top-8 z-50 p-1 border rounded-full shadow-md hidden md:flex transition-colors"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <NavContent collapsed={isCollapsed} />
            </div>
        </aside>
    )
}
