import Link from "next/link";
import { Card } from "@/components/ui/card";
import { supabaseClient } from "@/lib/supabase";
import { statusLabels } from "@/lib/status-labels";

type Website = {
  uuid: string;
  domain: string;
  brand: string | null;
  environment_uuid: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  pretty_link: string | null;
};

const STATUS_ORDER = ["active", "deploying", "updating", "generating", "error", "waiting"] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

const isStatusKey = (value: string | null | undefined): value is StatusKey =>
  Boolean(value && STATUS_ORDER.includes(value as StatusKey));

const statusStyles: Record<StatusKey, string> = {
  active: "bg-emerald-500/20 text-emerald-200",
  deploying: "bg-sky-500/20 text-sky-200",
  updating: "bg-sky-500/20 text-sky-200",
  generating: "bg-sky-500/20 text-sky-200",
  error: "bg-red-500/20 text-red-200",
  waiting: "bg-slate-500/20 text-slate-200",
};

const statusAccents: Record<StatusKey, string> = {
  active: "from-emerald-500/15 to-emerald-500/0",
  deploying: "from-sky-500/15 to-sky-500/0",
  updating: "from-sky-500/15 to-sky-500/0",
  generating: "from-sky-500/15 to-sky-500/0",
  error: "from-red-500/15 to-red-500/0",
  waiting: "from-slate-500/15 to-slate-700/0",
};

const statusFilterConfig = [
  { key: "all", label: "Всі сайти", accent: "from-white/10 to-white/0" },
  ...STATUS_ORDER.map((status) => ({
    key: status,
    label: statusLabels[status],
    accent: statusAccents[status],
  })),
];

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", { timeZone: "UTC", hour12: false });

const normalizeUrl = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
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
    .select("uuid, domain, brand, environment_uuid, status, created_at, updated_at, pretty_link")
    .order("updated_at", { ascending: false });

  return { data: (data ?? []) as Website[], error: error ?? null };
};

export default async function Home({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: rawStatus } = await searchParams;
  const allowedFilters = ["all", ...STATUS_ORDER];
  const activeStatus = allowedFilters.includes(rawStatus ?? "") ? (rawStatus as string) : "all";

  const { data: websites, error } = await getWebsites();

  const baseCounts = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<StatusKey, number>);

  const statusCounts = websites.reduce((acc, site) => {
    const normalizedStatus = isStatusKey(site.status) ? site.status : "waiting";
    acc[normalizedStatus] = (acc[normalizedStatus] ?? 0) + 1;
    return acc;
  }, { ...baseCounts });

  const filteredWebsites =
    activeStatus === "all"
      ? websites
      : websites.filter((site) => {
          const normalizedStatus = isStatusKey(site.status) ? site.status : "waiting";
          return normalizedStatus === activeStatus;
        });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-300">OP Tools</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Сайти</h1>
            </div>
            <Link
              href="/websites/create"
              className="inline-flex items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-2 text-sm font-semibold text-amber-200 transition hover:border-amber-300 hover:text-white"
            >
              Створити Сайт
            </Link>
          </div>
          {error && (
            <div className="rounded-2xl border border-red-600/60 bg-red-900/40 px-4 py-2 text-sm text-red-200">
              {error.message}
            </div>
          )}
        </header>

        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            {statusFilterConfig.map((descriptor) => {
              const isActive = activeStatus === descriptor.key || (descriptor.key === "all" && activeStatus === "all");
              const nextHref = descriptor.key === "all" ? "/" : `/?status=${descriptor.key}`;
              const count = descriptor.key === "all" ? websites.length : statusCounts[descriptor.key as keyof typeof statusCounts] ?? 0;
              return (
                <Link
                  key={descriptor.key}
                  href={nextHref}
                  className={`rounded-2xl border border-white/10 bg-gradient-to-b ${descriptor.accent} p-4 transition hover:border-white/30 ${
                    isActive ? "ring-2 ring-amber-300" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{descriptor.label}</p>
                  <p className="text-2xl font-semibold text-white">{count}</p>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-4">
            {!filteredWebsites.length && (
              <Card className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-slate-400">
                {websites.length
                  ? "Немає сайтів з обраним статусом."
                  : "Supabase відповідає, але таблиця `websites` поки що порожня."}
              </Card>
            )}
            {filteredWebsites.map((site) => {
              const domainUrl = normalizeUrl(site.domain);
              const normalizedStatus = isStatusKey(site.status) ? site.status : "waiting";

              return (
                <Card key={site.uuid} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/websites/${site.uuid}`} className="text-lg font-semibold text-white hover:text-amber-400">
                      {site.domain}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {site.brand ?? "Невідомий бренд"} · {site.environment_uuid ?? "Невідомий ідентифікатор середовища"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[normalizedStatus]}`}
                  >
                    {statusLabels[normalizedStatus] ?? normalizedStatus}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <p>Створено: {formatDate(site.created_at)}</p>
                  <p>Оновлено: {formatDate(site.updated_at)}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>
                    {domainUrl ? (
                      <a href={domainUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline">
                        {domainUrl}
                      </a>
                    ) : (
                      "Адреса домену не налаштована"
                    )}
                  </span>
                  <span className="text-slate-500">UUID: {site.uuid}</span>
                </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
