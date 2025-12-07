"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SeoPositionsProps = {
  websiteUuid: string;
};

type KeywordData = {
  id: number;
  keyword: string;
  ranks: { date: string; position: number }[];
  volume: number | null;
};

export function SeoPositions({ websiteUuid }: SeoPositionsProps) {
  const [data, setData] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const fetchData = async () => {
    setLoading(true);
    // Fetch keywords
    const { data: keywords } = await supabase
      .from("seo_keywords")
      .select("id, keyword")
      .eq("website_id", websiteUuid);

    if (!keywords) {
      setLoading(false);
      return;
    }

    // Fetch ranks (last 30 days?)
    const { data: ranks } = await supabase
      .from("seo_daily_ranks")
      .select("keyword_id, date, position")
      .in("keyword_id", keywords.map(k => k.id))
      .order("date", { ascending: true });

    // Fetch latest volume
    const { data: volumes } = await supabase
      .from("seo_daily_volumes")
      .select("keyword_id, volume, date")
      .in("keyword_id", keywords.map(k => k.id))
      .order("date", { ascending: false });

    // Process data
    const processed = keywords.map(k => {
      const kRanks = ranks?.filter(r => r.keyword_id === k.id) || [];
      // Sort ranks by date just in case
      kRanks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Find volume (most recent)
      const kVol = volumes?.find(v => v.keyword_id === k.id); // Since we ordered by date desc, find first match
      
      return {
        id: k.id,
        keyword: k.keyword,
        ranks: kRanks.map(r => ({ date: r.date, position: r.position })),
        volume: kVol?.volume || null
      };
    });

    setData(processed);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [websiteUuid]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/cron/spyserp", {
        method: "POST",
        body: JSON.stringify({ website_uuid: websiteUuid }),
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Пошукові позиції</h3>
        <Button onClick={handleSync} disabled={syncing} variant="outline" className="h-8 px-3 text-xs">
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Оновити дані
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-900/50">
                <TableHead className="text-slate-400">Ключове слово</TableHead>
                <TableHead className="text-slate-400">Частотність</TableHead>
                <TableHead className="text-slate-400">Позиція</TableHead>
                <TableHead className="text-slate-400">Динаміка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    Дані відсутні. Налаштуйте SpySERP ID та натисніть "Оновити".
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => {
                  const lastRank = row.ranks[row.ranks.length - 1];
                  const prevRank = row.ranks[row.ranks.length - 2];
                  const change = prevRank && lastRank ? prevRank.position - lastRank.position : 0; // Positive means improved (lower number)

                  return (
                    <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="font-medium text-slate-200">{row.keyword}</TableCell>
                      <TableCell className="text-slate-300">{row.volume ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{lastRank?.position ?? "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         {change !== 0 && (
                            <span className={change > 0 ? "text-emerald-400" : "text-rose-400"}>
                              {change > 0 ? "▲" : "▼"} {Math.abs(change)}
                            </span>
                         )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
