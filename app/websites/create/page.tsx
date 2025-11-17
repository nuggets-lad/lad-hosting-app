"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadInput } from "@/components/media-upload-input";

type CreateWebsiteFields = {
  domain: string;
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
  pretty_link: string;
};

const INITIAL_VALUES: CreateWebsiteFields = {
  domain: "",
  publisher: "",
  brand_full: "",
  brand_key: "",
  target_site: "",
  style: "",
  logo: "",
  banner: "",
  banner_mobile: "",
  image_1: "",
  image_2: "",
  image_3: "",
  image_4: "",
  login_button_text: "",
  register_button_text: "",
  bonus_button_text: "",
  pretty_link: "",
};

const REQUIRED_FIELDS: Array<keyof CreateWebsiteFields> = [
  "domain",
  "publisher",
  "brand_full",
  "brand_key",
  "target_site",
  "style",
];

const MEDIA_FIELDS: Array<{ key: keyof CreateWebsiteFields; label: string; placeholder: string }> = [
  { key: "logo", label: "Лого", placeholder: "https://cdn.site/logo.png" },
  { key: "banner", label: "Банер", placeholder: "https://cdn.site/banner.jpg" },
  { key: "banner_mobile", label: "Банер Мобільний", placeholder: "https://cdn.site/banner-mobile.jpg" },
  { key: "image_1", label: "Зображення 1", placeholder: "https://cdn.site/image1.jpg" },
  { key: "image_2", label: "Зображення 2", placeholder: "https://cdn.site/image2.jpg" },
  { key: "image_3", label: "Зображення 3", placeholder: "https://cdn.site/image3.jpg" },
  { key: "image_4", label: "Зображення 4", placeholder: "https://cdn.site/image4.jpg" },
];

const buildWebhookUrl = () => {
  const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE;
  if (base) {
    try {
      const normalizedBase = base.endsWith("/") ? base : `${base}/`;
      return new URL("webhook/deploy-website", normalizedBase).toString();
    } catch (error) {
      console.warn("Invalid NEXT_PUBLIC_N8N_WEBHOOK_BASE", error);
    }
  }
  return "https://n8n.onepunch.team/webhook/deploy-website";
};

export default function CreateWebsitePage() {
  const router = useRouter();
  const webhookUrl = useMemo(buildWebhookUrl, []);
  const [formValues, setFormValues] = useState<CreateWebsiteFields>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: keyof CreateWebsiteFields, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const missingRequired = REQUIRED_FIELDS.filter((field) => !formValues[field].trim());
  const disableSubmit = isSubmitting || missingRequired.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (missingRequired.length) {
      setErrorMessage("Заповніть обовʼязкові поля перед відправкою.");
      return;
    }
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(
            Object.entries(formValues).map(([key, value]) => [key, value.trim() || null])
          ),
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Не вдалося надіслати дані на деплоймент.");
      }
      setSuccessMessage("Запит на створення сайту відправлено. Очікуйте на статус у списку сайтів.");
      setFormValues(INITIAL_VALUES);
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Сталася невідома помилка.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-300">OP Tools</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Створення сайту</h1>
            <p className="text-sm text-slate-400">Налаштуйте поля і надішліть їх до n8n для деплойменту.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm text-slate-200 transition hover:border-white/40"
          >
            ← До списку
          </Link>
        </header>

        <Card className="space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Домен
                <Input value={formValues.domain} onChange={(event) => handleChange("domain", event.target.value)} placeholder="bizzo-casino-pl.com" />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Видавець
                <Input value={formValues.publisher} onChange={(event) => handleChange("publisher", event.target.value)} placeholder="bizzo-casino-pl.com" />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Повна назва бренду
                <Input value={formValues.brand_full} onChange={(event) => handleChange("brand_full", event.target.value)} placeholder="Bizzo Casino" />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Бренд ключ
                <Input value={formValues.brand_key} onChange={(event) => handleChange("brand_key", event.target.value)} placeholder="Bizzo" />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Цільовий сайт
                <Input value={formValues.target_site} onChange={(event) => handleChange("target_site", event.target.value)} placeholder="https://bizzo-casino-pl.com" />
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-400">
                Реферальне посилання (pretty_link)
                <Input value={formValues.pretty_link} onChange={(event) => handleChange("pretty_link", event.target.value)} placeholder="https://partners.brand.com/?ref=123" />
              </label>
            </div>

            <label className="space-y-2 text-xs font-semibold text-slate-400">
              Стиль
              <Textarea
                rows={5}
                value={formValues.style}
                onChange={(event) => handleChange("style", event.target.value)}
                placeholder="Темна тема, фон фіолетовий #2B1234, акценти жовті #FDCD0A, кнопки linear-gradient(to bottom,#BCFF50,#08B83A)."
              />
            </label>

            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Медіа</p>
              <div className="grid gap-4 md:grid-cols-2">
                {MEDIA_FIELDS.map(({ key, label, placeholder }) => (
                  <MediaUploadInput
                    key={key}
                    label={label}
                    value={formValues[key]}
                    onChange={(val) => handleChange(key, val)}
                    placeholder={placeholder}
                    pathPrefix={`${formValues.domain || formValues.brand_key || "new-site"}-${key}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Кнопки</p>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Кнопка Вхід Текст
                  <Input value={formValues.login_button_text} onChange={(event) => handleChange("login_button_text", event.target.value)} placeholder="Увійти" />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Кнопка Реєстрація Текст
                  <Input value={formValues.register_button_text} onChange={(event) => handleChange("register_button_text", event.target.value)} placeholder="Реєстрація" />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-400">
                  Кнопка Бонус Текст
                  <Input value={formValues.bonus_button_text} onChange={(event) => handleChange("bonus_button_text", event.target.value)} placeholder="Отримати бонус" />
                </label>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <Button type="submit" disabled={disableSubmit} className="w-full sm:w-auto">
                {isSubmitting ? "Відправлення…" : "Відправити на деплоймент"}
              </Button>
              {missingRequired.length > 0 && !isSubmitting && (
                <p className="text-xs text-amber-200">Заповніть усі обовʼязкові поля зі списку вище.</p>
              )}
              {successMessage && <p className="text-xs text-emerald-300">{successMessage}</p>}
              {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
