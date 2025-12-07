"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trophy } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

  // Get all unique dates sorted descending (newest first)
  const allDates = Array.from(new Set(data.flatMap(d => d.ranks.map(r => r.date))))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Пошукові позиції</h3>
        <Button onClick={handleSync} disabled={syncing} variant="outline" className="h-8 px-3 text-xs">
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Оновити дані
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableHead className="text-slate-400 min-w-[200px] sticky left-0 bg-slate-900 z-10 shadow-[1px_0_0_0_#1e293b]">Ключове слово</TableHead>
                  <TableHead className="text-slate-400 min-w-[100px]">Найкраща</TableHead>
                  <TableHead className="text-slate-400 min-w-[100px]">Частотність</TableHead>
                  {allDates.map(date => (
                    <TableHead key={date} className="text-slate-400 text-center min-w-[100px]">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span>{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell colSpan={3 + allDates.length} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell colSpan={3 + allDates.length} className="text-center py-8 text-slate-500">
                      Дані відсутні. Налаштуйте SpySERP ID та натисніть "Оновити".
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => {
                    // Calculate best position
                    const validRanks = row.ranks.filter(r => r.position > 0).map(r => r.position);
                    const bestPos = validRanks.length > 0 ? Math.min(...validRanks) : null;

                    return (
                      <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-medium text-slate-200 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[1px_0_0_0_#1e293b]">
                          {row.keyword}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {bestPos ? (
                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3 text-yellow-500" />
                              <span className="font-bold">{bestPos}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-slate-300">{row.volume ?? "-"}</TableCell>
                        
                        {allDates.map((date, index) => {
                          const rankEntry = row.ranks.find(r => r.date === date);
                          const position = rankEntry?.position;
                          
                          // Calculate change from previous date (which is next in the sorted list)
                          let change = 0;
                          let hasChange = false;
                          
                          if (index < allDates.length - 1) {
                            const prevDate = allDates[index + 1];
                            const prevRankEntry = row.ranks.find(r => r.date === prevDate);
                            const prevPosition = prevRankEntry?.position;
                            
                            // Treat missing/zero positions as >100 (e.g. 101)
                            const currentPosVal = (position && position > 0) ? position : 101;
                            const prevPosVal = (prevPosition && prevPosition > 0) ? prevPosition : 101;
                            
                            if (currentPosVal !== prevPosVal) {
                              change = prevPosVal - currentPosVal;
                              hasChange = true;
                            }
                          }

                          // Background color for significant changes
                          let bgClass = "";
                          if (hasChange) {
                             if (change > 0) bgClass = "bg-emerald-500/10";
                             else if (change < 0) bgClass = "bg-rose-500/10";
                          }

                          return (
                            <TableCell key={date} className={`text-center border-l border-slate-800/50 ${bgClass}`}>
                              <div className="flex items-center justify-center gap-1">
                                <span className={`font-bold ${position && position > 0 ? "text-white" : "text-slate-500"}`}>
                                  {position && position > 0 ? position : "-"}
                                </span>
                                {hasChange && change !== 0 && (
                                  <span className={`text-[10px] flex items-center ${change > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {change > 0 ? "▲" : "▼"} {Math.abs(change)}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
