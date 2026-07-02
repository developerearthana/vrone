"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion, useInView, animate } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StatCardInnerProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: ReactNode;
    trend?: "up" | "down" | "neutral";
    onClick?: () => void;
    className?: string;
    /** Stagger index for entrance animation (0-based). Each step adds ~60ms delay. */
    index?: number;
}

// Extracts a leading numeric value plus its surrounding prefix/suffix, e.g.
// "₹12,400" -> { prefix: "₹", number: 12400, suffix: "" }
// "5/10"     -> { prefix: "", number: 5, suffix: "/10" }
// Returns null for values with no parseable leading number (skips count-up).
function parseNumeric(value: string | number): { prefix: string; number: number; suffix: string; decimals: number } | null {
    const str = String(value);
    const match = str.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
    if (!match) return null;
    const [, prefix, numStr, suffix] = match;
    const number = parseFloat(numStr.replace(/,/g, ""));
    if (Number.isNaN(number)) return null;
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
    return { prefix, number, suffix, decimals };
}

function AnimatedValue({ value }: { value: string | number }) {
    const ref = useRef<HTMLParagraphElement>(null);
    const inView = useInView(ref, { once: true, margin: "-10px" });
    const [display, setDisplay] = useState<string>(() => (parseNumeric(value) ? "0" : String(value)));
    const parsed = parseNumeric(value);

    useEffect(() => {
        if (!inView || !parsed) {
            setDisplay(String(value));
            return;
        }
        const controls = animate(0, parsed.number, {
            duration: 0.8,
            ease: "easeOut",
            onUpdate: (latest) => {
                const formatted = parsed.decimals > 0
                    ? latest.toFixed(parsed.decimals)
                    : Math.round(latest).toLocaleString("en-IN");
                setDisplay(`${parsed.prefix}${formatted}${parsed.suffix}`);
            },
        });
        return () => controls.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, value]);

    return (
        <p ref={ref} className="text-2xl font-bold text-foreground tabular-nums leading-none">
            {display}
        </p>
    );
}

export function StatCardInner({
    label,
    value,
    sub,
    icon,
    trend,
    onClick,
    className,
    index = 0,
}: StatCardInnerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.06 }}
            whileHover={{ y: -3 }}
            className={cn(
                "glass-card p-4 rounded-xl flex flex-col gap-2.5",
                onClick && "cursor-pointer select-none",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground leading-snug">{label}</p>
                <motion.div
                    whileHover={{ scale: 1.12, rotate: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="p-1.5 rounded-lg bg-muted shrink-0"
                >
                    {icon}
                </motion.div>
            </div>
            <AnimatedValue value={value} />
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
        </motion.div>
    );
}
