"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Save, ExternalLink, Settings2, GripVertical } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Badge } from "@/components/ui/badge";

type Website = {
  uuid: string;
  domain: string;
  pretty_link: string | null;
  status: string | null;
  api_key: string | null;
  global_code_after_head_open: string | null;
  global_code_after_body_open: string | null;
  [key: string]: any;
};

const AVAILABLE_COLUMNS = [
  { key: "pretty_link", label: "Referral Link", type: "input", defaultWidth: 300, adminOnly: true },
  { key: "global_code_after_head_open", label: "Code after <head>", type: "textarea", defaultWidth: 400 },
  { key: "global_code_after_body_open", label: "Code after <body>", type: "textarea", defaultWidth: 400 },
];

export function MassEditor({ websites, isAdmin = false }: { websites: Website[], isAdmin?: boolean }) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  
  useEffect(() => {
    // Set initial visible columns based on permissions
    const initialCols = AVAILABLE_COLUMNS
      .filter(col => !col.adminOnly || isAdmin)
      .map(col => col.key);
    setVisibleColumns(initialCols);
  }, [isAdmin]);

  const [editingValues, setEditingValues] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  
  // Column resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  // Drag to scroll state
  // Removed duplicate declarations
  // const scrollContainerRef = useRef<HTMLDivElement>(null);
  // const [isDragging, setIsDragging] = useState(false);
  // const [startX, setStartX] = useState(0);
  // const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const diff = e.pageX - startX;
      const newWidth = Math.max(150, startWidth + diff); // Minimum width 150px
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.cursor = "default";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent drag scroll when resizing
    const currentWidth = columnWidths[key] || AVAILABLE_COLUMNS.find(c => c.key === key)?.defaultWidth || 200;
    resizingRef.current = {
      key,
      startX: e.pageX,
      startWidth: currentWidth,
    };
    document.body.style.cursor = "col-resize";
  };

  const handleChange = (uuid: string, field: string, value: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [uuid]: {
        ...(prev[uuid] || {}),
        [field]: value,
      },
    }));
  };

  const getValue = (site: Website, field: string) => {
    if (editingValues[site.uuid]?.[field] !== undefined) {
      return editingValues[site.uuid][field];
    }
    return site[field] || "";
  };

  const isDirty = (site: Website) => {
    return editingValues[site.uuid] && Object.keys(editingValues[site.uuid]).length > 0;
  };

  const handleSave = async (site: Website) => {
    const changes = editingValues[site.uuid];
    if (!changes) return;

    setSaving((prev) => ({ ...prev, [site.uuid]: true }));
    try {
      const supabase = createSupabaseBrowserClient();
      
      // 1. Set status to updating
      await supabase
        .from("websites")
        .update({ status: "updating" })
        .eq("uuid", site.uuid);

      // 2. Update fields in DB
      // Convert empty strings to null for DB
      const dbUpdates = Object.entries(changes).reduce((acc, [key, val]) => {
        acc[key] = val || null;
        return acc;
      }, {} as Record<string, any>);

      const { error: dbError } = await supabase
        .from("websites")
        .update(dbUpdates)
        .eq("uuid", site.uuid);

      if (dbError) throw new Error(dbError.message);

      // 3. Fetch full website data for sync
      const { data: fullSite, error: fetchError } = await supabase
        .from("websites")
        .select("*")
        .eq("uuid", site.uuid)
        .single();

      if (fetchError || !fullSite) throw new Error("Failed to fetch full website data");

      // 4. Send to Website (Direct Sync)
      const domain = fullSite.domain;
      const apiKey = fullSite.api_key;

      if (!domain || !apiKey) {
         throw new Error("Domain or API Key missing");
      }

      const syncUrl = `https://${domain}/wp-json/siteframe/v1/sync`;

      const currentGlobal = {
        brand: fullSite.brand,
        ref: fullSite.ref,
        logo: fullSite.logo,
        banner: fullSite.banner,
        banner_mobile: fullSite.banner_mobile,
        login_button_text: fullSite.login_button_text,
        locale: fullSite.locale,
        favicon: fullSite.favicon,
        register_button_text: fullSite.register_button_text,
        bonus_button_text: fullSite.bonus_button_text,
        image_1: fullSite.image_1,
        image_2: fullSite.image_2,
        image_3: fullSite.image_3,
        image_4: fullSite.image_4,
        global_code_after_head_open: fullSite.global_code_after_head_open,
        global_code_after_body_open: fullSite.global_code_after_body_open,
      };

      const payloadBody = {
        draft_non_imported: true,
        default_status: "publish",
        pretty_link: fullSite.pretty_link, // Ensure we use the latest from DB (which we just updated)
        payload: fullSite.payload || "",
        global_options: currentGlobal
      };

      const response = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Sync failed: ${response.status} ${text}`);
      }

      // Clear dirty state for this row
      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[site.uuid];
        return next;
      });

      // Success toast or indicator could go here
      
    } catch (error) {
      console.error("Save error:", error);
      alert(`Error saving ${site.domain}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving((prev) => ({ ...prev, [site.uuid]: false }));
    }
  };

  // Drag to scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use a ref for mutable drag state to avoid closure staleness in event handlers
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    isDragging: false // True only after threshold
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDown || !scrollContainerRef.current) return;
      
      const x = e.pageX;
      const walkX = x - dragRef.current.startX;
      
      // Threshold check
      if (!dragRef.current.isDragging && Math.abs(walkX) > 10) {
        dragRef.current.isDragging = true;
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        // Stop text selection if it started
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
      }

      if (dragRef.current.isDragging) {
        e.preventDefault(); // Stop text selection / native drag
        const walk = (x - dragRef.current.startX) * 1.5; 
        scrollContainerRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragRef.current.isDragging) {
        // If we were dragging, prevent the click event that follows
        const preventClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            window.removeEventListener('click', preventClick, true);
        };
        window.addEventListener('click', preventClick, true);
      }

      dragRef.current.isDown = false;
      dragRef.current.isDragging = false;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    
    // Check if we are resizing
    if (resizingRef.current) return;

    // Prevent dragging if clicking on the scrollbar itself
    if (e.target === scrollContainerRef.current) return;

    dragRef.current = {
      isDown: true,
      startX: e.pageX,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      isDragging: false
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              <Settings2 className="mr-2 h-4 w-4" />
              Налаштування полів
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] bg-slate-950 border-slate-800 text-slate-200">
            <DropdownMenuLabel>Показати поля</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            {AVAILABLE_COLUMNS.filter(col => !col.adminOnly || isAdmin).map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={(checked) => {
                  setVisibleColumns(
                    checked
                      ? [...visibleColumns, column.key]
                      : visibleColumns.filter((c) => c !== column.key)
                  );
                }}
                className="focus:bg-slate-800 focus:text-slate-200"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div 
        ref={scrollContainerRef}
        className={`rounded-md border border-white/10 bg-white/5 overflow-x-auto ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <table className="w-full caption-bottom text-sm" style={{ minWidth: "100%", tableLayout: "fixed" }}>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="sticky left-0 z-20 w-[200px] bg-[#0f172a] text-slate-400 shadow-[1px_0_0_0_rgba(255,255,255,0.1)] cursor-grab active:cursor-grabbing">Сайт</TableHead>
              {visibleColumns.map((colKey) => {
                const col = AVAILABLE_COLUMNS.find((c) => c.key === colKey);
                const width = columnWidths[colKey] || col?.defaultWidth || 200;
                return (
                  <TableHead 
                    key={colKey} 
                    className="relative text-slate-400 select-none cursor-grab active:cursor-grabbing"
                    style={{ width: `${width}px` }}
                  >
                    <div className="flex items-center justify-between">
                      {col?.label}
                      <div
                        className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-white/10 active:bg-amber-400/20 transition-colors"
                        onMouseDown={(e) => startResizing(e, colKey)}
                      >
                        <div className="h-4 w-px bg-white/20" />
                      </div>
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="sticky right-0 z-20 w-[100px] bg-[#0f172a] text-right text-slate-400 shadow-[-1px_0_0_0_rgba(255,255,255,0.1)]">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {websites.map((site) => (
              <TableRow key={site.uuid} className="border-b border-white/5 hover:bg-white/5">
                <TableCell className="sticky left-0 z-20 font-medium text-slate-200 align-top p-4 border-r border-white/5 bg-[#0f172a] shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 drag-handle">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm truncate" title={site.domain}>{site.domain}</span>
                      <a
                        href={`https://${site.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs text-amber-400 hover:underline"
                      >
                        Open <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </TableCell>
                {visibleColumns.map((colKey) => {
                  const col = AVAILABLE_COLUMNS.find((c) => c.key === colKey);
                  const value = getValue(site, colKey);
                  const isEditable = !col?.adminOnly || isAdmin;
                  const isDisabled = !isEditable;

                  return (
                    <TableCell key={colKey} className="p-0 align-top border-r border-white/5 last:border-r-0">
                      {col?.type === "textarea" ? (
                        <Textarea
                          value={value}
                          onChange={(e) => handleChange(site.uuid, colKey, e.target.value)}
                          disabled={isDisabled}
                          className={`w-full h-full min-h-[120px] rounded-none border-0 bg-transparent p-4 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus-visible:ring-0 focus-visible:outline-none focus:bg-white/5 transition-colors resize-y disabled:opacity-50`}
                          placeholder={isEditable ? `Enter ${col?.label}...` : "Restricted"}
                        />
                      ) : (
                        <Input
                          value={value}
                          onChange={(e) => handleChange(site.uuid, colKey, e.target.value)}
                          disabled={isDisabled}
                          className={`w-full h-full min-h-[60px] rounded-none border-0 bg-transparent p-4 text-sm text-slate-200 placeholder:text-slate-600 focus-visible:ring-0 focus-visible:outline-none focus:bg-white/5 transition-colors disabled:opacity-50`}
                          placeholder={isEditable ? `Enter ${col?.label}...` : "Restricted"}
                        />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="sticky right-0 z-20 text-right align-top p-4 border-l border-white/5 bg-[#0f172a] shadow-[-1px_0_0_0_rgba(255,255,255,0.1)]">
                  <Button
                    onClick={() => handleSave(site)}
                    disabled={saving[site.uuid] || !isDirty(site)}
                    className={`
                      h-8 px-3
                      transition-all
                      ${isDirty(site) 
                        ? "bg-amber-500 hover:bg-amber-600 text-black" 
                        : "bg-white/5 text-slate-500 hover:bg-white/10"}
                    `}
                  >
                    {saving[site.uuid] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  );
}
