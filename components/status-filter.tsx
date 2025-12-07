"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusLabels } from "@/lib/status-labels";

const STATUS_ORDER = ["active", "deploying", "updating", "generating", "error", "waiting"] as const;

export function StatusFilter({ currentStatus }: { currentStatus: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-400">Статус:</span>
      <Select value={currentStatus} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] rounded-xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:ring-amber-400/50">
          <SelectValue placeholder="Всі статуси" />
        </SelectTrigger>
        <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
          <SelectItem value="all">Всі статуси</SelectItem>
          {STATUS_ORDER.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
