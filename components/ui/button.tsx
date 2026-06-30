"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    [
        "inline-flex items-center justify-center gap-2 whitespace-nowrap",
        "text-sm font-semibold leading-none tracking-[-0.01em]",
        "rounded-lg",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",
        "active:scale-[0.96]",
        "hover:scale-[1.02]",
        "overflow-hidden relative",
        "select-none",
        "[&>svg]:shrink-0",
    ].join(" "),
    {
        variants: {
            variant: {
                default: [
                    "bg-primary text-primary-foreground shadow-sm",
                    "hover:brightness-[1.08] hover:shadow-[0_4px_18px_hsl(var(--primary)/0.28)]",
                    "active:brightness-100 active:shadow-none",
                ].join(" "),
                destructive: [
                    "bg-destructive text-destructive-foreground shadow-sm",
                    "hover:brightness-[1.08] hover:shadow-[0_4px_14px_hsl(var(--destructive)/0.25)]",
                    "active:shadow-none",
                ].join(" "),
                outline: [
                    "border border-border bg-card text-foreground shadow-sm",
                    "hover:border-primary/60 hover:text-primary hover:bg-primary/5 hover:shadow-none",
                ].join(" "),
                secondary: [
                    "bg-secondary text-secondary-foreground",
                    "hover:bg-secondary/70",
                ].join(" "),
                ghost: [
                    "text-foreground",
                    "hover:bg-muted hover:text-foreground",
                ].join(" "),
                link: [
                    "text-primary underline-offset-4",
                    "hover:underline",
                    "h-auto p-0 rounded-none shadow-none overflow-visible",
                    "active:scale-100 hover:scale-100",
                ].join(" "),
            },
            size: {
                default:   "h-10 px-4 py-2",
                sm:        "h-8 px-3 text-xs rounded-md",
                lg:        "h-11 px-6 text-base rounded-xl",
                icon:      "h-10 w-10",
                "icon-sm": "h-8 w-8 rounded-md",
            },
        },
        defaultVariants: {
            variant: "default",
            size:    "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, asChild = false, children, onClick, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!asChild && variant !== "link" && !isLoading) {
                const btn = e.currentTarget
                const rect = btn.getBoundingClientRect()
                const ripple = document.createElement("span")
                ripple.className = "btn-ripple"
                ripple.style.left = `${e.clientX - rect.left}px`
                ripple.style.top  = `${e.clientY - rect.top}px`
                btn.appendChild(ripple)
                ripple.addEventListener("animationend", () => ripple.remove(), { once: true })
            }
            onClick?.(e)
        }

        return (
            <Comp
                ref={ref}
                className={cn(buttonVariants({ variant, size, className }))}
                disabled={disabled || isLoading}
                onClick={handleClick}
                aria-busy={isLoading}
                {...props}
            >
                {asChild ? children : (
                    <>
                        {isLoading && <span className="btn-spinner" aria-hidden="true" />}
                        {children}
                    </>
                )}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
