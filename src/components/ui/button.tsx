import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
	default:
		"bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring",
	outline:
		"border border-border bg-transparent hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
	ghost: "bg-transparent hover:bg-muted/70",
};

const sizeClasses: Record<ButtonSize, string> = {
	default: "h-10 px-4 text-sm",
	sm: "h-9 px-3 text-sm",
	lg: "h-11 px-5 text-base",
	icon: "h-10 w-10",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = "default",
			size = "default",
			type = "button",
			...props
		},
		ref,
	) => {
		return (
			<button
				ref={ref}
				type={type}
				className={cn(
					"inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
					variantClasses[variant],
					sizeClasses[size],
					className,
				)}
				{...props}
			/>
		);
	},
);

Button.displayName = "Button";

export { Button };
