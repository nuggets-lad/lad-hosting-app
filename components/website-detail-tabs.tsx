"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PayloadPreview } from "@/components/payload-preview";
import { MediaUploadInput } from "@/components/media-upload-input";
import { WebsiteDetailRecord, WebsiteHistoryEntry } from "@/lib/website-types";

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
  | "redeploy";

type WebsiteDetailTabsProps = {
  site: WebsiteDetailRecord;
  history: WebsiteHistoryEntry[];
  adminUrl: string | null;
  siteUrl: string | null;
  statusDisplay: string;
  environmentLabel: string;
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

type SaveTarget = "global" | "siteframe";
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
};

type ButtonCopyState = Record<ButtonTokenId, string>;

type RegenerationFields = {
  publisher: string;
  brand_full: string;
  brand_key: string;
  target_site: string;
  style: string;
  logo: string;
  banner: string;
  banner_mobile: string;
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
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
  logo: string;
  banner: string;
  banner_mobile: string;
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
  login_button_text: string;
  register_button_text: string;
  bonus_button_text: string;
};

const CORE_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Панель" },
  { id: "auth", label: "Авторизація" },
  { id: "history", label: "Історія" },
  { id: "edit-global", label: "Глобальні поля" },
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
  logo: site.logo ?? "",
  banner: site.banner ?? "",
  banner_mobile: site.banner_mobile ?? "",
  image_1: site.image_1 ?? "",
  image_2: site.image_2 ?? "",
  image_3: site.image_3 ?? "",
  image_4: site.image_4 ?? "",
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
  logo: site.logo ?? "",
  banner: site.banner ?? "",
  banner_mobile: site.banner_mobile ?? "",
  image_1: site.image_1 ?? "",
  image_2: site.image_2 ?? "",
  image_3: site.image_3 ?? "",
  image_4: site.image_4 ?? "",
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
}: WebsiteDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
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

  const saveTarget: SaveTarget | null = activeTab === "edit-global" ? "global" : isSiteframeTab ? "siteframe" : null;
  const disableSave = !saveTarget || isSaving || (saveTarget === "global" ? !globalDirty : !siteframeDirty);
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
    } else {
      setIsSaving(true);
      resetStatus();
    }
    try {
      if (target === "regenerate") {
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
          logo: trimOrNull(getRegenerationField("logo")),
          banner: trimOrNull(getRegenerationField("banner")),
          banner_mobile: trimOrNull(getRegenerationField("banner_mobile")),
          image_1: trimOrNull(getRegenerationField("image_1")),
          image_2: trimOrNull(getRegenerationField("image_2")),
          image_3: trimOrNull(getRegenerationField("image_3")),
          image_4: trimOrNull(getRegenerationField("image_4")),
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
      } else {
        const domainValue = globalFields.domain.trim() ? globalFields.domain : site.domain ?? "";
        const body = {
          code: target === "siteframe" ? siteframeValue : null,
          domain: domainValue || null,
          api_key: site.api_key ?? null,
          brand: globalFields.brand || null,
          pretty_link: globalFields.pretty_link || null,
          logo: globalFields.logo || null,
          banner: globalFields.banner || null,
          banner_mobile: globalFields.banner_mobile || null,
          image_1: globalFields.image_1 || null,
          image_2: globalFields.image_2 || null,
          image_3: globalFields.image_3 || null,
          image_4: globalFields.image_4 || null,
          login_button_text: buttonCopy.login_btn || null,
          register_button_text: buttonCopy.register_btn || null,
          bonus_button_text: buttonCopy.bonus_btn || null,
          target,
          website_uuid: site.uuid,
        } as const;
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Не вдалося надіслати дані.");
        }
        setSaveMessage(target === "global" ? "Глобальні поля надіслано." : "Siteframe payload надіслано.");
        if (target === "global") {
          setGlobalDirty(false);
        } else {
          setSiteframeDirty(false);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Сталася невідома помилка.";
      if (target === "regenerate") {
        setRegenerateError(message);
      } else {
        setSaveError(message);
      }
    } finally {
      if (target === "regenerate") {
        setIsRegenerating(false);
      } else {
        setIsSaving(false);
      }
      setConfirmState({ open: false, target: null });
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
    <Card className="space-y-5">
      <div>
        <FieldLabel>Авторизація</FieldLabel>
        <h2 className="text-lg font-semibold text-white">Параметри доступу</h2>
        <p className="text-xs text-slate-400">Використовуйте ці дані для входу до адмін-панелі та інтеграції.</p>
      </div>
      <div className="space-y-3 text-sm text-slate-200">
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
      </div>
    </Card>
  );

  const renderHistory = () => (
    <Card className="space-y-5">
      <div>
        <FieldLabel>Історія</FieldLabel>
        <h2 className="text-lg font-semibold text-white">Збережені зміни</h2>
        <p className="text-xs text-slate-400">Останні 12 записів з `websites_history`.</p>
      </div>
      {!history.length && <p className="text-sm text-slate-500">Ще немає записів в історії.</p>}
      <div className="space-y-4">
        {history.map((entry) => (
          <article key={entry.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
            <p className="text-xs text-slate-400">Зміни від {formatDate(entry.changed_at)} UTC</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {entry.fields.map((field, index) => {
                const truncatedValue = field.value.length > 500 ? `${field.value.slice(0, 500)}…` : field.value;
                return (
                  <div
                    key={`${entry.id}-${field.key}-${index}`}
                    className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-3 text-left"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{field.key}</p>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-100">{truncatedValue}</p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );

  const renderEditGlobal = () => (
    <Card className="space-y-5">
      <div>
        <FieldLabel>Глобальні поля</FieldLabel>
        <h2 className="text-lg font-semibold text-white">Брендинг та посилання</h2>
        <p className="text-xs text-slate-400">
          Дані відображаються напряму з таблиці `websites`. Оновлення відбудеться після інтеграції з API.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-xs font-semibold text-slate-400">
          Назва бренду
          <Input value={globalFields.brand} onChange={(event) => handleGlobalFieldChange("brand", event.target.value)} placeholder="Bizzo" />
        </label>
        <label className="space-y-2 text-xs font-semibold text-slate-400">
          Красиве посилання
          <Input value={globalFields.pretty_link} onChange={(event) => handleGlobalFieldChange("pretty_link", event.target.value)} placeholder="casino.brand" />
        </label>
        <label className="space-y-2 text-xs font-semibold text-slate-400">
          Основний домен
          <Input value={globalFields.domain} onChange={(event) => handleGlobalFieldChange("domain", event.target.value)} placeholder="brand.com" />
        </label>
        <label className="space-y-2 text-xs font-semibold text-slate-400">
          Tracking ref
          <Textarea value={globalFields.ref} onChange={(event) => handleGlobalFieldChange("ref", event.target.value)} rows={2} placeholder="https://partners.brand.com/?ref=..." />
        </label>
      </div>
      <div className="space-y-3">
        <FieldLabel>Медіа</FieldLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <MediaUploadInput
            label="Логотип URL"
            value={globalFields.logo}
            onChange={(val) => handleGlobalFieldChange("logo", val)}
            placeholder="https://cdn.brand.com/logo.svg"
            pathPrefix={`${site.uuid}-logo`}
          />
          <MediaUploadInput
            label="Банер Hero"
            value={globalFields.banner}
            onChange={(val) => handleGlobalFieldChange("banner", val)}
            placeholder="https://cdn.brand.com/hero.png"
            pathPrefix={`${site.uuid}-banner`}
          />
          <MediaUploadInput
            label="Банер Hero (Mobile)"
            value={globalFields.banner_mobile}
            onChange={(val) => handleGlobalFieldChange("banner_mobile", val)}
            placeholder="https://cdn.brand.com/hero-mobile.png"
            pathPrefix={`${site.uuid}-banner-mobile`}
          />
          <MediaUploadInput
            label="Зображення 1"
            value={globalFields.image_1}
            onChange={(val) => handleGlobalFieldChange("image_1", val)}
            placeholder="https://cdn.brand.com/image1.jpg"
            pathPrefix={`${site.uuid}-image-1`}
          />
          <MediaUploadInput
            label="Зображення 2"
            value={globalFields.image_2}
            onChange={(val) => handleGlobalFieldChange("image_2", val)}
            placeholder="https://cdn.brand.com/image2.jpg"
            pathPrefix={`${site.uuid}-image-2`}
          />
          <MediaUploadInput
            label="Зображення 3"
            value={globalFields.image_3}
            onChange={(val) => handleGlobalFieldChange("image_3", val)}
            placeholder="https://cdn.brand.com/image3.jpg"
            pathPrefix={`${site.uuid}-image-3`}
          />
          <MediaUploadInput
            label="Зображення 4"
            value={globalFields.image_4}
            onChange={(val) => handleGlobalFieldChange("image_4", val)}
            placeholder="https://cdn.brand.com/image4.jpg"
            pathPrefix={`${site.uuid}-image-4`}
          />
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
    </Card>
  );

  const renderEditSiteframe = (mode: "raw" | "structured") => (
    <Card className="space-y-4">
      <div>
        <FieldLabel>Siteframe</FieldLabel>
        <h2 className="text-lg font-semibold text-white">{mode === "raw" ? "Редактор коду" : "Редактор сторінок"}</h2>
        <p className="text-xs text-slate-400">
          {mode === "raw"
            ? "Повний payload у стилі VS Code з підсвіткою рядків."
            : "Структурований редактор сторінок, блоків і глобальних частин."}
        </p>
      </div>
      <PayloadPreview payload={siteframeValue} onPayloadChange={handlePayloadChange} mode={mode} />
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
      <Card className="space-y-5">
        <div>
          <FieldLabel>Перегенерація</FieldLabel>
          <h2 className="text-lg font-semibold text-white">Повна перебілдка</h2>
          <p className="text-xs text-slate-400">Надішліть дані до n8n, щоби перестворити сайт на основі свіжих полів.</p>
        </div>
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
        </div>
        <label className="space-y-2 text-xs font-semibold text-slate-400">
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
            <MediaUploadInput
              label="Лого"
              value={getRegenerationField("logo")}
              onChange={(val) => handleRegenerationFieldChange("logo", val)}
              placeholder={globalFields.logo || "https://.../logo.png"}
              pathPrefix={`${site.uuid}-logo`}
            />
            <MediaUploadInput
              label="Банер"
              value={getRegenerationField("banner")}
              onChange={(val) => handleRegenerationFieldChange("banner", val)}
              placeholder={globalFields.banner || "https://.../banner.jpg"}
              pathPrefix={`${site.uuid}-banner`}
            />
            <MediaUploadInput
              label="Банер мобільний"
              value={getRegenerationField("banner_mobile")}
              onChange={(val) => handleRegenerationFieldChange("banner_mobile", val)}
              placeholder={globalFields.banner_mobile || "https://.../banner-mobile.jpg"}
              pathPrefix={`${site.uuid}-banner-mobile`}
            />
            <MediaUploadInput
              label="Зображення 1"
              value={getRegenerationField("image_1")}
              onChange={(val) => handleRegenerationFieldChange("image_1", val)}
              placeholder={globalFields.image_1 || "https://.../image1.jpg"}
              pathPrefix={`${site.uuid}-image-1`}
            />
            <MediaUploadInput
              label="Зображення 2"
              value={getRegenerationField("image_2")}
              onChange={(val) => handleRegenerationFieldChange("image_2", val)}
              placeholder={globalFields.image_2 || "https://.../image2.jpg"}
              pathPrefix={`${site.uuid}-image-2`}
            />
            <MediaUploadInput
              label="Зображення 3"
              value={getRegenerationField("image_3")}
              onChange={(val) => handleRegenerationFieldChange("image_3", val)}
              placeholder={globalFields.image_3 || "https://.../image3.jpg"}
              pathPrefix={`${site.uuid}-image-3`}
            />
            <MediaUploadInput
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
      </Card>
    );
  };

  const renderRedeploy = () => {
    const missingRequired = REDEPLOY_REQUIRED_FIELDS.filter((field) => !redeployFields[field].trim());
    const disableSubmit = isRedeploying || missingRequired.length > 0;
    const statusTone = redeployError ? "text-red-400" : redeployMessage ? "text-emerald-300" : "text-slate-500";

    return (
      <Card className="space-y-6">
        <div className="space-y-1">
          <FieldLabel>Редеплой</FieldLabel>
          <h2 className="text-lg font-semibold text-white">Повторне створення сайту</h2>
          <p className="text-xs text-slate-400">
            Сервіс видалить поточний деплой і створить сайт заново. Поля нижче повторюють форму створення сайту, окрім домену –
            використовуємо {globalFields.domain || site.domain || "вказаний домен"}.
          </p>
        </div>

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
          </div>

          <label className="space-y-2 text-xs font-semibold text-slate-400">
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
                <MediaUploadInput
                  key={key}
                  label={label}
                  value={getRedeployField(key)}
                  onChange={(val) => handleRedeployFieldChange(key, val)}
                  placeholder={globalFields[key as keyof GlobalFields] || `https://cdn.site/${String(key)}.jpg`}
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
      </Card>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {statCards.map((stat) => (
          <Card key={stat.label} className="rounded-3xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
            <p className="truncate text-lg font-semibold text-white">{stat.value}</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-3">
        <FieldLabel>Швидкі шорткоди</FieldLabel>
        <div className="grid gap-4 md:grid-cols-3">
          {DASHBOARD_CARDS.map((card) => (
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
      </Card>
      <Card className="space-y-3">
        <FieldLabel>Посилання</FieldLabel>
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
      </Card>
    </div>
  );

  const renderContent = () => {
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
          <div className="space-y-2">{CORE_NAV_ITEMS.map((item) => renderNavButton(item))}</div>
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Siteframe</p>
            <div className="mt-3 space-y-2">{SITEFRAME_NAV_ITEMS.map((item) => renderNavButton(item, { isSub: true }))}</div>
          </div>
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
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Website</p>
              <h1 className="text-3xl font-semibold text-white">{site.domain ?? "Невідомий домен"}</h1>
              <p className="text-sm text-slate-400">
                Середовище: {environmentLabel} · Статус: {statusDisplay}
              </p>
            </div>
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
            {CORE_NAV_ITEMS.map((item) => renderNavButton(item))}
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 lg:hidden">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Siteframe</p>
            <div className="mt-3 space-y-2">{SITEFRAME_NAV_ITEMS.map((item) => renderNavButton(item))}</div>
          </div>

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
    </div>
      );
    }
