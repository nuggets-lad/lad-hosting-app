"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "uploads";
const STORAGE_FOLDER = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_FOLDER ?? "uploads";

type MediaUploadInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  pathPrefix?: string;
};

const generateFilePath = (prefix: string, originalName: string) => {
  const extension = originalName.split(".").pop()?.toLowerCase() || "png";
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const cleanedPrefix = prefix.replace(/[^a-z0-9-_]/gi, "-") || "media";
  const folder = STORAGE_FOLDER ? `${STORAGE_FOLDER.replace(/\/+$/u, "")}/` : "";
  return `${folder}${cleanedPrefix}-${Date.now()}-${id}.${extension}`;
};

export function MediaUploadInput({ label, value, onChange, placeholder, pathPrefix = "media" }: MediaUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewErrored, setPreviewErrored] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const canUpload = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const helperText = useMemo(() => {
    if (errorMessage) {
      return { text: errorMessage, className: "text-red-400" };
    }
    if (statusMessage) {
      return { text: statusMessage, className: "text-emerald-300" };
    }
    if (!canUpload) {
      return {
        text: "Завантаження недоступне: додайте NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.",
        className: "text-amber-200",
      };
    }
    return {
      text: "Ctrl+V або перетягніть зображення, щоб завантажити на Supabase.",
      className: "text-slate-500",
    };
  }, [canUpload, errorMessage, statusMessage]);

  const resetMessages = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!canUpload) {
        return;
      }
      setIsUploading(true);
      resetMessages();
      try {
        const path = generateFilePath(pathPrefix, file.name || "image.png");
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
          upsert: false,
          cacheControl: "3600",
        });
        if (uploadError) {
          throw uploadError;
        }
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        if (!data?.publicUrl) {
          throw new Error("Не вдалося отримати публічний URL.");
        }
        onChange(data.publicUrl);
        setStatusMessage("Зображення завантажене.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не вдалося завантажити файл.";
        setErrorMessage(message);
      } finally {
        setIsUploading(false);
      }
    },
    [canUpload, onChange, pathPrefix, supabase]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files && files[0];
      if (!file) {
        return;
      }
      uploadFile(file);
    },
    [uploadFile]
  );

  const handleButtonClick = () => {
    if (!canUpload) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    if (!canUpload) {
      return;
    }
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }
    const fileItem = Array.from(items).find((item) => item.type.startsWith("image"));
    if (fileItem) {
      event.preventDefault();
      const file = fileItem.getAsFile();
      if (file) {
        uploadFile(file);
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canUpload) {
      return;
    }
    event.preventDefault();
    handleFiles(event.dataTransfer?.files ?? null);
  };

  useEffect(() => {
    setPreviewErrored(false);
  }, [value]);

  return (
    <label className="space-y-2 text-xs font-semibold text-slate-400">
      {label}
      <div
        className="space-y-3"
        onDragOver={(event) => canUpload && event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Input
                value={value}
                onChange={(event) => {
                  resetMessages();
                  onChange(event.target.value);
                }}
                placeholder={placeholder}
                onPaste={handlePaste}
              />
              <Button type="button" variant="secondary" onClick={handleButtonClick} disabled={isUploading || !canUpload}>
                {isUploading ? "Завантаження…" : "Upload"}
              </Button>
            </div>
            <p className={`text-[11px] ${helperText.className}`}>{helperText.text}</p>
          </div>
          <div className="w-full sm:w-48">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Превʼю</p>
            <div className="relative mt-2 flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 sm:h-36">
              {value && !previewErrored ? (
                <Image
                  src={value}
                  alt={`${label} preview`}
                  fill
                  className="object-cover"
                  sizes="150px"
                  unoptimized
                  onError={() => setPreviewErrored(true)}
                />
              ) : (
                <div className="px-4 text-center text-[11px] text-slate-500">
                  {value && previewErrored ? "Не вдалося завантажити превʼю." : "Зображення ще не додано."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}
