"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Website = {
  uuid: string;
  domain: string;
  pretty_link: string | null;
  status: string | null;
  api_key: string | null;
};

export function QuickReferralEdit({ websites }: { websites: Website[] }) {
  const [editingLinks, setEditingLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleChange = (uuid: string, value: string) => {
    setEditingLinks((prev) => ({ ...prev, [uuid]: value }));
  };

  const getLinkValue = (site: Website) => {
    return editingLinks[site.uuid] !== undefined ? editingLinks[site.uuid] : (site.pretty_link || "");
  };

  const handleSave = async (site: Website) => {
    const newValue = editingLinks[site.uuid];
    if (newValue === undefined) return; // No changes

    setSaving((prev) => ({ ...prev, [site.uuid]: true }));
    try {
      const supabase = createSupabaseBrowserClient();
      
      // 1. Set status to updating
      const { error: statusError } = await supabase
        .from("websites")
        .update({ status: "updating" })
        .eq("uuid", site.uuid);

      if (statusError) throw new Error(`Status update failed: ${statusError.message}`);

      // 2. Update pretty_link in DB
      const { error: dbError } = await supabase
        .from("websites")
        .update({ pretty_link: newValue || null })
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
        pretty_link: newValue || null, // Use the new value
        payload: fullSite.payload || "",
        global_options: currentGlobal
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
        throw new Error(`Sync failed: ${response.status} ${errorText}`);
      }

      // 5. Set status to active
      const { error: finalStatusError } = await supabase
        .from("websites")
        .update({ status: "active" })
        .eq("uuid", site.uuid);

      if (finalStatusError) throw new Error(`Final status update failed: ${finalStatusError.message}`);

      // Clear dirty state
      setEditingLinks((prev) => {
        const next = { ...prev };
        delete next[site.uuid];
        return next;
      });
      
      window.location.reload(); 

    } catch (error) {
      console.error("Error saving pretty link:", error);
      alert("Помилка збереження: " + (error instanceof Error ? error.message : "Unknown error"));
      
      // Try to set error status
      const supabase = createSupabaseBrowserClient();
      await supabase.from("websites").update({ status: "error" }).eq("uuid", site.uuid);
    } finally {
      setSaving((prev) => ({ ...prev, [site.uuid]: false }));
    }
  };

  return (
    <Card className="p-6 space-y-6 bg-slate-900/50 border-white/10">
      <h2 className="text-xl font-semibold text-white">Швидке редагування реферальних посилань</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs uppercase bg-slate-900/50 text-slate-400">
            <tr>
              <th className="px-4 py-3 w-[200px]">Домен</th>
              <th className="px-4 py-3 min-w-[600px]">Pretty Link</th>
              <th className="px-4 py-3 text-right w-[100px]">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {websites.map((site) => {
              const currentValue = getLinkValue(site);
              const isDirty = editingLinks[site.uuid] !== undefined && editingLinks[site.uuid] !== (site.pretty_link || "");
              const isSavingRow = saving[site.uuid];

              return (
                <tr key={site.uuid} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white align-top">
                    <div className="flex items-center gap-2 pt-2">
                        <span className="truncate max-w-[200px]" title={site.domain}>{site.domain}</span>
                        <a 
                            href={`https://${site.domain}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-slate-500 hover:text-amber-400 flex-shrink-0"
                        >
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Textarea
                      value={currentValue}
                      onChange={(e) => handleChange(site.uuid, e.target.value)}
                      placeholder="https://..."
                      className="w-full min-h-[3rem] bg-slate-950/50 border-white/10 focus:border-amber-400/50 resize-y font-mono text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-right align-top pt-3">
                    {isDirty && (
                      <Button
                        onClick={() => handleSave(site)}
                        disabled={isSavingRow}
                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        {isSavingRow ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 mr-1" />
                        )}
                        Зберегти
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
