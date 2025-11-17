"use client";

import { forwardRef, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-sm text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400",
      props.className
    )}
    {...props}
  />
));

Select.displayName = "Select";

export { Select };
