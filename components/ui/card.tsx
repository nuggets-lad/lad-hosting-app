"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => (
  <div
    className={cn(
      "rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/40",
      className
    )}
  >
    {children}
  </div>
);

export { Card };
