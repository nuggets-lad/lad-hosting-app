"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";

export function WebsiteCardStats({ websiteId }: { websiteId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/umami?websiteId=${websiteId}&range=30d`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        // ignore error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [websiteId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-slate-600" />;
  if (!data) return null;

  // Helper to safely get values
  const getValue = (obj: any) => {
    if (typeof obj === 'number') return obj;
    if (obj && typeof obj.value === 'number') return obj.value;
    return 0;
  };

  const visitors = getValue(data.stats?.visitors);
  
  // Handle Umami v2 structure
  const sessions = Array.isArray(data.chart?.sessions) 
    ? data.chart.sessions 
    : (Array.isArray(data.chart) ? data.chart : []);

  // Fill in missing dates for the last 30 days
  const dateMap = new Map();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dateMap.set(dateStr, { date: dateStr, visitors: 0 });
  }

  sessions.forEach((item: any) => {
    // Robust date parsing: handle "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss.sssZ"
    const date = item.x ? item.x.substring(0, 10) : "";
    if (date && dateMap.has(date)) {
      dateMap.get(date).visitors += Number(item.y || 0);
    }
  });

  const chartData = Array.from(dateMap.values()).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="relative w-full">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{visitors.toLocaleString()}</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Відвідувачів (30 днів)</span>
      </div>
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${websiteId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded bg-slate-900/90 px-2 py-1 text-xs text-white shadow border border-slate-700">
                      <span className="font-bold">{payload[0].value}</span> visitors
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="visitors" 
              stroke="#10b981" 
              fill={`url(#gradient-${websiteId})`}
              strokeWidth={2} 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
