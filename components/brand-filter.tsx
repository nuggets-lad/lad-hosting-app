"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BrandFilter({ brands, currentBrand }: { brands: string[], currentBrand: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("brand");
    } else {
      params.set("brand", value);
    }
    router.push(`/?${params.toString()}`);
  };

  // Helper to capitalize words
  const formatLabel = (str: string) => {
    if (str === "other") return "Other";
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-400">Бренд:</span>
      <Select value={currentBrand} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] rounded-xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:ring-amber-400/50">
          <SelectValue placeholder="Всі бренди" />
        </SelectTrigger>
        <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
          <SelectItem value="all">Всі бренди</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand} value={brand}>
              {formatLabel(brand)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
