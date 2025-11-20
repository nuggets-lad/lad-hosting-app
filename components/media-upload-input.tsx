"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { MediaGalleryModal } from "@/components/media-gallery-modal";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "uploads";
const STORAGE_FOLDER = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_FOLDER ?? "uploads";

type MediaUploadInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  pathPrefix?: string;
  websiteUuid?: string;
};

const generateFilePath = (prefix: string, originalName: string) => {
  const extension = originalName.split(".").pop()?.toLowerCase() || "png";
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const cleanedPrefix = prefix.replace(/[^a-z0-9-_]/gi, "-") || "media";
  const folder = STORAGE_FOLDER ? `${STORAGE_FOLDER.replace(/\/+$/u, "")}/` : "";
  return `${folder}${cleanedPrefix}-${Date.now()}-${id}.${extension}`;
};

export function MediaUploadInput({ label, value, onChange, placeholder, pathPrefix = "media", websiteUuid }: MediaUploadInputProps) {
  const [previewErrored, setPreviewErrored] = useState(false);

  useEffect(() => {
    setPreviewErrored(false);
  }, [value]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <MediaGalleryModal 
        onSelect={onChange} 
        websiteUuid={websiteUuid}
        pathPrefix={pathPrefix}
        trigger={
          <div className="group relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 transition hover:border-white/20 hover:bg-slate-900/80 sm:h-36">
            {value && !previewErrored ? (
              <>
                <Image
                  src={value}
                  alt={`${label} preview`}
                  fill
                  className="object-contain p-2 transition group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 300px"
                  unoptimized
                  onError={() => setPreviewErrored(true)}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-xs font-medium text-white">Змінити зображення</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center text-slate-500 transition group-hover:text-slate-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-[11px]">Оберіть або завантажте</span>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
