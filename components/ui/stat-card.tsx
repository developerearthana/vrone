import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCardInner } from "./stat-card-inner";

export interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    iconColor?: string;
    trend?: "up" | "down" | "neutral";
    onClick?: () => void;
    className?: string;
    /** Stagger index for entrance animation (0-based). Each step adds ~60ms delay. */
    index?: number;
}

// Renders the icon into an element here (server-safe) before handing off to
// the client component — passing the LucideIcon component reference itself
// across the server/client boundary is not serializable and breaks RSC.
export function StatCard({
    icon: Icon,
    iconColor = "text-primary",
    ...rest
}: StatCardProps) {
    return (
        <StatCardInner
            {...rest}
            icon={<Icon className={cn("w-4 h-4 shrink-0", iconColor)} />}
        />
    );
}
