"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost" | "secondary" | "outline" | "destructive";

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-amber-400 text-slate-950 hover:bg-amber-300",
  ghost: "bg-transparent border border-slate-800/80 text-slate-100 hover:border-slate-600",
  secondary: "bg-slate-900/70 text-white hover:bg-slate-800",
  outline: "border border-slate-800/80 text-slate-100 hover:border-slate-600",
  destructive: "bg-red-500 text-white hover:bg-red-600",
};

const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition",
        variantStyles[variant],
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Button.displayName = "Button";

export { Button, variantStyles };
