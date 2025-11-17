"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  parseSiteframePayload,
  normalizeSiteframePayload,
  serializeSiteframeDocument,
  type SiteframeDocument,
} from "@/lib/siteframe";

export type PayloadEditorMode = "raw" | "structured";

type PayloadPreviewProps = {
  payload: string | null;
  mode: PayloadEditorMode;
  onPayloadChange?: (value: string) => void;
};

export function PayloadPreview({ payload, mode, onPayloadChange }: PayloadPreviewProps) {
  const normalizedPayload = useMemo(() => normalizeSiteframePayload(payload ?? ""), [payload]);
  const [rawValue, setRawValue] = useState(normalizedPayload);
  const [structuredDoc, setStructuredDoc] = useState<SiteframeDocument | null>(null);
  const [structuredError, setStructuredError] = useState<string | null>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRawValue(normalizedPayload);
  }, [normalizedPayload]);

  const updateRawValue = useCallback(
    (value: string) => {
      setRawValue(value);
      onPayloadChange?.(value);
    },
    [onPayloadChange]
  );

  useEffect(() => {
    if (mode !== "structured") {
      return;
    }
    if (!rawValue.trim()) {
      setStructuredDoc(null);
      setStructuredError('Payload порожній. Додайте код у режимі «Редактор коду».');
      return;
    }
    try {
      setStructuredDoc(parseSiteframePayload(rawValue));
      setStructuredError(null);
    } catch (error) {
      console.error(error);
      setStructuredDoc(null);
      setStructuredError("Не вдалося розпарсити payload. Перевірте синтаксис і спробуйте ще раз.");
    }
  }, [mode, rawValue]);

  const lineNumbers = useMemo(() => {
    const totalLines = rawValue.split("\n").length || 1;
    return Array.from({ length: totalLines }, (_, index) => index + 1);
  }, [rawValue]);

  const handleRawScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.style.transform = `translateY(-${event.currentTarget.scrollTop}px)`;
    }
  };

  useEffect(() => {
    if (gutterRef.current && rawTextareaRef.current && mode === "raw") {
      gutterRef.current.style.transform = "translateY(0px)";
      rawTextareaRef.current.scrollTop = 0;
    }
  }, [mode, rawValue.length]);

  const updateDocument = (updater: (doc: SiteframeDocument) => SiteframeDocument) => {
    setStructuredDoc((current) => {
      if (!current) {
        return current;
      }
      const nextDoc = updater(current);
      try {
        const serialized = serializeSiteframeDocument(nextDoc);
        updateRawValue(serialized);
        setStructuredError(null);
      } catch (error) {
        console.error(error);
        setStructuredError("Не вдалося оновити сирий код. Перевірте зміни та спробуйте ще раз.");
      }
      return nextDoc;
    });
  };

  const handlePartChange = (id: string, key: "type" | "content", value: string) => {
    updateDocument((doc) => ({
      ...doc,
      parts: doc.parts.map((part) =>
        part.id === id
          ? {
              ...part,
              [key]: value,
              attributes: key === "type" ? { ...part.attributes, type: value } : part.attributes,
            }
          : part
      ),
    }));
  };

  const handlePartAttributeChange = (id: string, attribute: string, value: string) => {
    updateDocument((doc) => ({
      ...doc,
      parts: doc.parts.map((part) =>
        part.id === id
          ? {
              ...part,
              ...(attribute === "type" ? { type: value } : {}),
              attributes: { ...part.attributes, [attribute]: value },
            }
          : part
      ),
    }));
  };

  const handlePageAttributeChange = (pageId: string, attribute: string, value: string) => {
    updateDocument((doc) => ({
      ...doc,
      pages: doc.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              attributes: { ...page.attributes, [attribute]: value },
            }
          : page
      ),
    }));
  };

  const handlePageHomeToggle = (pageId: string, checked: boolean) => {
    updateDocument((doc) => ({
      ...doc,
      pages: doc.pages.map((page) => {
        if (page.id !== pageId) {
          return page;
        }
        const nextAttributes = { ...page.attributes };
        if (checked) {
          nextAttributes.home = "true";
        } else {
          delete nextAttributes.home;
        }
        return { ...page, attributes: nextAttributes };
      }),
    }));
  };

  const handleBlockContentChange = (pageId: string, blockId: string, value: string) => {
    updateDocument((doc) => ({
      ...doc,
      pages: doc.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              blocks: page.blocks.map((block) => (block.id === blockId ? { ...block, content: value } : block)),
            }
          : page
      ),
    }));
  };

  const handleBlockAttributeChange = (pageId: string, blockId: string, attribute: string, value: string) => {
    updateDocument((doc) => ({
      ...doc,
      pages: doc.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === blockId
                  ? {
                      ...block,
                      ...(attribute === "type" ? { type: value } : {}),
                      attributes: { ...block.attributes, [attribute]: value },
                    }
                  : block
              ),
            }
          : page
      ),
    }));
  };

  const renderAttributeGrid = (
    attributes: Record<string, string>,
    excludeKeys: string[],
    onChange: (attribute: string, value: string) => void,
    emptyMessage: string
  ) => {
    const entries = Object.entries(attributes ?? {})
      .filter(([key]) => !excludeKeys.includes(key))
      .sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) {
      return <p className="text-xs text-slate-500">{emptyMessage}</p>;
    }
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([attribute, value]) => (
          <label key={attribute} className="block space-y-1 text-xs font-semibold text-slate-400">
            {attribute}
            <Input value={value} onChange={(event) => onChange(attribute, event.target.value)} />
          </label>
        ))}
      </div>
    );
  };

  if (mode === "raw") {
    return (
      <div className="space-y-3">
        <div className="flex flex-col rounded-[32px] border border-white/10 bg-[#0f172a] shadow-2xl">
          <div className="flex items-center justify-between rounded-t-[32px] border-b border-white/5 bg-[#111a2c] px-6 py-3">
            <div className="flex items-center gap-3 text-xs font-semibold text-white">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              </span>
              <span>payload.siteframe.html</span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.4em] text-white/60">LIVE VIEW</span>
          </div>
          <div className="flex flex-1 overflow-hidden rounded-b-[32px] bg-[#050b16]">
            <div className="hidden w-16 flex-shrink-0 border-r border-white/5 bg-[#0b1220] px-3 py-4 text-right font-mono text-[11px] text-white/40 md:block">
              <div ref={gutterRef} className="space-y-0">
                {lineNumbers.map((line) => (
                  <div key={line} className="leading-6">
                    {line}
                  </div>
                ))}
              </div>
            </div>
            <Textarea
              ref={rawTextareaRef}
              value={rawValue}
              onChange={(event) => updateRawValue(event.target.value)}
              onScroll={handleRawScroll}
              rows={32}
              className="h-full min-h-[520px] flex-1 rounded-none border-0 bg-transparent px-6 py-5 text-sm leading-6 text-slate-100 outline-none focus-visible:outline-none"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Будь-які зміни у коді одразу доступні для відправки та для структурованого режиму.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {structuredError && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{structuredError}</p>}
      {!structuredDoc && !structuredError && <p className="text-sm text-slate-500">Структурується…</p>}
      {structuredDoc && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Глобальні частини</h3>
            {!structuredDoc.parts.length && <p className="text-xs text-slate-500">Частини не вказані.</p>}
            {structuredDoc.parts.map((part) => (
              <div key={part.id} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs font-semibold text-slate-400">
                    Тип
                    <Input value={part.type} onChange={(event) => handlePartChange(part.id, "type", event.target.value)} />
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Атрибути</p>
                  {renderAttributeGrid(
                    part.attributes,
                    ["type"],
                    (attribute, value) => handlePartAttributeChange(part.id, attribute, value),
                    "Користувацькі атрибути відсутні."
                  )}
                </div>
                <label className="block space-y-1 text-xs font-semibold text-slate-400">
                  Вміст
                  <Textarea
                    value={part.content}
                    onChange={(event) => handlePartChange(part.id, "content", event.target.value)}
                    rows={10}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/40 font-mono text-sm"
                  />
                </label>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Сторінки</h3>
            {!structuredDoc.pages.length && <p className="text-xs text-slate-500">Сторінки не вказані.</p>}
            {structuredDoc.pages.map((page) => (
              <div key={page.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-1 text-xs font-semibold text-slate-400">
                    Назва (title)
                    <Input value={page.attributes.title ?? ""} onChange={(event) => handlePageAttributeChange(page.id, "title", event.target.value)} />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-slate-400">
                    Слаг (slug)
                    <Input value={page.attributes.slug ?? ""} onChange={(event) => handlePageAttributeChange(page.id, "slug", event.target.value)} />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-slate-400">
                    Ідентифікатор (name)
                    <Input value={page.attributes.name ?? ""} onChange={(event) => handlePageAttributeChange(page.id, "name", event.target.value)} />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-slate-400">
                    Шаблон (template)
                    <Input value={page.attributes.template ?? ""} onChange={(event) => handlePageAttributeChange(page.id, "template", event.target.value)} />
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Інші атрибути</p>
                  {renderAttributeGrid(
                    page.attributes,
                    ["title", "slug", "name", "template", "home"],
                    (attribute, value) => handlePageAttributeChange(page.id, attribute, value),
                    "Додаткові атрибути відсутні."
                  )}
                </div>
                <label className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                  <input
                    type="checkbox"
                    className="size-4 rounded border border-slate-600"
                    checked={page.attributes.home === "true"}
                    onChange={(event) => handlePageHomeToggle(page.id, event.target.checked)}
                  />
                  Зробити головною сторінкою
                </label>

                <div className="space-y-3">
                  {page.blocks.map((block) => (
                    <div key={block.id} className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block space-y-1 text-xs font-semibold text-slate-400">
                          Тип блоку
                          <Input
                            value={block.type}
                            onChange={(event) => handleBlockAttributeChange(page.id, block.id, "type", event.target.value)}
                          />
                        </label>
                        {renderAttributeGrid(
                          block.attributes,
                          ["type"],
                          (attribute, value) => handleBlockAttributeChange(page.id, block.id, attribute, value),
                          "Атрибути блоку відсутні."
                        )}
                      </div>
                      <Textarea
                        value={block.content}
                        onChange={(event) => handleBlockContentChange(page.id, block.id, event.target.value)}
                        rows={block.type === "html" ? 16 : 10}
                        className="w-full rounded-3xl border border-white/10 bg-slate-950/60 font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

        </div>
      )}
    </div>
  );
}
