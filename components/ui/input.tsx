"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400",
      props.className
    )}
    {...props}
  />
));

Input.displayName = "Input";

export { Input };
