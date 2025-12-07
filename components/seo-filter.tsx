"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEO_OPTIONS = [
  { value: "all", label: "Всі сайти" },
  { value: "top3", label: "Топ 3" },
  { value: "top10", label: "Топ 4-10" },
  { value: "top30", label: "Топ 11-30" },
  { value: "top100", label: "Топ 31-100" },
  { value: "none", label: "Без позицій" },
];

export function SeoFilter({ currentFilter }: { currentFilter: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("seo");
    } else {
      params.set("seo", value);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-400">SEO:</span>
      <Select value={currentFilter} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] rounded-xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:ring-amber-400/50">
          <SelectValue placeholder="Всі сайти" />
        </SelectTrigger>
        <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
          {SEO_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
