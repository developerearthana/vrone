import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    iconColor?: string;
    trend?: "up" | "down" | "neutral";
    onClick?: () => void;
    className?: string;
}

export function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    iconColor = "text-primary",
    trend,
    onClick,
    className,
}: StatCardProps) {
    return (
        <div
            className={cn(
                "glass-card p-4 rounded-xl flex flex-col gap-2.5",
                onClick && "cursor-pointer select-none",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground leading-snug">{label}</p>
                <div className="p-1.5 rounded-lg bg-muted shrink-0">
                    <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
                </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                {value}
            </p>
            {sub && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {trend === "up" && (
                        <TrendingUp className="w-3 h-3 text-green-500 shrink-0" />
                    )}
                    {trend === "down" && (
                        <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />
                    )}
                    {sub}
                </p>
            )}
        </div>
    );
}
