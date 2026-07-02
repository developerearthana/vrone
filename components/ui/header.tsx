"use client"

import {
    Bell, Search, User, Menu,
    KeyRound, LogOut
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { navItems } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { VThemeToggle } from "@/components/ui/vtheme-toggle";
import { Logo } from "@/components/ui/logo";
import { uploadFile } from "@/app/actions/upload";
import { updateProfile } from "@/app/actions/user-profile";
import { toast } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";
import { getRoleDashboardHref } from "@/lib/dashboard-route";

const breadcrumbNameMap: { [key: string]: string } = {
    masters: "Masters",
    company: "Company Profile",
    subsidiaries: "Subsidiaries",
    departments: "Departments",
    teams: "Teams",
    users: "User Types",
    activity: "Activity",
    documents: "Documents",
    calendar: "Calendar",
    chat: "Chat",
    todo: "Todo List",
    contacts: "Contacts",
    clients: "Clients",
    vendors: "Vendors",
    leads: "Leads",
    sales: "Sales",
    pipeline: "Pipeline",
    orders: "Orders",
    invoices: "Invoices",
    marketing: "Marketing",
    campaigns: "Campaigns",
    social: "Social Media",
    assets: "Assets",
    goals: "Goals & Performance",
    plan: "Quarterly Planner",
    review: "Review Meetings",
    kpi: "Weekly KPI",
    "kpi-assignments": "KPI Assignments",
};

export function Header({ user }: { user?: any }) {
    const pathname = usePathname();
    const pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { data: session, update } = useSession();
    const currentUser = user || session?.user;
    const userRole = currentUser?.role;
    const userPermissions = currentUser?.permissions as string[] | undefined;
    const displayName = currentUser
        ? (currentUser.initial ? `${currentUser.name}.${currentUser.initial}` : currentUser.name)
        : 'Guest User';
    const avatarInitials = currentUser
        ? (currentUser.initial
            ? `${currentUser.name?.charAt(0) ?? ''}${currentUser.initial}`
            : currentUser.name?.charAt(0) ?? '?')
        : '?';
    const router = useRouter();

    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);
        try {
            const uploadRes = await uploadFile(formData);
            if (uploadRes.error || !uploadRes.url) {
                toast.error(uploadRes.error || "Upload failed");
                return;
            }
            const updateRes = await updateProfile({ image: uploadRes.url });
            if (updateRes.error) {
                toast.error(updateRes.error);
            } else {
                toast.success("Profile picture updated");
                await update({ image: uploadRes.url });
                router.refresh();
            }
        } catch {
            toast.error("Something went wrong");
        }
    };

    const handleLogout = async () => {
        setIsProfileOpen(false);
        await signOut({ callbackUrl: "/login" });
    };

    return (
        <header className="sticky top-0 z-40 bg-card border-b border-border h-14 flex items-center justify-between px-4 md:px-6">

            {/* Left: Mobile nav + Breadcrumbs */}
            <div className="flex items-center gap-3">
                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            aria-label="Toggle Mobile Menu"
                            suppressHydrationWarning
                            className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-56 p-0">
                        <SheetHeader className="p-5 border-b border-border">
                            <SheetTitle className="flex items-center gap-3 text-base font-bold">
                                <Logo variant="icon" className="h-8 w-8" />
                                Vrone ERP
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto py-3">
                            <nav className="grid gap-1 px-2">
                                {navItems.filter(item => {
                                    if (item.permission === 'basic-hrm') return true;
                                    if (userRole === 'super-admin' || userRole === 'admin') return true;
                                    if (userPermissions?.includes('*') || userPermissions?.includes('all')) return true;
                                    if (userPermissions?.includes(item.permission)) return true;
                                    return false;
                                }).map((item, index) => {
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                                    return (
                                        <Link
                                            key={index}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            <span>{item.name}</span>
                                        </Link>
                                    )
                                })}
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-hidden whitespace-nowrap">
                    {pathSegments.length === 0 && (
                        <span className="text-foreground font-semibold">Dashboard</span>
                    )}
                    {pathSegments.map((segment, index) => {
                        // "/dashboards" itself has no page — route it to the
                        // logged-in user's own dashboard instead of 404ing.
                        const href = segment === 'dashboards'
                            ? getRoleDashboardHref(userRole)
                            : `/${pathSegments.slice(0, index + 1).join('/')}`;
                        const isId = /^[0-9a-fA-F]{24}$/.test(segment);
                        const name = isId
                            ? "Details"
                            : (breadcrumbNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1));
                        const isLast = index === pathSegments.length - 1;

                        return (
                            <div key={href} className="flex items-center gap-1.5">
                                {index > 0 && <span className="text-muted-foreground/40 select-none">/</span>}
                                {isLast ? (
                                    <span className="text-foreground font-semibold">{name}</span>
                                ) : (
                                    <Link href={href} className="hover:text-primary transition-colors hidden sm:block">
                                        {name}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden md:block group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                    <input
                        type="search"
                        aria-label="Universal Search"
                        placeholder="Search... (Ctrl+K)"
                        readOnly
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                        className="h-9 w-48 lg:w-60 rounded-lg border border-border bg-muted/50 px-9 text-sm text-foreground transition-all focus:bg-card focus:ring-2 focus:ring-primary/20 focus:w-60 lg:focus:w-72 outline-none placeholder:text-muted-foreground/60 cursor-pointer"
                    />
                </div>

                {/* Notifications */}
                <button
                    aria-label="Notifications"
                    className="relative rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
                </button>

                <VThemeToggle />
                <ModeToggle />

                <div className="h-7 w-px bg-border mx-1" />

                {/* Profile */}
                <div className="relative" onMouseLeave={() => setIsProfileOpen(false)}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        onMouseEnter={() => setIsProfileOpen(true)}
                        aria-label="User Profile"
                        className="flex items-center gap-2.5 rounded-full hover:bg-muted p-1 pr-3 transition-colors relative z-50"
                    >
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground ring-2 ring-border overflow-hidden shrink-0">
                            {currentUser?.image ? (
                                <img src={currentUser.image} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold">{avatarInitials}</span>
                            )}
                        </div>
                        <div className="hidden md:flex flex-col items-start leading-tight">
                            <span className="text-sm font-semibold text-foreground">{displayName}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{userRole || 'Visitor'}</span>
                        </div>
                    </button>

                    {/* Profile dropdown */}
                    {isProfileOpen && (
                        <div
                            className="absolute right-0 top-full pt-2 w-56 max-w-[calc(100vw-16px)] z-50"
                            onMouseEnter={() => setIsProfileOpen(true)}
                        >
                            <div className="bg-popover rounded-xl shadow-xl border border-border overflow-hidden p-1">
                                <div className="px-3 py-2.5 border-b border-border mb-1">
                                    <p className="text-sm font-semibold text-foreground">{displayName || 'Guest'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{currentUser?.email || 'No email'}</p>
                                </div>

                                <label className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageUpload} />
                                    <User className="w-4 h-4 shrink-0" />
                                    Upload Photo
                                </label>

                                <Link
                                    href="/change-password"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors w-full"
                                >
                                    <KeyRound className="w-4 h-4 shrink-0" />
                                    Change Password
                                </Link>

                                <div className="h-px bg-border my-1" />

                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full text-left"
                                >
                                    <LogOut className="w-4 h-4 shrink-0" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
