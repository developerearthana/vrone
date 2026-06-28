import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    [
        // Base — layout, typography, accessibility
        "inline-flex items-center justify-center gap-2 whitespace-nowrap",
        "text-sm font-semibold leading-none tracking-[-0.01em]",
        "rounded-lg",
        // Transitions
        "transition-all duration-200",
        // Focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-40",
        // Tactile press
        "active:scale-[0.97]",
        // Icon children — consistent sizing without overriding caller's explicit size
        "[&>svg]:shrink-0",
    ].join(" "),
    {
        variants: {
            variant: {
                default: [
                    "bg-primary text-primary-foreground shadow-sm",
                    "hover:brightness-110 hover:shadow-md hover:shadow-primary/20",
                    "active:brightness-100 active:shadow-none",
                ].join(" "),
                destructive: [
                    "bg-destructive text-destructive-foreground shadow-sm",
                    "hover:brightness-110 hover:shadow-md hover:shadow-destructive/15",
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
                    "h-auto p-0 rounded-none shadow-none",
                    "active:scale-100",
                ].join(" "),
            },
            size: {
                default: "h-10 px-4 py-2",
                sm:      "h-8 px-3 text-xs rounded-md",
                lg:      "h-11 px-6 text-base rounded-xl",
                icon:    "h-10 w-10",
                "icon-sm": "h-8 w-8 rounded-md",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => (
        <button
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
)
Button.displayName = "Button"

export { Button, buttonVariants }
