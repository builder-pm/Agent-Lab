import React from "react";
import { cn } from "@/lib/utils";

// --- Types ---
interface BrutalProps extends React.HTMLAttributes<HTMLDivElement> {
    as?: React.ElementType;
}

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "accent" | "outline" | "danger";
    size?: "sm" | "md" | "lg";
}

// --- Components ---

/**
 * BrutalCard: Hard borders, hard shadows, default white background.
 */
export const BrutalCard = React.forwardRef<HTMLDivElement, BrutalProps>(
    ({ className, as: Component = "div", ...props }, ref) => {
        return (
            <Component
                ref={ref}
                className={cn(
                    "bg-card text-card-foreground border-4 border-border shadow-brutal",
                    "hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all duration-200",
                    className
                )}
                {...props}
            />
        );
    }
);
BrutalCard.displayName = "BrutalCard";

/**
 * BrutalButton: Uppercase, bold, hard clickable effect.
 */
export const BrutalButton = React.forwardRef<HTMLButtonElement, BrutalButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-primary-foreground hover:bg-primary/90",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            accent: "bg-accent text-accent-foreground hover:bg-accent/90",
            outline: "bg-transparent hover:bg-muted",
            danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        };

        const sizes = {
            sm: "h-9 px-4 text-xs",
            md: "h-11 px-6 text-sm",
            lg: "h-14 px-8 text-base",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center font-bold uppercase tracking-wider",
                    "border-4 border-border shadow-brutal active:shadow-none active:translate-x-0.5 active:translate-y-0.5",
                    "transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);
BrutalButton.displayName = "BrutalButton";

/**
 * BrutalBadge: Small sticker-like element.
 */
export const BrutalBadge = React.forwardRef<HTMLDivElement, BrutalProps & { rotate?: boolean }>(
    ({ className, rotate = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-none border-2 border-border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "bg-secondary text-secondary-foreground shadow-sm",
                    rotate && "-rotate-2 hover:rotate-0 transition-transform",
                    className
                )}
                {...props}
            />
        );
    }
);
BrutalBadge.displayName = "BrutalBadge";
