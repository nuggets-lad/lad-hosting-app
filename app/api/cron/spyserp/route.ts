import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SPYSERP_API_KEY = process.env.SPYSERP_API_KEY;
const SPYSERP_API_URL = "https://spyserp.com/panel/api";

// Helper to fetch with retries or simple wrapper
async function fetchSpySerp(params: Record<string, string>) {
  const url = new URL(SPYSERP_API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  // Add API key
  if (SPYSERP_API_KEY) {
    url.searchParams.append("key", SPYSERP_API_KEY);
  }
  
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    throw new Error(`SpySERP API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  if (!SPYSERP_API_KEY) {
    return NextResponse.json({ error: "SPYSERP_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { website_uuid } = body;

  let query = supabase.from("websites").select("*");
  if (website_uuid) {
    query = query.eq("uuid", website_uuid);
  } else {
    query = query.not("spyserp_project_id", "is", null);
  }

  const { data: websites, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const site of websites) {
    if (!site.spyserp_project_id || !site.spyserp_domain_id) continue;

    try {
      // --- 1. Fetch Statistics (Positions) ---
      const statsData = await fetchSpySerp({
        method: "statistic",
        project_id: site.spyserp_project_id.toString(),
        domain: site.spyserp_domain_id.toString(),
        withcat: "1",
      });

      // Parse Stats
      const container = statsData.data;
      if (container && typeof container === 'object' && !Array.isArray(container)) {
        for (const [reportId, arr] of Object.entries(container)) {
          if (!Array.isArray(arr)) continue;

          for (const r of arr) {
            // r is a report entry
            const date_key = r.report_completion_time 
              ? new Date(Number(r.report_completion_time) * 1000).toISOString().slice(0, 10) 
              : new Date().toISOString().slice(0, 10);

            if (!Array.isArray(r.data)) continue;
            
            for (const cat of r.data) {
              // cat.category_id, cat.category
              if (!Array.isArray(cat.data)) continue;

              for (const kw of cat.data) {
                const spyserp_key_id = Number(kw.key_id);
                const keyword = kw.keyword;
                const engines = kw.data || {};

                // Upsert Keyword
                // We need to get our internal ID for this keyword
                const { data: kwRecord, error: kwError } = await supabase
                  .from("seo_keywords")
                  .select("id")
                  .eq("website_id", site.uuid)
                  .eq("keyword", keyword)
                  .single();

                let keyword_id;
                if (kwRecord) {
                  keyword_id = kwRecord.id;
                } else {
                  const { data: newKw, error: newKwError } = await supabase
                    .from("seo_keywords")
                    .insert({
                      website_id: site.uuid,
                      keyword: keyword,
                      spyserp_key_id: spyserp_key_id
                    })
                    .select("id")
                    .single();
                  if (newKw) keyword_id = newKw.id;
                }

                if (!keyword_id) continue;

                for (const [engineStr, payload] of Object.entries(engines)) {
                  const engine_id = Number(engineStr);
                  const arr = Array.isArray(payload) ? payload : [];
                  
                  const position = arr[0] != null && arr[0] !== '' ? Number(arr[0]) : null;
                  const url = arr[1] ?? null;
                  
                  if (position !== null) {
                    await supabase.from("seo_daily_ranks").upsert({
                      keyword_id,
                      date: date_key,
                      position,
                      url,
                      engine_id,
                      folder: site.spyserp_folder_name
                    }, { onConflict: "keyword_id, date, engine_id" });
                  }
                }
              }
            }
          }
        }
      }

      // --- 2. Fetch Volumes (Project Keywords) ---
      // We need to handle pagination if there are many keywords
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const volData = await fetchSpySerp({
          method: "projectKeywords",
          project_id: site.spyserp_project_id.toString(),
          domain: site.spyserp_domain_id.toString(),
          withColumns: "1",
          page: page.toString()
        });

        const items = volData.items || [];
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        const totalCount = volData.totalCount || 0;
        if ((page + 1) * 20 >= totalCount) {
          hasMore = false;
        } else {
          page++;
        }

        const metricId = site.spyserp_valuemetric_id?.toString();
        const engineId = site.spyserp_engine_id; // Default engine for volume?
        const dateKey = new Date().toISOString().slice(0, 10);

        for (const it of items) {
           const spyserp_key_id = Number(it.key_id);
           const keyword = (typeof it.key === 'string' && it.key.trim() !== '') ? it.key.trim() : null;
           
           if (!keyword) continue;

           // Find keyword ID
           const { data: kwRecord } = await supabase
             .from("seo_keywords")
             .select("id")
             .eq("website_id", site.uuid)
             .eq("keyword", keyword)
             .single();
            
           // If keyword doesn't exist from stats sync, we might want to create it or skip
           // Let's create it if missing
           let keyword_id = kwRecord?.id;
           if (!keyword_id) {
              const { data: newKw } = await supabase
                .from("seo_keywords")
                .insert({
                  website_id: site.uuid,
                  keyword: keyword,
                  spyserp_key_id: spyserp_key_id
                })
                .select("id")
                .single();
              keyword_id = newKw?.id;
           }

           if (!keyword_id) continue;

           const volRaw = (it.columnData && metricId) ? it.columnData[metricId] : undefined;
           const volume = volRaw ? Number(volRaw) : null;

           if (volume !== null && engineId) {
             await supabase.from("seo_daily_volumes").upsert({
               keyword_id,
               date: dateKey,
               volume,
               engine_id: engineId
             }, { onConflict: "keyword_id, date, engine_id" });
           }
        }
      }

      results.push({ uuid: site.uuid, status: "success" });

    } catch (e: any) {
      console.error(`Error syncing site ${site.uuid}:`, e);
      results.push({ uuid: site.uuid, status: "error", message: e.message });
    }
  }

  return NextResponse.json({ results });
}
