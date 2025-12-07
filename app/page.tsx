import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseClient } from "@/lib/supabase";
import { statusLabels } from "@/lib/status-labels";
import { checkAdminAccess } from "@/app/admin/actions";
import { Shield, Link as LinkIcon, Calendar, Clock, ExternalLink } from "lucide-react";
import { WebsiteCardStats } from "@/components/website-card-stats";
import { BrandFilter } from "@/components/brand-filter";
import { StatusFilter } from "@/components/status-filter";
import { TagFilter } from "@/components/tag-filter";
import { SeoFilter } from "@/components/seo-filter";
import { WebsiteTags } from "@/components/website-tags";

type WebsiteSeoStats = {
  pos_1_3: number;
  pos_4_5: number;
  pos_6_10: number;
  pos_11_30: number;
  pos_31_100: number;
};

type Website = {
  uuid: string;
  domain: string;
  brand: string | null;
  environment_uuid: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  pretty_link: string | null;
  umami_website_id: string | null;
  tags: string[] | null;
  seo_stats?: WebsiteSeoStats;
};

const STATUS_ORDER = ["active", "deploying", "updating", "generating", "error", "waiting"] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

const isStatusKey = (value: string | null | undefined): value is StatusKey =>
  Boolean(value && STATUS_ORDER.includes(value as StatusKey));

const statusStyles: Record<StatusKey, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  deploying: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  updating: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  generating: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  waiting: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const formatDate = (value: string) => {
  if (!value) return "";
  return new Date(value).toLocaleString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeUrl = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
};

const normalizeBrand = (brand: string | null) => {
  if (!brand) return "other";
  
  let normalized = brand.toLowerCase();

  // Normalize common Cyrillic lookalikes to Latin
  normalized = normalized
    .replace(/с/g, 'c') // Cyrillic 'es'
    .replace(/а/g, 'a')
    .replace(/о/g, 'o')
    .replace(/і/g, 'i')
    .replace(/е/g, 'e');

  // Remove "casino" (whole word only), collapse spaces, trim
  return normalized
    .replace(/\bcasino\b/g, "")
    .replace(/\s+/g, " ")
    .trim() || "other";
};

const getWebsites = async (): Promise<{
  data: Website[];
  error: Error | null;
}> => {
  if (!supabaseClient) {
    return {
      data: [],
      error: new Error("Встановіть SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY, щоб завантажити дані Supabase."),
    };
  }

  const { data, error } = await supabaseClient
    .from("websites")
    .select("uuid, domain, brand, environment_uuid, status, created_at, updated_at, pretty_link, umami_website_id, tags")
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error };

  const { data: seoStats } = await supabaseClient
    .from("website_position_summary")
    .select("*");

  const websites = (data ?? []).map((site: any) => {
    const stats = seoStats?.find((s: any) => s.website_id === site.uuid);
    return {
      ...site,
      seo_stats: stats ? {
        pos_1_3: stats.pos_1_3,
        pos_4_5: stats.pos_4_5,
        pos_6_10: stats.pos_6_10,
        pos_11_30: stats.pos_11_30,
        pos_31_100: stats.pos_31_100,
      } : undefined
    };
  });

  return { data: websites, error: null };
};

export default async function Home({ searchParams }: { searchParams: Promise<{ status?: string; brand?: string; tag?: string; seo?: string }> }) {
  const { status: rawStatus, brand: rawBrand, tag: rawTag, seo: rawSeo } = await searchParams;
  const allowedFilters = ["all", ...STATUS_ORDER];
  const activeStatus = allowedFilters.includes(rawStatus ?? "") ? (rawStatus as string) : "all";
  const activeBrand = rawBrand ?? "all";
  const activeTag = rawTag ?? "all";
  const activeSeo = rawSeo ?? "all";

  const { data: websites, error } = await getWebsites();
  const isAdmin = await checkAdminAccess();

  // 1. Extract unique brands and tags
  const brands = Array.from(new Set(websites.map((w) => normalizeBrand(w.brand)))).sort();
  const allTags = Array.from(new Set(websites.flatMap((w) => w.tags || []))).sort();

  // 2. Filter by Brand
  let filtered = activeBrand === "all"
    ? websites
    : websites.filter((site) => normalizeBrand(site.brand) === activeBrand);

  // 3. Filter by Tag
  if (activeTag !== "all") {
    filtered = filtered.filter((site) => site.tags?.includes(activeTag));
  }

  // 4. Filter by Status
  if (activeStatus !== "all") {
    filtered = filtered.filter((site) => {
      const normalizedStatus = isStatusKey(site.status) ? site.status : "waiting";
      return normalizedStatus === activeStatus;
    });
  }

  // 5. Filter by SEO
  if (activeSeo !== "all") {
    filtered = filtered.filter((site) => {
      const stats = site.seo_stats;
      
      if (activeSeo === "none") {
        if (!stats) return true;
        return (
          (stats.pos_1_3 || 0) === 0 &&
          (stats.pos_4_5 || 0) === 0 &&
          (stats.pos_6_10 || 0) === 0 &&
          (stats.pos_11_30 || 0) === 0 &&
          (stats.pos_31_100 || 0) === 0
        );
      }

      if (!stats) return false;

      switch (activeSeo) {
        case "top3":
          return (stats.pos_1_3 || 0) > 0;
        case "top10":
          return ((stats.pos_4_5 || 0) + (stats.pos_6_10 || 0)) > 0;
        case "top30":
          return (stats.pos_11_30 || 0) > 0;
        case "top100":
          return (stats.pos_31_100 || 0) > 0;
        default:
          return true;
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-300">OP Tools</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Сайти</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/bulk"
                className="inline-flex items-center justify-center rounded-2xl border border-blue-500/40 bg-blue-500/10 px-5 py-2 text-sm font-semibold text-blue-200 transition hover:border-blue-400 hover:text-white"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Масовий редактор
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-2xl border border-purple-500/40 bg-purple-500/10 px-5 py-2 text-sm font-semibold text-purple-200 transition hover:border-purple-400 hover:text-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Адмін панель
                </Link>
              )}
              <Link
                href="/websites/create"
                className="inline-flex items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-2 text-sm font-semibold text-amber-200 transition hover:border-amber-300 hover:text-white"
              >
                Створити Сайт
              </Link>
            </div>
          </div>
          {error && (
            <div className="rounded-2xl border border-red-600/60 bg-red-900/40 px-4 py-2 text-sm text-red-200">
              {error.message}
            </div>
          )}
        </header>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <BrandFilter brands={brands} currentBrand={activeBrand} />
            <div className="h-8 w-px bg-white/10" />
            <TagFilter tags={allTags} currentTag={activeTag} />
            <div className="h-8 w-px bg-white/10" />
            <SeoFilter currentFilter={activeSeo} />
            <div className="h-8 w-px bg-white/10" />
            <StatusFilter currentStatus={activeStatus} />
          </div>

          <div className="grid gap-4">
            {!filtered.length && (
              <Card className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-slate-400">
                {websites.length
                  ? "Немає сайтів з обраними фільтрами."
                  : "Supabase відповідає, але таблиця `websites` поки що порожня."}
              </Card>
            )}
            {filtered.map((site) => {
              const domainUrl = normalizeUrl(site.domain);
              const normalizedStatus = isStatusKey(site.status) ? site.status : "waiting";

              return (
                <Card
                  key={site.uuid}
                  className="group overflow-hidden border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10"
                >
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between gap-4 border-b border-white/5 p-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/websites/${site.uuid}`}
                            className="text-lg font-semibold text-white transition hover:text-amber-400"
                          >
                            {site.domain}
                          </Link>
                        </div>
                        <p className="text-sm text-slate-400">{site.brand ?? "Невідомий бренд"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <WebsiteTags 
                          websiteId={site.uuid} 
                          initialTags={site.tags || []} 
                          availableTags={allTags}
                        />
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[normalizedStatus]}`}
                        >
                          {statusLabels[normalizedStatus] ?? normalizedStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6 p-5 sm:grid-cols-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Створено {formatDate(site.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Оновлено {formatDate(site.updated_at)}</span>
                          </div>
                        </div>

                        {domainUrl && (
                          <a
                            href={domainUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {domainUrl}
                          </a>
                        )}
                      </div>

                      {site.seo_stats && (
                        <Link href={`/websites/${site.uuid}?tab=analytics`} className="space-y-2 block hover:opacity-80 transition-opacity">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            SEO Позиції
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between rounded bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                              <span>Top 3</span>
                              <span className="font-bold">{site.seo_stats.pos_1_3}</span>
                            </div>
                            <div className="flex items-center justify-between rounded bg-emerald-500/5 px-2 py-1.5 text-xs text-emerald-300/80 ring-1 ring-inset ring-emerald-500/10">
                              <span>4-10</span>
                              <span className="font-bold">
                                {site.seo_stats.pos_4_5 + site.seo_stats.pos_6_10}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1.5 text-xs text-slate-300 ring-1 ring-inset ring-slate-700/50">
                              <span>11-30</span>
                              <span className="font-bold">{site.seo_stats.pos_11_30}</span>
                            </div>
                            <div className="flex items-center justify-between rounded bg-slate-800/30 px-2 py-1.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-800/50">
                              <span>31-100</span>
                              <span className="font-bold">{site.seo_stats.pos_31_100}</span>
                            </div>
                          </div>
                        </Link>
                      )}
                    </div>

                    {site.umami_website_id && (
                      <Link href={`/websites/${site.uuid}?tab=analytics`} className="block border-t border-white/5 bg-black/20 p-5 hover:bg-black/30 transition-colors">
                        <WebsiteCardStats websiteId={site.umami_website_id} />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
