"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { useState } from "react";

export default function AppShell({
    children,
    userRole,
    userPermissions,
    user,
    company
}: {
    children: React.ReactNode;
    userRole?: string | null;
    userPermissions?: string[];
    user?: any;
    company?: any;
}) {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/register" || pathname?.startsWith("/auth");
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-background">
            {!isAuthPage && (
                <Sidebar
                    userRole={userRole}
                    userPermissions={userPermissions}
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    company={company}
                    user={user}
                />
            )}
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${!isAuthPage
                    ? isCollapsed
                        ? "md:pl-20"
                        : "md:pl-72"
                    : ""
                }`}>
                {!isAuthPage && <Header user={user} />}
                <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 animate-in-fade-slide">
                    {children}
                </main>
            </div>
        </div>
    );
}
