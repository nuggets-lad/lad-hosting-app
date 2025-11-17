"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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

  return (
    <label className="space-y-2 text-xs font-semibold text-slate-400">
      {label}
      <div
        className="space-y-2"
        onDragOver={(event) => canUpload && event.preventDefault()}
        onDrop={handleDrop}
      >
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
