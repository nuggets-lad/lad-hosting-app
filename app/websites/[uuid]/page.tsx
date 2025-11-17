import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { WebsiteDetailTabs } from "@/components/website-detail-tabs";
import { supabaseClient } from "@/lib/supabase";
import { statusLabels } from "@/lib/status-labels";
import { WebsiteDetailRecord, WebsiteHistoryEntry, WebsiteHistoryField, WebsiteHistoryRow } from "@/lib/website-types";

const fetchWebsite = async (uuid: string | undefined) => {
  if (!supabaseClient) {
    return {
      site: null,
      history: [],
      error: new Error("Встановіть SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY, щоб відкрити цю сторінку."),
    };
  }

  if (!uuid) {
    return {
      site: null,
      history: [],
      error: new Error("UUID сайту не вказано."),
    };
  }

  const { data, error } = await supabaseClient
    .from("websites")
    .select(
      "uuid, domain, brand, environment_uuid, status, payload, ref, pretty_link, created_at, updated_at, server_uuid, app_uuid, admin_slug, api_key, admin_user, admin_password, logo, banner, banner_mobile, image_1, image_2, image_3, image_4, login_button_text, register_button_text, bonus_button_text, publisher, brand_full, brand_key, target_site, style"
    )
    .eq("uuid", uuid)
    .single();
  const site = data as WebsiteDetailRecord | null;

  const historyResponse = await supabaseClient
    .from("websites_history")
    .select("id, data, changed_at")
    .eq("website_uuid", uuid)
    .order("changed_at", { ascending: false })
    .limit(12);

  return {
    site,
    history: (historyResponse.data as WebsiteHistoryRow[] | null) ?? [],
    error: error ?? historyResponse.error ?? null,
  };
};

const toAbsoluteUrl = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
};

const buildAdminUrl = (baseUrl: string | null, slug: string | null): string | null => {
  if (!baseUrl || !slug) {
    return null;
  }
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedSlug = slug.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedSlug}`;
};

const formatHistoryValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const collectHistoryFields = (value: unknown): WebsiteHistoryField[] => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .slice(0, 8)
      .map(([key, entryValue]) => ({ key, value: formatHistoryValue(entryValue) }));
  }
  return [{ key: "payload", value: formatHistoryValue(value) }];
};

const prepareHistory = (history: WebsiteHistoryRow[]): WebsiteHistoryEntry[] =>
  history.map((entry) => ({
    id: entry.id,
    changed_at: entry.changed_at,
    fields: collectHistoryFields(entry.data),
  }));

export default async function WebsitePage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const { site, history, error } = await fetchWebsite(uuid);

  if (!site) {
    if (!error) {
      return notFound();
    }
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
          <Card className="rounded-2xl border border-red-600/60 bg-red-900/40 p-6 text-sm text-red-200">
            {error.message}
          </Card>
          <Link href="/" className="text-sm text-amber-300 underline">
            ← Назад до сайтів
          </Link>
        </div>
      </div>
    );
  }

  const primaryDomainUrl = toAbsoluteUrl(site.domain);
  const prettyUrl = toAbsoluteUrl(site.pretty_link);
  const siteUrl = primaryDomainUrl ?? prettyUrl;
  const adminUrl = buildAdminUrl(siteUrl, site.admin_slug);
  const preparedHistory = prepareHistory(history);
  const statusDisplay = statusLabels[site.status ?? "waiting"] ?? site.status ?? "очікування";
  const environmentLabel = site.environment_uuid ?? "невідомий";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <WebsiteDetailTabs
        site={site}
        history={preparedHistory}
        adminUrl={adminUrl}
        siteUrl={siteUrl}
        statusDisplay={statusDisplay}
        environmentLabel={environmentLabel}
      />
    </div>
  );
}
