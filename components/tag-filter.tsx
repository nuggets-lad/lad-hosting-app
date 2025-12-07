"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TagFilter({ tags, currentTag }: { tags: string[], currentTag: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("tag");
    } else {
      params.set("tag", value);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-400">Тег:</span>
      <Select value={currentTag} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] rounded-xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:ring-amber-400/50">
          <SelectValue placeholder="Всі теги" />
        </SelectTrigger>
        <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
          <SelectItem value="all">Всі теги</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
