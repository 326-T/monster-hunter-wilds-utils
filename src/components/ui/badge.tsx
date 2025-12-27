import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
	default: "bg-accent text-accent-foreground",
	outline: "border border-border text-foreground",
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
	({ className, variant = "default", ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
				badgeVariants[variant],
				className,
			)}
			{...props}
		/>
	),
);

Badge.displayName = "Badge";

export { Badge };
