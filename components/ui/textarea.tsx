"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full min-h-[180px] rounded-2xl border border-slate-800/70 bg-black/20 px-4 py-3 text-xs font-mono text-amber-100 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400",
      props.className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Textarea };
