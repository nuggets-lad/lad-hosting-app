"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PayloadPreview } from "@/components/payload-preview";
import { MediaUploadInput } from "@/components/media-upload-input";
import { AiAssistant, Message } from "@/components/ai-assistant";
import { SeoPositions } from "@/components/analytics/seo-positions";
import { SpySerpMasterSetup } from "@/components/analytics/spyserp-master-setup";
import { UmamiStats } from "@/components/analytics/umami-stats";
import { WebsiteDetailRecord, WebsiteHistoryEntry } from "@/lib/website-types";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Loader2, RotateCcw, Settings } from "lucide-react";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", { timeZone: "UTC", hour12: false });

type TabId =
  | "overview"
  | "auth"
  | "history"
  | "edit-global"
  | "edit-siteframe-raw"
  | "edit-siteframe-structured"
  | "regenerate"
  | "redeploy"
  | "ai-assistant"
  | "analytics";

type WebsiteDetailTabsProps = {
  site: WebsiteDetailRecord;
  history: WebsiteHistoryEntry[];
  adminUrl: string | null;
  siteUrl: string | null;
  statusDisplay: string;
  environmentLabel: string;
  isAdmin: boolean;
  umamiUrl: string;
};

type ButtonField = "login_button_text" | "register_button_text" | "bonus_button_text";
type ButtonTokenId = "login_btn" | "register_btn" | "bonus_btn";

type ButtonToken = {
  token: ButtonTokenId;
  label: string;
  placeholder: string;
  field: ButtonField;
};

const BUTTON_TOKENS: ButtonToken[] = [
  { token: "login_btn", label: "Текст кнопки входу", placeholder: "Увійти до кабінету", field: "login_button_text" },
  { token: "register_btn", label: "Текст кнопки реєстрації", placeholder: "Стартувати зараз", field: "register_button_text" },
  { token: "bonus_btn", label: "Текст бонусної кнопки", placeholder: "Отримати бонус", field: "bonus_button_text" },
];

const extractButtonCopy = (payload: string | null, token: string): string => {
  if (!payload) {
    return "";
  }

  const attributeRegex = new RegExp(`\\[${token}[^\\]]*(?:text|label|copy)="([^"]+)"[^\\]]*\\]`, "i");
  const attributeMatch = payload.match(attributeRegex);
  if (attributeMatch) {
    return attributeMatch[1];
  }

  const blockRegex = new RegExp(`\\[${token}\\]([\\s\\S]*?)\\[\\/${token}\\]`, "i");
  const blockMatch = payload.match(blockRegex);
  if (blockMatch) {
    return blockMatch[1].trim();
  }

  return "";
};

const FieldLabel = ({ children }: { children: string }) => (
  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{children}</p>
);

type NavItem = {
  id: TabId;
  label: string;
};

type SaveTarget = "global" | "siteframe" | "mixed";
type ActionTarget = SaveTarget | "regenerate" | "redeploy" | "disable";

type GlobalFields = {
  brand: string;
  pretty_link: string;
  domain: string;
  ref: string;
  logo: string;
  banner: string;
  banner_mobile: string;
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
  locale: string;
  favicon: string;
  global_code_after_head_open: string;
  global_code_after_body_open: string;
  robots_txt: string;
  htaccess: string;
  redirect_404: boolean;
  spyserp_project_id: string;
  spyserp_domain_id: string;
  spyserp_folder_name: string;
  spyserp_valuemetric_id: string;
  spyserp_engine_id: string;
  umami_website_id: string;
};

type ButtonCopyState = Record<ButtonTokenId, string>;

type RegenerationFields = {
  publisher: string;
  brand_full: string;
  brand_key: string;
  target_site: string;
  style: string;
  locale: string;
  logo: string;
  banner: string;
  banner_mobile: string;
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
  favicon: string;
  login_button_text: string;
  register_button_text: string;
  bonus_button_text: string;
};

type RedeployFields = {
  publisher: string;
  brand_full: string;
  brand_key: string;
  target_site: string;
  style: string;
  pretty_link: string;
  locale: string;
  logo: string;
  banner: string;
  banner_mobile: string;
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
  favicon: string;
  login_button_text: string;
  register_button_text: string;
  bonus_button_text: string;
};

const CORE_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Панель" },
  { id: "auth", label: "Авторизація" },
  { id: "history", label: "Історія" },
  { id: "edit-global", label: "Глобальні поля" },
  { id: "analytics", label: "Аналітика" },
  { id: "ai-assistant", label: "ШІ Асистент" },
];

const SITEFRAME_NAV_ITEMS: NavItem[] = [
  { id: "edit-siteframe-raw", label: "Редактор коду" },
  { id: "edit-siteframe-structured", label: "Редактор сторінок" },
];

const DANGER_NAV_ITEMS: NavItem[] = [
  { id: "regenerate", label: "Перегенерація" },
  { id: "redeploy", label: "Редеплой" },
];

const DASHBOARD_CARDS: Array<{ id: TabId; title: string; description: string; accent: string }> = [
  {
    id: "auth",
    title: "Авторизація",
    description: "Облікові дані для адмінки та інтеграцій.",
    accent: "from-amber-300/40 via-amber-200/20 to-transparent",
  },
  {
    id: "history",
    title: "Історія",
    description: "Останні збережені payload-и та зміни.",
    accent: "from-sky-400/40 via-sky-200/20 to-transparent",
  },
  {
    id: "edit-global",
    title: "Глобальні поля",
    description: "Брендинг, посилання, медіа та кнопки.",
    accent: "from-emerald-400/40 via-emerald-200/20 to-transparent",
  },
  {
    id: "edit-siteframe-structured",
    title: "Siteframe",
    description: "Редактор payload і сторінок.",
    accent: "from-indigo-400/40 via-indigo-200/20 to-transparent",
  },
  {
    id: "regenerate",
    title: "Перегенерація",
    description: "Запуск повного оновлення сайту.",
    accent: "from-rose-400/40 via-rose-200/20 to-transparent",
  },
  {
    id: "redeploy",
    title: "Редеплой",
    description: "Видалення та створення заново.",
    accent: "from-amber-400/40 via-amber-200/20 to-transparent",
  },
];

const buildGlobalFields = (site: WebsiteDetailRecord): GlobalFields => ({
  brand: site.brand ?? "",
  pretty_link: site.pretty_link ?? "",
  domain: site.domain ?? "",
  ref: site.ref ?? "",
  logo: site.logo ?? "",
  banner: site.banner ?? "",
  banner_mobile: site.banner_mobile ?? "",
  image_1: site.image_1 ?? "",
  image_2: site.image_2 ?? "",
  image_3: site.image_3 ?? "",
  image_4: site.image_4 ?? "",
  locale: site.locale ?? "",
  favicon: site.favicon ?? "",
  global_code_after_head_open: site.global_code_after_head_open ?? "",
  global_code_after_body_open: site.global_code_after_body_open ?? "",
  robots_txt: site.robots_txt ?? "",
  htaccess: site.htaccess ?? "",
  redirect_404: site.redirect_404 ?? true,
  spyserp_project_id: site.spyserp_project_id?.toString() ?? "",
  spyserp_domain_id: site.spyserp_domain_id?.toString() ?? "",
  spyserp_folder_name: site.spyserp_folder_name ?? "",
  spyserp_valuemetric_id: site.spyserp_valuemetric_id?.toString() ?? "",
  spyserp_engine_id: site.spyserp_engine_id?.toString() ?? "",
  umami_website_id: site.umami_website_id ?? "",
});

const buildButtonCopy = (site: WebsiteDetailRecord): ButtonCopyState => {
  const initial: ButtonCopyState = {
    login_btn: "",
    register_btn: "",
    bonus_btn: "",
  };
  BUTTON_TOKENS.forEach((tokenConfig) => {
    const fromDb = site[tokenConfig.field];
    const fallback = extractButtonCopy(site.payload, tokenConfig.token);
    initial[tokenConfig.token] = fromDb ?? fallback;
  });
  return initial;
};

const buildRegenerationFields = (site: WebsiteDetailRecord): RegenerationFields => ({
  publisher: site.publisher ?? site.brand ?? "",
  brand_full: site.brand_full ?? site.brand ?? "",
  brand_key: site.brand_key ?? site.pretty_link ?? "",
  target_site: site.target_site ?? site.domain ?? "",
  style: site.style ?? "",
  locale: site.locale ?? "",
  logo: site.logo ?? "",
  banner: site.banner ?? "",
  banner_mobile: site.banner_mobile ?? "",
  image_1: site.image_1 ?? "",
  image_2: site.image_2 ?? "",
  image_3: site.image_3 ?? "",
  image_4: site.image_4 ?? "",
  favicon: site.favicon ?? "",
  login_button_text: site.login_button_text ?? extractButtonCopy(site.payload, "login_btn") ?? "",
  register_button_text: site.register_button_text ?? extractButtonCopy(site.payload, "register_btn") ?? "",
  bonus_button_text: site.bonus_button_text ?? extractButtonCopy(site.payload, "bonus_btn") ?? "",
});

const buildRedeployFields = (site: WebsiteDetailRecord): RedeployFields => ({
  publisher: site.publisher ?? site.domain ?? "",
  brand_full: site.brand_full ?? site.brand ?? "",
  brand_key: site.brand_key ?? site.pretty_link ?? "",
  target_site: site.target_site ?? site.domain ?? "",
  style: site.style ?? "",
  pretty_link: site.pretty_link ?? "",
  locale: site.locale ?? "",
  logo: site.logo ?? "",
  banner: site.banner ?? "",
  banner_mobile: site.banner_mobile ?? "",
  image_1: site.image_1 ?? "",
  image_2: site.image_2 ?? "",
  image_3: site.image_3 ?? "",
  image_4: site.image_4 ?? "",
  favicon: site.favicon ?? "",
  login_button_text: site.login_button_text ?? extractButtonCopy(site.payload, "login_btn") ?? "",
  register_button_text: site.register_button_text ?? extractButtonCopy(site.payload, "register_btn") ?? "",
  bonus_button_text: site.bonus_button_text ?? extractButtonCopy(site.payload, "bonus_btn") ?? "",
});

const REDEPLOY_REQUIRED_FIELDS: Array<keyof RedeployFields> = [
  "publisher",
  "brand_full",
  "brand_key",
  "target_site",
  "style",
];

const REDEPLOY_MEDIA_FIELDS: Array<{ key: keyof RedeployFields; label: string }> = [
  { key: "favicon", label: "Favicon" },
  { key: "logo", label: "Лого" },
  { key: "banner", label: "Банер" },
  { key: "banner_mobile", label: "Банер Мобільний" },
  { key: "image_1", label: "Зображення 1" },
  { key: "image_2", label: "Зображення 2" },
  { key: "image_3", label: "Зображення 3" },
  { key: "image_4", label: "Зображення 4" },
];

export function WebsiteDetailTabs({
  site,
  history,
  adminUrl,
  siteUrl,
  statusDisplay,
  environmentLabel,
  isAdmin,
  umamiUrl,
}: WebsiteDetailTabsProps) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [globalFields, setGlobalFields] = useState<GlobalFields>(() => buildGlobalFields(site));
  const [buttonCopy, setButtonCopy] = useState<ButtonCopyState>(() => buildButtonCopy(site));
  const [siteframeValue, setSiteframeValue] = useState(site.payload ?? "");
  const [globalDirty, setGlobalDirty] = useState(false);
  const [siteframeDirty, setSiteframeDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; target: ActionTarget | null }>({ open: false, target: null });
  const [regenerationFields, setRegenerationFields] = useState<RegenerationFields>(() => buildRegenerationFields(site));
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [redeployFields, setRedeployFields] = useState<RedeployFields>(() => buildRedeployFields(site));
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [redeployMessage, setRedeployMessage] = useState<string | null>(null);
  const [redeployError, setRedeployError] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableMessage, setDisableMessage] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [showAnalyticsSettings, setShowAnalyticsSettings] = useState(false);
  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Привіт! Я ваш ШІ-асистент. Я можу допомогти вам налаштувати цей сайт. Що ви хочете змінити?",
    },
  ]);
  
  const [processingState, setProcessingState] = useState<{
    isOpen: boolean;
    step: number;
    message: string;
    status: "idle" | "processing" | "success" | "error";
    error?: string;
  }>({
    isOpen: false,
    step: 0,
    message: "",
    status: "idle",
  });

  const isSiteframeTab = activeTab === "edit-siteframe-raw" || activeTab === "edit-siteframe-structured";
  const siteframeMode: "raw" | "structured" | null = activeTab === "edit-siteframe-raw" ? "raw" : activeTab === "edit-siteframe-structured" ? "structured" : null;

  useEffect(() => {
    setGlobalFields(buildGlobalFields(site));
    setButtonCopy(buildButtonCopy(site));
    setGlobalDirty(false);
    setRegenerationFields(buildRegenerationFields(site));
    setRedeployFields(buildRedeployFields(site));
    setRedeployMessage(null);
    setRedeployError(null);
    setDisableMessage(null);
    setDisableError(null);
    setIsDisabling(false);
    setShowAnalyticsSettings(false);
    setAiMessages([
      {
        role: "assistant",
        content: "Привіт! Я ваш ШІ-асистент. Я можу допомогти вам налаштувати цей сайт. Що ви хочете змінити?",
      },
    ]);
  }, [site]);

  useEffect(() => {
    setSiteframeValue(site.payload ?? "");
    setSiteframeDirty(false);
  }, [site.payload]);

  const updateWebhookUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE;
    if (base) {
      try {
        const normalizedBase = base.endsWith("/") ? base : `${base}/`;
        return new URL("webhook/update-website", normalizedBase).toString();
      } catch (error) {
        console.warn("Invalid NEXT_PUBLIC_N8N_WEBHOOK_BASE", error);
      }
    }
    return "https://n8n.onepunch.team/webhook/update-website";
  }, []);

  const regenerateWebhookUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE;
    if (base) {
      try {
        const normalizedBase = base.endsWith("/") ? base : `${base}/`;
        return new URL("webhook/regenerate-website", normalizedBase).toString();
      } catch (error) {
        console.warn("Invalid NEXT_PUBLIC_N8N_WEBHOOK_BASE", error);
      }
    }
    return "https://n8n.onepunch.team/webhook/regenerate-website";
  }, []);

  const redeployWebhookUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE;
    if (base) {
      try {
        const normalizedBase = base.endsWith("/") ? base : `${base}/`;
        return new URL("webhook/redeploy-website", normalizedBase).toString();
      } catch (error) {
        console.warn("Invalid NEXT_PUBLIC_N8N_WEBHOOK_BASE", error);
      }
    }
    return "https://n8n.onepunch.team/webhook/redeploy-website";
  }, []);

  const disableWebhookUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE;
    if (base) {
      try {
        const normalizedBase = base.endsWith("/") ? base : `${base}/`;
        return new URL("webhook/disable-website", normalizedBase).toString();
      } catch (error) {
        console.warn("Invalid NEXT_PUBLIC_N8N_WEBHOOK_BASE", error);
      }
    }
    return "https://n8n.onepunch.team/webhook/disable-website";
  }, []);

  const getWebhookUrlForTarget = (target: ActionTarget) => {
    if (target === "regenerate") {
      return regenerateWebhookUrl;
    }
    if (target === "redeploy") {
      return redeployWebhookUrl;
    }
    if (target === "disable") {
      return disableWebhookUrl;
    }
    return updateWebhookUrl;
  };

  const getWebhookHost = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const saveTarget: SaveTarget | null = (activeTab === "edit-global") ? "global" : isSiteframeTab ? "siteframe" : activeTab === "ai-assistant" ? "mixed" : null;
  const disableSave = !saveTarget || isSaving || (saveTarget === "global" ? !globalDirty : saveTarget === "siteframe" ? !siteframeDirty : (!globalDirty && !siteframeDirty));
  const resetRegenerationStatus = () => {
    setRegenerateMessage(null);
    setRegenerateError(null);
  };

  const resetStatus = () => {
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleGlobalFieldChange = (key: keyof GlobalFields, value: string) => {
    setGlobalFields((prev) => ({ ...prev, [key]: value }));
    setGlobalDirty(true);
    resetStatus();
  };

  const handleButtonCopyChange = (token: ButtonTokenId, value: string) => {
    setButtonCopy((prev) => ({ ...prev, [token]: value }));
    setGlobalDirty(true);
    resetStatus();
  };

  const handlePayloadChange = (value: string) => {
    setSiteframeValue(value);
    setSiteframeDirty(true);
    resetStatus();
  };

  const handleRegenerationFieldChange = (key: keyof RegenerationFields, value: string) => {
    setRegenerationFields((prev) => ({ ...(prev ?? buildRegenerationFields(site)), [key]: value }));
    resetRegenerationStatus();
  };

  const getRegenerationField = (key: keyof RegenerationFields) => regenerationFields?.[key] ?? "";

  const handleRedeployFieldChange = (key: keyof RedeployFields, value: string) => {
    setRedeployFields((prev) => ({ ...prev, [key]: value }));
    setRedeployMessage(null);
    setRedeployError(null);
  };

  const getRedeployField = (key: keyof RedeployFields) => redeployFields?.[key] ?? "";

  const persistRegenerationSnapshot = async (snapshot: Record<string, string | null>) => {
    try {
      const response = await fetch(`/api/websites/${site.uuid}/regeneration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.warn("Не вдалося зберегти дані перегенерації:", errorText);
      }
    } catch (error) {
      console.warn("Помилка під час збереження даних перегенерації", error);
    }
  };

  const handleSaveClick = () => {
    if (!saveTarget) {
      return;
    }
    setConfirmState({ open: true, target: saveTarget });
  };

  const handleRegenerationClick = () => {
    setConfirmState({ open: true, target: "regenerate" });
  };

  const closeConfirm = () => setConfirmState({ open: false, target: null });

  const handleConfirmSave = async () => {
    if (!confirmState.target) {
      return;
    }
    const target = confirmState.target;
    const webhookUrl = getWebhookUrlForTarget(target);

    if (target === "redeploy") {
      setIsRedeploying(true);
      setRedeployError(null);
      setRedeployMessage(null);
      const trimOrNull = (value: string) => {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      };
      try {
        const missing = REDEPLOY_REQUIRED_FIELDS.filter((field) => !redeployFields[field].trim());
        if (missing.length) {
          throw new Error("Заповніть всі обовʼязкові поля перед запуском.");
        }

        const body = {
          domain: trimOrNull(globalFields.domain) ?? site.domain ?? null,
          website_uuid: site.uuid,
          api_key: site.api_key ?? null,
          app_uuid: site.app_uuid ?? null,
          ...Object.fromEntries(Object.entries(redeployFields).map(([key, value]) => [key, trimOrNull(value as string)])),
        };

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Не вдалося відправити запит на редеплой.");
        }

        setRedeployMessage("Запит на редеплой надіслано. Сайт буде пересозданий.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Сталася невідома помилка.";
        setRedeployError(message);
      } finally {
        setIsRedeploying(false);
        setConfirmState({ open: false, target: null });
      }
      return;
    }

    if (target === "disable") {
      setIsDisabling(true);
      setDisableError(null);
      setDisableMessage(null);
      try {
        if (!site.app_uuid) {
          throw new Error("Цей сайт не має app_uuid. Зверніться до девелопера.");
        }
        const currentDomain = globalFields.domain.trim() ? globalFields.domain.trim() : site.domain ?? null;
        const response = await fetch(webhookUrl, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_uuid: site.app_uuid,
            domain: currentDomain,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Не вдалося вимкнути сайт.");
        }
        setDisableMessage("Запит на вимкнення надіслано. Деплой буде видалений із сервера.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Сталася невідома помилка.";
        setDisableError(message);
      } finally {
        setIsDisabling(false);
        setConfirmState({ open: false, target: null });
      }
      return;
    }

    if (target === "regenerate") {
      setIsRegenerating(true);
      setRegenerateMessage(null);
      setRegenerateError(null);
      try {
        const domainValue = globalFields.domain.trim() ? globalFields.domain.trim() : site.domain ?? "";
        const trimOrNull = (value: string) => {
          const trimmed = value.trim();
          return trimmed.length ? trimmed : null;
        };

        const regenerationPayload = {
          publisher: trimOrNull(getRegenerationField("publisher")),
          brand_full: trimOrNull(getRegenerationField("brand_full")),
          brand_key: trimOrNull(getRegenerationField("brand_key")),
          target_site: trimOrNull(getRegenerationField("target_site")),
          style: trimOrNull(getRegenerationField("style")),
          locale: trimOrNull(getRegenerationField("locale")),
          logo: trimOrNull(getRegenerationField("logo")),
          banner: trimOrNull(getRegenerationField("banner")),
          banner_mobile: trimOrNull(getRegenerationField("banner_mobile")),
          image_1: trimOrNull(getRegenerationField("image_1")),
          image_2: trimOrNull(getRegenerationField("image_2")),
          image_3: trimOrNull(getRegenerationField("image_3")),
          image_4: trimOrNull(getRegenerationField("image_4")),
          favicon: trimOrNull(getRegenerationField("favicon")),
          login_button_text: trimOrNull(getRegenerationField("login_button_text")),
          register_button_text: trimOrNull(getRegenerationField("register_button_text")),
          bonus_button_text: trimOrNull(getRegenerationField("bonus_button_text")),
          brand: trimOrNull(globalFields.brand),
          pretty_link: trimOrNull(globalFields.pretty_link),
        } as const;

        const body = {
          ...regenerationPayload,
          domain: domainValue || null,
          api_key: site.api_key ?? null,
          website_uuid: site.uuid,
        } as const;
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Не вдалося надіслати запит на перегенерацію.");
        }
        setRegenerateMessage("Запит на перегенерацію надіслано.");
        await persistRegenerationSnapshot(regenerationPayload);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Сталася невідома помилка.";
        setRegenerateError(message);
      } finally {
        setIsRegenerating(false);
        setConfirmState({ open: false, target: null });
      }
    } else {
      // New logic for global and siteframe updates
      setConfirmState({ open: false, target: null });
      setProcessingState({
        isOpen: true,
        step: 1,
        message: "Ініціалізація оновлення...",
        status: "processing",
      });

      try {
        const supabase = createSupabaseBrowserClient();
        const domain = globalFields.domain.trim() || site.domain;
        
        if (!domain) {
          throw new Error("Домен не вказано.");
        }

        // Step 1: Set status to updating
        setProcessingState(prev => ({ ...prev, step: 1, message: "Встановлення статусу 'updating'..." }));
        const { error: statusError } = await supabase
          .from("websites")
          .update({ status: "updating" })
          .eq("uuid", site.uuid);
        
        if (statusError) throw new Error(`Помилка оновлення статусу: ${statusError.message}`);

        // Step 2: Save changes to DB
        setProcessingState(prev => ({ ...prev, step: 2, message: "Збереження змін в базу даних..." }));
        
        const updateData: any = {};
        if (target === "global" || target === "mixed") {
          updateData.brand = globalFields.brand;
          updateData.pretty_link = globalFields.pretty_link;
          updateData.logo = globalFields.logo;
          updateData.banner = globalFields.banner;
          updateData.banner_mobile = globalFields.banner_mobile;
          updateData.image_1 = globalFields.image_1;
          updateData.image_2 = globalFields.image_2;
          updateData.image_3 = globalFields.image_3;
          updateData.image_4 = globalFields.image_4;
          updateData.favicon = globalFields.favicon;
          updateData.locale = globalFields.locale;
          updateData.login_button_text = buttonCopy.login_btn;
          updateData.register_button_text = buttonCopy.register_btn;
          updateData.bonus_button_text = buttonCopy.bonus_btn;
          updateData.global_code_after_head_open = globalFields.global_code_after_head_open;
          updateData.global_code_after_body_open = globalFields.global_code_after_body_open;
          updateData.robots_txt = globalFields.robots_txt;
          updateData.htaccess = globalFields.htaccess;
          updateData.redirect_404 = globalFields.redirect_404;
          updateData.spyserp_project_id = globalFields.spyserp_project_id ? Number(globalFields.spyserp_project_id) : null;
          updateData.spyserp_domain_id = globalFields.spyserp_domain_id ? Number(globalFields.spyserp_domain_id) : null;
          updateData.spyserp_folder_name = globalFields.spyserp_folder_name || null;
          updateData.spyserp_valuemetric_id = globalFields.spyserp_valuemetric_id ? Number(globalFields.spyserp_valuemetric_id) : null;
          updateData.spyserp_engine_id = globalFields.spyserp_engine_id ? Number(globalFields.spyserp_engine_id) : null;
          updateData.umami_website_id = globalFields.umami_website_id || null;
          if (globalFields.domain.trim()) updateData.domain = globalFields.domain.trim();
        }
        
        if (target === "siteframe" || target === "mixed") {
          updateData.payload = siteframeValue;
        }

        const { error: saveError } = await supabase
          .from("websites")
          .update(updateData)
          .eq("uuid", site.uuid);

        if (saveError) throw new Error(`Помилка збереження даних: ${saveError.message}`);

        // Step 3: Send request to website
        setProcessingState(prev => ({ ...prev, step: 3, message: "Відправка запиту на сайт..." }));
        
        const syncUrl = `https://${domain}/wp-json/siteframe/v1/sync`;
        const apiKey = site.api_key;

        if (!apiKey) throw new Error("API Key відсутній.");

        const currentGlobal = {
          brand: globalFields.brand || site.brand,
          ref: site.ref,
          logo: globalFields.logo || site.logo,
          banner: globalFields.banner || site.banner,
          banner_mobile: globalFields.banner_mobile || site.banner_mobile,
          login_button_text: buttonCopy.login_btn || site.login_button_text,
          locale: globalFields.locale || site.locale,
          favicon: globalFields.favicon || site.favicon,
          register_button_text: buttonCopy.register_btn || site.register_button_text,
          bonus_button_text: buttonCopy.bonus_btn || site.bonus_button_text,
          image_1: globalFields.image_1 || site.image_1,
          image_2: globalFields.image_2 || site.image_2,
          image_3: globalFields.image_3 || site.image_3,
          image_4: globalFields.image_4 || site.image_4,
          global_code_after_head_open: globalFields.global_code_after_head_open || site.global_code_after_head_open,
          global_code_after_body_open: globalFields.global_code_after_body_open || site.global_code_after_body_open,
        };

        const payloadBody = {
          draft_non_imported: true,
          default_status: "publish",
          pretty_link: globalFields.pretty_link || site.pretty_link,
          payload: (target === "siteframe" || target === "mixed") ? siteframeValue : (site.payload || ""),
          global_options: currentGlobal,
          robots_txt: globalFields.robots_txt,
          htaccess: globalFields.htaccess,
          redirect_404: globalFields.redirect_404
        };

        const response = await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payloadBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Помилка синхронізації: ${response.status} ${errorText}`);
        }

        // Step 4: Set status to active
        setProcessingState(prev => ({ ...prev, step: 4, message: "Завершення..." }));
        const { error: finalStatusError } = await supabase
          .from("websites")
          .update({ status: "active" })
          .eq("uuid", site.uuid);

        if (finalStatusError) throw new Error(`Помилка встановлення статусу active: ${finalStatusError.message}`);

        setProcessingState(prev => ({ ...prev, status: "success", message: "Оновлення успішно завершено!" }));
        
        if (target === "global" || target === "mixed") setGlobalDirty(false);
        if (target === "siteframe" || target === "mixed") setSiteframeDirty(false);

      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setProcessingState(prev => ({ ...prev, status: "error", error: message, message: "Сталася помилка" }));
        
        const supabase = createSupabaseBrowserClient();
        await supabase.from("websites").update({ status: "error" }).eq("uuid", site.uuid);
      }
    }
  };

  const handleRedeploySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = REDEPLOY_REQUIRED_FIELDS.filter((field) => !redeployFields[field].trim());
    if (missing.length) {
      setRedeployError("Заповніть всі обовʼязкові поля перед запуском.");
      return;
    }
    setRedeployError(null);
    setRedeployMessage(null);
    setConfirmState({ open: true, target: "redeploy" });
  };

  const handleDisableClick = () => {
    if (!site.app_uuid) {
      setDisableMessage(null);
      setDisableError("Цей сайт не має app_uuid, тому вимкнути його неможливо.");
      return;
    }
    setDisableError(null);
    setDisableMessage(null);
    setConfirmState({ open: true, target: "disable" });
  };

  const statusHint = (() => {
    if (saveMessage) {
      return { text: saveMessage, tone: "success" as const };
    }
    if (saveError) {
      return { text: saveError, tone: "error" as const };
    }
    if (!saveTarget) {
      return {
        text: "Перейдіть до вкладок «Глобальні поля» або «Siteframe», щоб надіслати зміни.",
        tone: "muted" as const,
      };
    }
    if (saveTarget === "global") {
      return {
        text: globalDirty ? "Зміни у глобальних полях ще не надіслані." : "Немає нових змін у глобальних полях.",
        tone: globalDirty ? "warning" : "muted",
      } as const;
    }
    return {
      text: siteframeDirty ? "Оновлений Siteframe ще не надіслано." : "Немає нових змін у Siteframe.",
      tone: siteframeDirty ? "warning" : "muted",
    } as const;
  })();

  const statusToneClass =
    statusHint.tone === "success"
      ? "text-emerald-300"
      : statusHint.tone === "error"
        ? "text-red-400"
        : statusHint.tone === "warning"
          ? "text-amber-200"
          : "text-slate-500";

  const disableStatusTone = disableError ? "text-red-400" : disableMessage ? "text-emerald-300" : "text-slate-500";

  const getConfirmDescription = (target: ActionTarget | null) => {
    if (!target) {
      return "";
    }
    if (target === "global") {
      return "відправити глобальні поля";
    }
    if (target === "siteframe") {
      return "відправити Siteframe payload";
    }
    if (target === "mixed") {
      return "відправити всі зміни (глобальні поля та Siteframe)";
    }
    if (target === "regenerate") {
      return "запустити повну перегенерацію";
    }
    if (target === "redeploy") {
      return "запустити редеплой (вилучення та пересоздання сайту)";
    }
    return "вимкнути сайт та видалити додаток із сервера";
  };

  const getConfirmPrimaryLabel = (target: ActionTarget | null) => {
    if (!target) {
      return "";
    }
    if (target === "regenerate" || target === "redeploy") {
      const isBusy = target === "regenerate" ? isRegenerating : isRedeploying;
      return isBusy ? "Запуск…" : "Підтвердити";
    }
    if (target === "disable") {
      return isDisabling ? "Надсилання…" : "Вимкнути";
    }
    return isSaving ? "Надсилання…" : "Підтвердити";
  };

  const isConfirmBusy = (target: ActionTarget | null) => {
    if (!target) {
      return false;
    }
    if (target === "regenerate") {
      return isRegenerating;
    }
    if (target === "redeploy") {
      return isRedeploying;
    }
    if (target === "disable") {
      return isDisabling;
    }
    return isSaving;
  };

  const renderNavButton = (item: NavItem, options?: { isSub?: boolean; tone?: "default" | "warning" }) => {
    const { isSub = false, tone = "default" } = options ?? {};
    const isActive = activeTab === item.id;
    const toneClasses = tone === "warning"
      ? {
          active: "border-amber-300/70 bg-amber-500/20 text-white shadow-[0_0_20px_rgba(251,191,36,0.25)]",
          inactive: "border-amber-200/40 bg-transparent text-amber-50 hover:border-amber-200/60",
        }
      : {
          active: "border-sky-400/60 bg-sky-500/15 text-white shadow-[0_0_20px_rgba(14,165,233,0.2)]",
          inactive: "border-white/5 bg-transparent text-slate-300 hover:border-white/15",
        };
    return (
      <button
        key={item.id}
        type="button"
        aria-current={isActive ? "page" : undefined}
        onClick={() => setActiveTab(item.id)}
        className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
          isActive ? toneClasses.active : toneClasses.inactive
        } ${isSub ? "pl-6" : ""}`}
      >
        <p>{item.label}</p>
      </button>
    );
  };

  const statCards = useMemo(
    () => [
      { label: "Статус", value: statusDisplay },
      { label: "Середовище", value: environmentLabel },
      { label: "Сервер UUID", value: site.server_uuid ?? "немає" },
      { label: "Оновлено", value: formatDate(site.updated_at) },
    ],
    [environmentLabel, site.server_uuid, site.updated_at, statusDisplay]
  );

  const renderAuth = () => (
    <Card>
      <CardHeader>
        <FieldLabel>Авторизація</FieldLabel>
        <CardTitle className="text-lg font-semibold text-white">Параметри доступу</CardTitle>
        <p className="text-xs text-slate-400">Використовуйте ці дані для входу до адмін-панелі та інтеграції.</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-200">
        <p>
          Адмін-панель:
          {" "}
          {adminUrl ? (
            <a href={adminUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline">
              {adminUrl}
            </a>
          ) : (
            "не встановлено"
          )}
        </p>
        <p>Логін: {site.admin_user ?? "не встановлено"}</p>
        <p>Пароль: {site.admin_password ?? "не встановлено"}</p>
        <p>API-ключ: {site.api_key ?? "не встановлено"}</p>
        <p>Ref: {site.ref ?? "не встановлено"}</p>
      </CardContent>
    </Card>
  );

  const handleRollback = (entryData: Record<string, unknown>) => {
    if (!confirm("Ви впевнені, що хочете відновити цю версію? Поточні незбережені зміни будуть втрачені.")) {
      return;
    }

    // Restore Global Fields
    const newGlobalFields: GlobalFields = { ...globalFields };
    
    const setIfString = (key: keyof GlobalFields) => {
      if (typeof entryData[key] === 'string') {
        (newGlobalFields as any)[key] = entryData[key] as string;
      } else if (entryData[key] === null) {
         (newGlobalFields as any)[key] = "";
      }
    };

    setIfString("brand");
    setIfString("pretty_link");
    setIfString("domain");
    setIfString("ref");
    setIfString("logo");
    setIfString("banner");
    setIfString("banner_mobile");
    setIfString("image_1");
    setIfString("image_2");
    setIfString("image_3");
    setIfString("image_4");
    setIfString("locale");
    setIfString("favicon");
    setIfString("global_code_after_head_open");
    setIfString("global_code_after_body_open");
    setIfString("robots_txt");
    setIfString("htaccess");
    
    if (typeof entryData.redirect_404 === 'boolean') {
        newGlobalFields.redirect_404 = entryData.redirect_404;
    }

    setGlobalFields(newGlobalFields);
    setGlobalDirty(true);

    // Restore Button Copy
    const newButtonCopy = { ...buttonCopy };
    if (typeof entryData.login_button_text === 'string') newButtonCopy.login_btn = entryData.login_button_text;
    if (typeof entryData.register_button_text === 'string') newButtonCopy.register_btn = entryData.register_button_text;
    if (typeof entryData.bonus_button_text === 'string') newButtonCopy.bonus_btn = entryData.bonus_button_text;
    setButtonCopy(newButtonCopy);

    // Restore Siteframe
    if (typeof entryData.payload === 'string') {
      setSiteframeValue(entryData.payload);
      setSiteframeDirty(true);
    }

    alert("Дані завантажено з історії. Перейдіть на відповідні вкладки, перевірте та збережіть зміни.");
  };

  const renderHistory = () => (
    <Card>
      <CardHeader>
        <FieldLabel>Історія</FieldLabel>
        <CardTitle className="text-lg font-semibold text-white">Збережені зміни</CardTitle>
        <p className="text-xs text-slate-400">Останні 12 записів з `websites_history`.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!history.length && <p className="text-sm text-slate-500">Ще немає записів в історії.</p>}
        {history.map((entry) => (
          <article key={entry.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Зміни від {formatDate(entry.changed_at)} UTC</p>
              <Button
                variant="ghost"
                onClick={() => handleRollback(entry.data)}
                className="h-7 px-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
              >
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Відновити цю версію
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {entry.fields.map((field, index) => {
                const truncatedValue = field.value.length > 500 ? `${field.value.slice(0, 500)}…` : field.value;
                return (
                  <div
                    key={`${entry.id}-${field.key}-${index}`}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      field.changed 
                        ? "border-emerald-500/50 bg-emerald-900/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]" 
                        : "border-slate-800/70 bg-slate-900/70 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-[11px] uppercase tracking-[0.2em] ${field.changed ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                        {field.key}
                      </p>
                      {field.changed && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                          Змінено
                        </span>
                      )}
                    </div>
                    <p className={`whitespace-pre-wrap break-words text-sm ${field.changed ? "text-white" : "text-slate-300"}`}>
                      {truncatedValue}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );

  const renderEditGlobal = () => (
    <Card>
      <CardHeader>
        <FieldLabel>Глобальні поля</FieldLabel>
        <CardTitle className="text-lg font-semibold text-white">Брендинг та посилання</CardTitle>
        <CardDescription>
          Дані відображаються напряму з таблиці `websites`. Оновлення відбудеться після інтеграції з API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs font-semibold text-slate-400">
            Назва бренду
            <Input value={globalFields.brand} onChange={(event) => handleGlobalFieldChange("brand", event.target.value)} placeholder="Bizzo" />
          </label>
          {isAdmin && (
          <label className="space-y-2 text-xs font-semibold text-slate-400">
            Красиве посилання
            <Input value={globalFields.pretty_link} onChange={(event) => handleGlobalFieldChange("pretty_link", event.target.value)} placeholder="casino.brand" />
          </label>
          )}
          <label className="space-y-2 text-xs font-semibold text-slate-400">
            Основний домен
            <Input value={globalFields.domain} onChange={(event) => handleGlobalFieldChange("domain", event.target.value)} placeholder="brand.com" />
          </label>
          <label className="space-y-2 text-xs font-semibold text-slate-400">
            Локаль інтерфейсу
            <Input value={globalFields.locale} onChange={(event) => handleGlobalFieldChange("locale", event.target.value)} placeholder="uk-UA" />
          </label>
          <label className="space-y-2 text-xs font-semibold text-slate-400">
            Tracking ref
            <Input value={globalFields.ref} onChange={(event) => handleGlobalFieldChange("ref", event.target.value)} placeholder="https://partners.brand.com/?ref=..." />
          </label>
        </div>
        <div className="space-y-3">
          <FieldLabel>Global Code Injection</FieldLabel>
          <div className="grid gap-4 md:grid-cols-1">
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
              Code after &lt;head&gt; open
              <Textarea 
                value={globalFields.global_code_after_head_open} 
                onChange={(event) => handleGlobalFieldChange("global_code_after_head_open", event.target.value)} 
                rows={4} 
                placeholder="<script>...</script>" 
                className="min-h-[100px] w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
              Code after &lt;body&gt; open
              <Textarea 
                value={globalFields.global_code_after_body_open} 
                onChange={(event) => handleGlobalFieldChange("global_code_after_body_open", event.target.value)} 
                rows={4} 
                placeholder="<noscript>...</noscript>" 
                className="min-h-[100px] w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              />
            </label>
          </div>
        </div>
        <div className="space-y-3">
          <FieldLabel>Медіа</FieldLabel>
          <div className="grid gap-4 md:grid-cols-2">
            <MediaUploadInput websiteUuid={site.uuid}
              label="Favicon"
              value={globalFields.favicon}
              onChange={(val) => handleGlobalFieldChange("favicon", val)}
              placeholder="https://cdn.brand.com/favicon.png"
              pathPrefix={`${site.uuid}-favicon`}
            />
            <MediaUploadInput websiteUuid={site.uuid}
              label="Логотип URL"
              value={globalFields.logo}
              onChange={(val) => handleGlobalFieldChange("logo", val)}
              placeholder="https://cdn.brand.com/logo.svg"
              pathPrefix={`${site.uuid}-logo`}
            />
            <MediaUploadInput websiteUuid={site.uuid}
              label="Банер Hero"
              value={globalFields.banner}
              onChange={(val) => handleGlobalFieldChange("banner", val)}
              placeholder="https://cdn.brand.com/hero.png"
              pathPrefix={`${site.uuid}-banner`}
            />
            <MediaUploadInput websiteUuid={site.uuid}
              label="Банер Hero (Mobile)"
              value={globalFields.banner_mobile}
              onChange={(val) => handleGlobalFieldChange("banner_mobile", val)}
              placeholder="https://cdn.brand.com/hero-mobile.png"
              pathPrefix={`${site.uuid}-banner-mobile`}
            />
            <MediaUploadInput websiteUuid={site.uuid}
              label="Зображення 1"
              value={globalFields.image_1}
              onChange={(val) => handleGlobalFieldChange("image_1", val)}
              placeholder="https://cdn.brand.com/image1.jpg"
              pathPrefix={`${site.uuid}-image-1`}
            />
            <MediaUploadInput websiteUuid={site.uuid}
              label="Зображення 2"
              value={globalFields.image_2}
              onChange={(val) => handleGlobalFieldChange("image_2", val)}
              placeholder="https://cdn.brand.com/image2.jpg"
              pathPrefix={`${site.uuid}-image-2`}
            />
            <MediaUploadInput websiteUuid={site.uuid}
              label="Зображення 3"
              value={globalFields.image_3}
              onChange={(val) => handleGlobalFieldChange("image_3", val)}
              placeholder="https://cdn.brand.com/image3.jpg"
              pathPrefix={`${site.uuid}-image-3`}
            />
            <MediaUploadInput websiteUuid={site.uuid}
              label="Зображення 4"
              value={globalFields.image_4}
              onChange={(val) => handleGlobalFieldChange("image_4", val)}
              placeholder="https://cdn.brand.com/image4.jpg"
              pathPrefix={`${site.uuid}-image-4`}
            />
          </div>
        </div>
        <div className="space-y-3">
          <FieldLabel>Серверні налаштування</FieldLabel>
          <div className="grid gap-4 md:grid-cols-1">
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
              robots.txt
              <Textarea
                rows={4}
                value={globalFields.robots_txt}
                onChange={(event) => handleGlobalFieldChange("robots_txt", event.target.value)}
                placeholder="User-agent: *&#10;Disallow: /wp-admin/"
                className="min-h-[100px] w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
              .htaccess
              <Textarea
                rows={6}
                value={globalFields.htaccess}
                onChange={(event) => handleGlobalFieldChange("htaccess", event.target.value)}
                placeholder="# BEGIN WordPress..."
                className="min-h-[150px] w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              />
            </label>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="redirect_404"
                checked={globalFields.redirect_404}
                onChange={(e) => {
                  setGlobalFields((prev) => ({ ...prev, redirect_404: e.target.checked }));
                  setGlobalDirty(true);
                }}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
              />
              <label htmlFor="redirect_404" className="text-sm text-slate-300 cursor-pointer select-none">
                Увімкнути редірект 404 помилок на головну
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <FieldLabel>Кнопки</FieldLabel>
          <div className="grid gap-4 md:grid-cols-3">
            {BUTTON_TOKENS.map((button) => (
              <label key={button.token} className="space-y-2 text-xs font-semibold text-slate-400">
                {button.label}
                <Input
                  value={buttonCopy[button.token] ?? ""}
                  onChange={(event) => handleButtonCopyChange(button.token, event.target.value)}
                  placeholder={button.placeholder}
                />
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEditSiteframe = (mode: "raw" | "structured") => (
    <Card>
      <CardHeader>
        <FieldLabel>Siteframe</FieldLabel>
        <CardTitle className="text-lg font-semibold text-white">{mode === "raw" ? "Редактор коду" : "Редактор сторінок"}</CardTitle>
        <CardDescription>
          {mode === "raw"
            ? "Повний payload у стилі VS Code з підсвіткою рядків."
            : "Структурований редактор сторінок, блоків і глобальних частин."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PayloadPreview payload={siteframeValue} onPayloadChange={handlePayloadChange} mode={mode} />
      </CardContent>
    </Card>
  );

  const renderRegeneration = () => {
    const isSubmitDisabled =
      isRegenerating ||
      !getRegenerationField("publisher").trim() ||
      !getRegenerationField("brand_full").trim() ||
      !getRegenerationField("brand_key").trim() ||
      !getRegenerationField("target_site").trim();
    const statusTone = regenerateError
      ? "text-red-400"
      : regenerateMessage
        ? "text-emerald-300"
        : "text-slate-500";
    return (
      <Card>
        <CardHeader>
          <FieldLabel>Перегенерація</FieldLabel>
          <CardTitle className="text-lg font-semibold text-white">Повна перебілдка</CardTitle>
          <CardDescription>Надішліть дані до n8n, щоби перестворити сайт на основі свіжих полів.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs font-semibold text-slate-400">
              Видавець
              <Input
                value={getRegenerationField("publisher")}
                onChange={(event) => handleRegenerationFieldChange("publisher", event.target.value)}
                placeholder="bizzo-casino-pl.com"
              />
            </label>
            <label className="space-y-2 text-xs font-semibold text-slate-400">
              Повна назва бренду
              <Input
                value={getRegenerationField("brand_full")}
                onChange={(event) => handleRegenerationFieldChange("brand_full", event.target.value)}
                placeholder="Bizzo Casino"
              />
            </label>
            <label className="space-y-2 text-xs font-semibold text-slate-400">
              Бренд ключ
              <Input
                value={getRegenerationField("brand_key")}
                onChange={(event) => handleRegenerationFieldChange("brand_key", event.target.value)}
                placeholder="Bizzo"
              />
            </label>
            <label className="space-y-2 text-xs font-semibold text-slate-400">
              Цільовий сайт
              <Input
                value={getRegenerationField("target_site")}
                onChange={(event) => handleRegenerationFieldChange("target_site", event.target.value)}
                placeholder="https://bizzo-casino-pl.com"
              />
            </label>
            <label className="space-y-2 text-xs font-semibold text-slate-400">
              Локаль інтерфейсу
              <Input
                value={getRegenerationField("locale")}
                onChange={(event) => handleRegenerationFieldChange("locale", event.target.value)}
                placeholder={globalFields.locale || "uk-UA"}
              />
            </label>
          </div>
          <label className="space-y-2 text-xs font-semibold text-slate-400 block">
            Стиль
            <Textarea
              value={getRegenerationField("style")}
              onChange={(event) => handleRegenerationFieldChange("style", event.target.value)}
              rows={4}
              placeholder="Темна тема, фон фіолетовий #2В1234, акценти колір жовтий #FDCD0A, кнопки лише зелені linear-gradient(to bottom,#BCFF50,#08B83A). Шрифт Poppins,Arial"
            />
          </label>
          <div className="space-y-3">
            <FieldLabel>Медіа</FieldLabel>
            <div className="grid gap-4 md:grid-cols-2">
              <MediaUploadInput websiteUuid={site.uuid}
                label="Favicon"
                value={getRegenerationField("favicon")}
                onChange={(val) => handleRegenerationFieldChange("favicon", val)}
                placeholder={globalFields.favicon || "https://.../favicon.png"}
                pathPrefix={`${site.uuid}-favicon`}
              />
              <MediaUploadInput websiteUuid={site.uuid}
                label="Лого"
                value={getRegenerationField("logo")}
                onChange={(val) => handleRegenerationFieldChange("logo", val)}
                placeholder={globalFields.logo || "https://.../logo.png"}
                pathPrefix={`${site.uuid}-logo`}
              />
              <MediaUploadInput websiteUuid={site.uuid}
                label="Банер"
                value={getRegenerationField("banner")}
                onChange={(val) => handleRegenerationFieldChange("banner", val)}
                placeholder={globalFields.banner || "https://.../banner.jpg"}
                pathPrefix={`${site.uuid}-banner`}
              />
              <MediaUploadInput websiteUuid={site.uuid}
                label="Банер мобільний"
                value={getRegenerationField("banner_mobile")}
                onChange={(val) => handleRegenerationFieldChange("banner_mobile", val)}
                placeholder={globalFields.banner_mobile || "https://.../banner-mobile.jpg"}
                pathPrefix={`${site.uuid}-banner-mobile`}
              />
              <MediaUploadInput websiteUuid={site.uuid}
                label="Зображення 1"
                value={getRegenerationField("image_1")}
                onChange={(val) => handleRegenerationFieldChange("image_1", val)}
                placeholder={globalFields.image_1 || "https://.../image1.jpg"}
                pathPrefix={`${site.uuid}-image-1`}
              />
              <MediaUploadInput websiteUuid={site.uuid}
                label="Зображення 2"
                value={getRegenerationField("image_2")}
                onChange={(val) => handleRegenerationFieldChange("image_2", val)}
                placeholder={globalFields.image_2 || "https://.../image2.jpg"}
                pathPrefix={`${site.uuid}-image-2`}
              />
              <MediaUploadInput websiteUuid={site.uuid}
                label="Зображення 3"
                value={getRegenerationField("image_3")}
                onChange={(val) => handleRegenerationFieldChange("image_3", val)}
                placeholder={globalFields.image_3 || "https://.../image3.jpg"}
                pathPrefix={`${site.uuid}-image-3`}
              />
              <MediaUploadInput websiteUuid={site.uuid}
                label="Зображення 4"
                value={getRegenerationField("image_4")}
                onChange={(val) => handleRegenerationFieldChange("image_4", val)}
                placeholder={globalFields.image_4 || "https://.../image4.jpg"}
                pathPrefix={`${site.uuid}-image-4`}
              />
            </div>
          </div>
          <div className="space-y-3">
            <FieldLabel>Кнопки</FieldLabel>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Кнопка Вхід Текст
                <Input
                  value={getRegenerationField("login_button_text")}
                  onChange={(event) => handleRegenerationFieldChange("login_button_text", event.target.value)}
                  placeholder={buttonCopy.login_btn || "Увійти"}
                />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Кнопка Реєстрація Текст
                <Input
                  value={getRegenerationField("register_button_text")}
                  onChange={(event) => handleRegenerationFieldChange("register_button_text", event.target.value)}
                  placeholder={buttonCopy.register_btn || "Реєстрація"}
                />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Кнопка Бонус Текст
                <Input
                  value={getRegenerationField("bonus_button_text")}
                  onChange={(event) => handleRegenerationFieldChange("bonus_button_text", event.target.value)}
                  placeholder={buttonCopy.bonus_btn || "Отримати бонус"}
                />
              </label>
            </div>
          </div>
          <div className="space-y-2 sm:flex sm:items-center sm:gap-4 sm:space-y-0">
            <Button type="button" onClick={handleRegenerationClick} disabled={isSubmitDisabled} className="w-full sm:w-auto">
              {isRegenerating ? "Запуск…" : "Запустити перегенерацію"}
            </Button>
            <p className={`text-xs ${statusTone}`}>
              {regenerateError || regenerateMessage || "Перевірте дані та підтвердіть перед запуском."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRedeploy = () => {
    const missingRequired = REDEPLOY_REQUIRED_FIELDS.filter((field) => !redeployFields[field].trim());
    const disableSubmit = isRedeploying || missingRequired.length > 0;
    const statusTone = redeployError ? "text-red-400" : redeployMessage ? "text-emerald-300" : "text-slate-500";

    return (
      <Card>
        <CardHeader>
          <FieldLabel>Редеплой</FieldLabel>
          <CardTitle className="text-lg font-semibold text-white">Повторне створення сайту</CardTitle>
          <CardDescription>
            Сервіс видалить поточний деплой і створить сайт заново. Поля нижче повторюють форму створення сайту, окрім домену –
            використовуємо {globalFields.domain || site.domain || "вказаний домен"}.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-6" onSubmit={handleRedeploySubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Видавець
                <Input
                  value={getRedeployField("publisher")}
                  onChange={(event) => handleRedeployFieldChange("publisher", event.target.value)}
                  placeholder="bizzo-casino-pl.com"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Повна назва бренду
                <Input
                  value={getRedeployField("brand_full")}
                  onChange={(event) => handleRedeployFieldChange("brand_full", event.target.value)}
                  placeholder="Bizzo Casino"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Бренд ключ
                <Input
                  value={getRedeployField("brand_key")}
                  onChange={(event) => handleRedeployFieldChange("brand_key", event.target.value)}
                  placeholder="Bizzo"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Цільовий сайт
                <Input
                  value={getRedeployField("target_site")}
                  onChange={(event) => handleRedeployFieldChange("target_site", event.target.value)}
                  placeholder="https://bizzo-casino-pl.com"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Реферальне посилання
                <Input
                  value={getRedeployField("pretty_link")}
                  onChange={(event) => handleRedeployFieldChange("pretty_link", event.target.value)}
                  placeholder="https://partners.brand.com/?ref=123"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Локаль інтерфейсу
                <Input
                  value={getRedeployField("locale")}
                  onChange={(event) => handleRedeployFieldChange("locale", event.target.value)}
                  placeholder={globalFields.locale || "uk-UA"}
                />
              </label>
            </div>

            <label className="space-y-2 text-xs font-semibold text-slate-400 block">
              Стиль
              <Textarea
                rows={4}
                value={getRedeployField("style")}
                onChange={(event) => handleRedeployFieldChange("style", event.target.value)}
                placeholder="Темна тема, фон фіолетовий #2B1234, акценти жовті #FDCD0A..."
              />
            </label>

            <div className="space-y-3">
              <FieldLabel>Медіа</FieldLabel>
              <div className="grid gap-4 md:grid-cols-2">
                {REDEPLOY_MEDIA_FIELDS.map(({ key, label }) => (
                  <MediaUploadInput websiteUuid={site.uuid}
                    key={key}
                    label={label}
                    value={getRedeployField(key)}
                    onChange={(val) => handleRedeployFieldChange(key, val)}
                    placeholder={String(globalFields[key as keyof GlobalFields] || `https://cdn.site/${String(key)}.jpg`)}
                    pathPrefix={`${site.uuid}-redeploy-${String(key)}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <FieldLabel>Кнопки</FieldLabel>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Кнопка Вхід Текст
                  <Input
                    value={getRedeployField("login_button_text")}
                    onChange={(event) => handleRedeployFieldChange("login_button_text", event.target.value)}
                    placeholder={buttonCopy.login_btn || "Увійти"}
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Кнопка Реєстрація Текст
                  <Input
                    value={getRedeployField("register_button_text")}
                    onChange={(event) => handleRedeployFieldChange("register_button_text", event.target.value)}
                    placeholder={buttonCopy.register_btn || "Реєстрація"}
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Кнопка Бонус Текст
                  <Input
                    value={getRedeployField("bonus_button_text")}
                    onChange={(event) => handleRedeployFieldChange("bonus_button_text", event.target.value)}
                    placeholder={buttonCopy.bonus_btn || "Отримати бонус"}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <Button type="submit" disabled={disableSubmit || isRedeploying} className="w-full sm:w-auto">
                {isRedeploying ? "Надсилання…" : "Запустити редеплой"}
              </Button>
              {missingRequired.length > 0 && !isRedeploying && (
                <p className="text-xs text-amber-200">Заповніть усі обовʼязкові поля, виділені у верхній секції.</p>
              )}
              <p className={`text-xs ${statusTone}`}>
                {redeployError || redeployMessage || "Дані підуть до n8n для повного перестворення сайту."}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {statCards.map((stat) => (
          <Card key={stat.label} className="rounded-3xl border border-white/5 bg-white/[0.03]">
            <CardContent className="pt-6">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
              <p className="truncate text-lg font-semibold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <FieldLabel>Швидкі шорткоди</FieldLabel>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {DASHBOARD_CARDS.filter((card) => isAdmin || card.id !== "auth").map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveTab(card.id)}
                className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-slate-900/40 p-4 text-left transition hover:border-white/30"
              >
                <span className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${card.accent}`} />
                <span className="relative">
                  <p className="text-sm font-semibold text-white">{card.title}</p>
                  <p className="text-xs text-slate-300">{card.description}</p>
                  <span className="mt-6 inline-flex items-center text-xs font-semibold text-amber-200">
                    Відкрити
                    <svg className="ml-1 h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <FieldLabel>Посилання</FieldLabel>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-200">
            <p>
              Основне:
              {" "}
              {siteUrl ? (
                <a href={siteUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline">
                  {siteUrl}
                </a>
              ) : (
                "невідоме"
              )}
            </p>
            <p>Сервер UUID: {site.server_uuid ?? "немає"}</p>
            <p>Створено: {formatDate(site.created_at)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalytics = () => {
    if (showAnalyticsSettings) {
      return (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-slate-200">Налаштування Аналітики</CardTitle>
              <CardDescription>Налаштуйте підключення до Umami та SpySERP.</CardDescription>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowAnalyticsSettings(false)}
              className="text-slate-400 hover:text-slate-100"
            >
              Назад
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-200">SpySERP</h3>
              <SpySerpMasterSetup
                onComplete={(data) => {
                  setGlobalFields((prev) => ({
                    ...prev,
                    spyserp_project_id: data.projectId,
                    spyserp_domain_id: data.domainId,
                    spyserp_engine_id: data.engineId,
                    spyserp_valuemetric_id: data.valuemetricId,
                  }));
                  setGlobalDirty(true);
                }}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Project ID
                  <Input
                    value={globalFields.spyserp_project_id}
                    onChange={(e) => handleGlobalFieldChange("spyserp_project_id", e.target.value)}
                    placeholder="142194"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Domain ID
                  <Input
                    value={globalFields.spyserp_domain_id}
                    onChange={(e) => handleGlobalFieldChange("spyserp_domain_id", e.target.value)}
                    placeholder="30171708"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Folder Name
                  <Input
                    value={globalFields.spyserp_folder_name}
                    onChange={(e) => handleGlobalFieldChange("spyserp_folder_name", e.target.value)}
                    placeholder="UK"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Value Metric ID
                  <Input
                    value={globalFields.spyserp_valuemetric_id}
                    onChange={(e) => handleGlobalFieldChange("spyserp_valuemetric_id", e.target.value)}
                    placeholder="866344"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Engine ID
                  <Input
                    value={globalFields.spyserp_engine_id}
                    onChange={(e) => handleGlobalFieldChange("spyserp_engine_id", e.target.value)}
                    placeholder="16335"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-medium text-slate-200">Umami Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Website ID
                  <Input
                    value={globalFields.umami_website_id}
                    onChange={(e) => handleGlobalFieldChange("umami_website_id", e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveClick} disabled={!globalDirty || isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Зберегти налаштування
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {globalFields.spyserp_project_id && (
            <a
              href={`https://spyserp.com/app/8556bee8/#project/${globalFields.spyserp_project_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-800 text-slate-200 hover:bg-slate-700 h-9 px-4 py-2"
            >
              Відкрити SpySERP
            </a>
          )}
          {globalFields.umami_website_id && (
            <a
              href={`${umamiUrl}/websites/${globalFields.umami_website_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-800 text-slate-200 hover:bg-slate-700 h-9 px-4 py-2"
            >
              Відкрити Umami
            </a>
          )}
        </div>

        {globalFields.umami_website_id ? (
          <UmamiStats websiteId={globalFields.umami_website_id} />
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="flex flex-col items-center justify-center h-[300px] space-y-4">
              <p className="text-slate-400">Аналітика не налаштована</p>
              <Button onClick={() => setShowAnalyticsSettings(true)}>
                Налаштувати
              </Button>
            </CardContent>
          </Card>
        )}
        <SeoPositions websiteUuid={site.uuid} />
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === "analytics") {
      return renderAnalytics();
    }
    if (activeTab === "ai-assistant") {
      // Merge global fields and button copy for AI context
      const aiContextFields = {
        ...globalFields,
        login_button_text: buttonCopy.login_btn,
        register_button_text: buttonCopy.register_btn,
        bonus_button_text: buttonCopy.bonus_btn,
      };

      return (
        <Card className="h-[800px] overflow-hidden border-0 bg-slate-900/50">
          <AiAssistant
            messages={aiMessages}
            setMessages={setAiMessages}
            globalFields={aiContextFields}
            setGlobalFields={(fields) => {
              // Separate button fields from standard global fields
              const { 
                login_button_text, 
                register_button_text, 
                bonus_button_text, 
                ...restGlobalFields 
              } = fields;

              // Update Global Fields State
              // We need to be careful not to overwrite with undefined if the AI didn't send them back, 
              // but the AI usually sends back a patch or the whole object. 
              // The AiAssistant component does: setGlobalFields({ ...globalFields, ...args });
              // So 'fields' here is the NEW complete state.
              
              // However, 'restGlobalFields' might contain extra keys if we are not careful, 
              // but GlobalFields type is strict in this file? No, it's a type alias.
              // We should cast or ensure we only update known fields if we want to be safe,
              // but for now let's trust the AI sends valid keys or we just store them.
              // Actually, setGlobalFields expects the exact GlobalFields type.
              // We need to construct a valid GlobalFields object.
              
              setGlobalFields((prev) => ({
                ...prev,
                ...(restGlobalFields as any),
              }));

              // Update Button Copy State
              setButtonCopy((prev) => ({
                ...prev,
                ...(typeof login_button_text === 'string' && { login_btn: login_button_text }),
                ...(typeof register_button_text === 'string' && { register_btn: register_button_text }),
                ...(typeof bonus_button_text === 'string' && { bonus_btn: bonus_button_text }),
              }));

              setGlobalDirty(true);
            }}
            siteframeContent={siteframeValue}
            setSiteframeContent={(content) => {
              setSiteframeValue(content);
              setSiteframeDirty(true);
            }}
          />
        </Card>
      );
    }
    if (activeTab === "auth") {
      return renderAuth();
    }
    if (activeTab === "history") {
      return renderHistory();
    }
    if (activeTab === "edit-global") {
      return renderEditGlobal();
    }
    if (activeTab === "redeploy") {
      return renderRedeploy();
    }
    if (activeTab === "regenerate") {
      return renderRegeneration();
    }
    if (siteframeMode) {
      return renderEditSiteframe(siteframeMode);
    }
    return renderOverview();
  };

  return (
    <div className="flex min-h-screen flex-col text-white lg:flex-row">
      <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-white/10 bg-slate-950/95 text-white lg:flex">
        <div className="space-y-3 border-b border-white/5 px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">OP Tools</p>
          <p className="text-lg font-semibold text-white">{site.domain ?? "Website"}</p>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
          <div className="space-y-2">{CORE_NAV_ITEMS.filter((item) => isAdmin || item.id !== "auth").map((item) => renderNavButton(item))}</div>
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Siteframe</p>
            <div className="mt-3 space-y-2">{SITEFRAME_NAV_ITEMS.map((item) => renderNavButton(item, { isSub: true }))}</div>
          </div>
          {isAdmin && (
            <>
              <div className="rounded-3xl border border-amber-200/40 bg-amber-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-100">Небезпечні дії</p>
                <p className="mt-1 text-xs text-amber-50/80">Запускає повну перебілдку або редеплой.</p>
                <div className="mt-3 space-y-2">{DANGER_NAV_ITEMS.map((item) => renderNavButton(item, { tone: "warning" }))}</div>
              </div>
              <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-red-200">Аварійні дії</p>
                <p className="mt-1 text-xs text-red-100/80">Знімає деплой з сервера та видаляє додаток.</p>
                <button
                  type="button"
                  onClick={handleDisableClick}
                  disabled={isDisabling}
                  className="mt-3 w-full rounded-2xl border border-red-400/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-200/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDisabling ? "Надсилання…" : "Вимкнути сайт"}
                </button>
                <p className={`mt-2 text-xs ${disableStatusTone}`}>
                  {disableError || disableMessage || "Доступно лише для сайтів з app_uuid."}
                </p>
              </div>
            </>
          )}
        </nav>
        <div className="space-y-3 border-t border-white/5 px-6 py-5 text-xs text-slate-500">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-white/40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Список Сайтів
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-950">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Вебсайт</p>
              <h1 className="text-3xl font-semibold text-white">{site.domain ?? "Невідомий домен"}</h1>
              <p className="text-sm text-slate-400">
                Статус: {statusDisplay}
              </p>
            </div>
            {activeTab === "analytics" && !showAnalyticsSettings && (
              <div className="space-y-2 sm:text-right">
                <Button type="button" onClick={() => setShowAnalyticsSettings(true)} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200">
                  <Settings className="mr-2 h-4 w-4" />
                  Налаштування
                </Button>
              </div>
            )}
            {saveTarget && (
              <div className="space-y-2 sm:text-right">
                <Button type="button" onClick={handleSaveClick} disabled={disableSave} className="w-full sm:w-auto">
                  {isSaving ? "Надсилання…" : "Зберегти"}
                </Button>
                <p className={`text-xs ${statusToneClass}`}>{statusHint.text}</p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {CORE_NAV_ITEMS.filter((item) => isAdmin || item.id !== "auth").map((item) => renderNavButton(item))}
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 lg:hidden">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Siteframe</p>
            <div className="mt-3 space-y-2">{SITEFRAME_NAV_ITEMS.map((item) => renderNavButton(item))}</div>
          </div>

          {isAdmin && (
            <>
              <div className="rounded-3xl border border-amber-200/40 bg-amber-500/10 p-4 lg:hidden">
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-100">Небезпечні дії</p>
                <p className="mt-1 text-xs text-amber-50/80">Запускає повну перебілдку або редеплой.</p>
                <div className="mt-3 space-y-2">{DANGER_NAV_ITEMS.map((item) => renderNavButton(item, { tone: "warning" }))}</div>
              </div>

              <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-4 lg:hidden">
                <p className="text-[11px] uppercase tracking-[0.3em] text-red-200">Аварійні дії</p>
                <p className="mt-1 text-xs text-red-100/80">Знімає деплой з сервера та видаляє додаток.</p>
                <Button
                  type="button"
                  onClick={handleDisableClick}
                  disabled={isDisabling}
                  className="mt-3 w-full bg-red-500 text-white hover:bg-red-400 disabled:opacity-60"
                >
                  {isDisabling ? "Надсилання…" : "Вимкнути сайт"}
                </Button>
                <p className={`mt-2 text-xs ${disableStatusTone}`}>
                  {disableError || disableMessage || "Доступно лише для сайтів з app_uuid."}
                </p>
              </div>
            </>
          )}

          {renderContent()}
        </div>
      </main>
      {confirmState.open && confirmState.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" onClick={closeConfirm}>
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Підтвердження</p>
              <h3 className="text-lg font-semibold text-white">Надіслати зміни?</h3>
            </div>
            <p className="text-sm text-slate-300">
              Ви збираєтеся
              {" "}
              {getConfirmDescription(confirmState.target)} на {getWebhookHost(getWebhookUrlForTarget(confirmState.target))}. Продовжити?
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={closeConfirm}
                disabled={isConfirmBusy(confirmState.target)}
              >
                Скасувати
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSave}
                disabled={isConfirmBusy(confirmState.target)}
              >
                {getConfirmPrimaryLabel(confirmState.target)}
              </Button>
            </div>
          </div>
        </div>
      )}
      {processingState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Оновлення</p>
              <h3 className="text-lg font-semibold text-white">
                {processingState.status === "success" ? "Успішно!" : processingState.status === "error" ? "Помилка" : "Оновлення сайту"}
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {processingState.status === "processing" && <Loader2 className="h-5 w-5 animate-spin text-amber-500" />}
                <p className="text-sm text-slate-300">{processingState.message}</p>
              </div>
              
              {processingState.status === "processing" && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${(processingState.step / 4) * 100}%` }}
                  />
                </div>
              )}

              {processingState.error && (
                <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-200 border border-red-500/20">
                  {processingState.error}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              {(processingState.status === "success" || processingState.status === "error") && (
                <Button
                  type="button"
                  onClick={() => setProcessingState(prev => ({ ...prev, isOpen: false }))}
                >
                  Закрити
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
      );
    }
