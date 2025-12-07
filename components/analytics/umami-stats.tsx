"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, Users, Eye, Clock, Activity } from "lucide-react";

type UmamiStatsProps = {
  websiteId: string;
  headerActions?: React.ReactNode;
};

export function UmamiStats({ websiteId, headerActions }: UmamiStatsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/umami?websiteId=${websiteId}&range=${timeRange}`);
        if (!res.ok) throw new Error("Failed to fetch stats");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [websiteId, timeRange]);

  if (!websiteId) return null;

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="flex items-center justify-center h-[300px] text-red-400">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  // Process Chart Data
  let chartData: any[] = [];
  
  if (data?.chart) {
    // Handle Umami v2 structure { pageviews: [], sessions: [] }
    const pageviews = Array.isArray(data.chart.pageviews) ? data.chart.pageviews : (Array.isArray(data.chart) ? data.chart : []);
    const sessions = Array.isArray(data.chart.sessions) ? data.chart.sessions : [];

    // Create a map of dates
    const dateMap = new Map();

    // Fill in missing dates based on range
    const now = new Date();
    let daysToSubtract = 30;
    if (timeRange === "7d") daysToSubtract = 7;
    if (timeRange === "90d") daysToSubtract = 90;
    
    if (timeRange !== "24h") {
      for (let i = daysToSubtract - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, { date: dateStr, views: 0, visitors: 0 });
      }
    }

    pageviews.forEach((item: any) => {
      const date = item.x.split(' ')[0]; // Ensure we just get the date part if it includes time
      if (!dateMap.has(date)) dateMap.set(date, { date, views: 0, visitors: 0 });
      dateMap.get(date).views += item.y;
    });

    sessions.forEach((item: any) => {
      const date = item.x.split(' ')[0];
      if (!dateMap.has(date)) dateMap.set(date, { date, views: 0, visitors: 0 });
      dateMap.get(date).visitors += item.y;
    });

    chartData = Array.from(dateMap.values()).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Format dates for display
    chartData = chartData.map(item => ({
      ...item,
      displayDate: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));
  }

  const getValue = (obj: any) => {
    if (typeof obj === 'number') return obj;
    if (obj && typeof obj.value === 'number') return obj.value;
    return 0;
  };

  const totalViews = getValue(data?.stats?.pageviews);
  const totalVisitors = getValue(data?.stats?.visitors);
  const bounceRate = getValue(data?.stats?.bounces);
  const totalTime = getValue(data?.stats?.totaltime);
  const visitDuration = totalTime && totalVisitors ? Math.round(totalTime / totalVisitors) : 0;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          {headerActions}
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-slate-200">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
            <SelectItem value="24h">Останні 24 години</SelectItem>
            <SelectItem value="7d">Останні 7 днів</SelectItem>
            <SelectItem value="30d">Останні 30 днів</SelectItem>
            <SelectItem value="90d">Останні 90 днів</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Відвідувачі</p>
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{totalVisitors.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Перегляди</p>
              <Eye className="h-4 w-4 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{totalViews.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Показник відмов</p>
              <Activity className="h-4 w-4 text-rose-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{bounceRate}%</h3>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Тривалість візиту</p>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{formatDuration(visitDuration)}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200">Огляд трафіку</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Legend />
                <Bar name="Відвідувачі" dataKey="visitors" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar name="Перегляди" dataKey="views" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Location Table */}
      {data?.countries && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200">Локація</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.countries.map((country: any, index: number) => {
                const percentage = totalVisitors > 0 ? Math.round((country.y / totalVisitors) * 100) : 0;
                return (
                  <div key={country.x} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-400 w-6 flex items-center justify-center">
                        {/* Try to render flag from code, fallback to globe */}
                        {country.x.length === 2 ? (
                          <img 
                            src={`https://flagcdn.com/24x18/${country.x.toLowerCase()}.png`} 
                            alt={country.x}
                            className="w-5 h-auto object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`text-lg ${country.x.length === 2 ? 'hidden' : ''}`}>🌍</span>
                      </span>
                      <span className="text-slate-200">{country.x}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-slate-100 font-medium">{country.y}</span>
                      <span className="text-slate-500 w-8 text-right">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper to get flag emoji from country code (if Umami returns codes)
// If Umami returns full names, this might need adjustment or a mapping library
function getFlagEmoji(countryCode: string) {
  if (!countryCode) return "🌍";
  // Umami usually returns country names in the 'x' field for metrics? 
  // Or codes? Let's assume names for now, but if it's codes (PL, UA), we can convert.
  // If it's just names, we might not get flags easily without a lib.
  // For now, let's just return a generic globe if we can't parse, 
  // or try to interpret 2-letter codes if that's what it is.
  if (countryCode.length === 2) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  return "🌍";
}
