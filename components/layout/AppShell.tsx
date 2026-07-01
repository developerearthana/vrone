"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { PageProgress } from "@/components/ui/page-progress";
import ChatLauncher from "@/components/chat/ChatLauncher";
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

            {/* ── Terra background canvas — geological polygon fragments ── */}
            <div className="terra-canvas" aria-hidden="true">
                {/* Top-right: two overlapping geological shards */}
                <svg
                    className="terra-svg-tr"
                    viewBox="0 0 540 540"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Main large shard */}
                    <polygon
                        points="460,0 540,110 540,370 420,460 240,390 160,210 300,0"
                        fill="oklch(57% .13 42)"
                        opacity="0.055"
                    />
                    {/* Secondary smaller fragment */}
                    <polygon
                        points="320,190 460,250 440,390 300,370 260,280"
                        fill="oklch(43% .11 38)"
                        opacity="0.042"
                    />
                    {/* Faint strata line */}
                    <line x1="190" y1="80" x2="510" y2="420"
                        stroke="oklch(57% .13 42)" strokeWidth="0.6" opacity="0.10" />
                    <line x1="220" y1="40" x2="490" y2="350"
                        stroke="oklch(57% .13 42)" strokeWidth="0.4" opacity="0.06" />
                </svg>
                {/* Bottom-left: grounded earth fragments */}
                <svg
                    className="terra-svg-bl"
                    viewBox="0 0 460 460"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <polygon
                        points="0,240 140,170 250,270 230,460 0,430"
                        fill="oklch(14.2% .024 52)"
                        opacity="0.048"
                    />
                    <polygon
                        points="70,380 200,340 220,460 80,460"
                        fill="oklch(57% .13 42)"
                        opacity="0.04"
                    />
                    <line x1="30" y1="200" x2="240" y2="440"
                        stroke="oklch(57% .13 42)" strokeWidth="0.5" opacity="0.08" />
                </svg>
                {/* Center: faint distant octagon */}
                <svg
                    className="terra-svg-c"
                    viewBox="0 0 320 320"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <polygon
                        points="160,20 260,60 300,160 260,260 160,300 60,260 20,160 60,60"
                        fill="oklch(57% .13 42)"
                        opacity="0.032"
                    />
                </svg>
            </div>

            {/* ── Travels background canvas — compass arcs + cartographic ── */}
            <div className="travels-canvas" aria-hidden="true">
                {/* Top-right: concentric compass bearing arcs */}
                <svg
                    className="travels-svg-tr"
                    viewBox="0 0 500 500"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Outer arc (r=470, center at 500,0) */}
                    <path d="M 30 0 A 470 470 0 0 1 500 470"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.7" opacity="0.09" />
                    {/* Middle arc (r=350) */}
                    <path d="M 150 0 A 350 350 0 0 1 500 350"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.5" opacity="0.065" />
                    {/* Inner arc (r=230) */}
                    <path d="M 270 0 A 230 230 0 0 1 500 230"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.5" opacity="0.05" />
                    {/* Corner fill accent */}
                    <polygon points="460,0 500,0 500,150 380,0"
                        fill="hsl(222 62% 44%)" opacity="0.042" />
                    {/* Bearing tick marks on outer arc */}
                    <line x1="93" y1="235" x2="102" y2="230"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.8" opacity="0.12" />
                    <line x1="265" y1="407" x2="270" y2="398"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.8" opacity="0.12" />
                    {/* Tick marks on middle arc */}
                    <line x1="197" y1="175" x2="203" y2="172"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.7" opacity="0.10" />
                    <line x1="325" y1="303" x2="329" y2="297"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.7" opacity="0.10" />
                </svg>
                {/* Bottom-left: mirror compass arcs + coordinate cross */}
                <svg
                    className="travels-svg-bl"
                    viewBox="0 0 440 440"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Outer arc (r=420, center at 0,440) */}
                    <path d="M 420 440 A 420 420 0 0 0 0 20"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.7" opacity="0.08" />
                    {/* Middle arc (r=300) */}
                    <path d="M 300 440 A 300 300 0 0 0 0 140"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.5" opacity="0.06" />
                    {/* Corner fill accent */}
                    <polygon points="0,420 0,440 150,440"
                        fill="hsl(222 62% 44%)" opacity="0.04" />
                    {/* Coordinate cross */}
                    <line x1="180" y1="315" x2="180" y2="355"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.8" opacity="0.12" />
                    <line x1="160" y1="335" x2="200" y2="335"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.8" opacity="0.12" />
                    {/* Second coordinate cross, smaller */}
                    <line x1="290" y1="390" x2="290" y2="420"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.6" opacity="0.09" />
                    <line x1="275" y1="405" x2="305" y2="405"
                        stroke="hsl(222 62% 44%)" strokeWidth="0.6" opacity="0.09" />
                </svg>
            </div>

            {/* Route transition progress bar */}
            <PageProgress />

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

            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out above-canvas ${
                !isAuthPage
                    ? isCollapsed ? "md:pl-16" : "md:pl-56"
                    : ""
            }`}>
                {!isAuthPage && <Header user={user} />}
                <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 animate-in-fade-slide">
                    <div className="w-full max-w-screen-2xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Floating chat bubble — expands to a panel / fullscreen, with sound + animation alerts */}
            {!isAuthPage && <ChatLauncher />}
        </div>
    );
}
