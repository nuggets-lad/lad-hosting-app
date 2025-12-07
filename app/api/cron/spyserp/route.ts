import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SPYSERP_API_KEY = process.env.SPYSERP_API_KEY;
const SPYSERP_API_URL = "https://spyserp.com/panel/api";

// Helper to fetch with retries or simple wrapper
async function fetchSpySerp(params: Record<string, string>) {
  const payload = {
    token: SPYSERP_API_KEY,
    ...params,
  };

  const res = await fetch(SPYSERP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`SpySERP API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function syncSpySerpData(website_uuid?: string) {
  if (!SPYSERP_API_KEY) {
    throw new Error("SPYSERP_API_KEY not configured");
  }

  let query = supabase.from("websites").select("*");
  if (website_uuid) {
    query = query.eq("uuid", website_uuid);
  } else {
    query = query.not("spyserp_project_id", "is", null);
  }

  const { data: websites, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const results = [];

  for (const site of websites) {
    if (!site.spyserp_project_id || !site.spyserp_domain_id) continue;

    try {
      // --- 0. Fetch Project Columns to find Volume ID ---
      const columnsData = await fetchSpySerp({
        method: "projectColumns",
        project_id: site.spyserp_project_id.toString(),
      });
      
      // Always try to find the correct Volume column ID dynamically
      let volumeColumnId = null;
      if (columnsData.items) {
        const volCol = columnsData.items.find((c: any) => c.description === "Volume");
        if (volCol) {
          volumeColumnId = volCol.id.toString();
        }
      }
      // Fallback to saved ID if dynamic lookup failed (though unlikely)
      if (!volumeColumnId) {
         volumeColumnId = site.spyserp_valuemetric_id?.toString();
      }

      // --- 1. Fetch Statistics (Positions) ---
      // First, get the list of recent schedules (reports) to ensure we fetch the latest data
      const schedulesData = await fetchSpySerp({
        method: "projectSchedules",
        project_id: site.spyserp_project_id.toString(),
        page: "0",
        pageSize: "5"
      });

      const recentSchedules = schedulesData.items
        ?.filter((s: any) => s.status === 4) // 4 = completed successfully
        ?.map((s: any) => s.id) || [];

      if (recentSchedules.length === 0) {
        console.log(`[SpySERP] No recent completed schedules found for ${site.uuid}`);
        continue;
      }

      // Fetch stats for these specific schedules
      const statsData = await fetchSpySerp({
        method: "statistic",
        project_id: site.spyserp_project_id.toString(),
        domain: site.spyserp_domain_id.toString(),
        withcat: "1",
        schedules: recentSchedules.join(",")
      });

      console.log(`[SpySERP] Stats for ${site.uuid} (Schedules: ${recentSchedules.join(",")}):`, JSON.stringify(statsData).slice(0, 500));

      // Parse Stats
      let container = statsData.data;
      if (!container) {
         // If no .data property, assume the response itself is the container (map of schedule_id -> array)
         container = statsData;
      }

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
                  // Handle URL: SpySERP might return boolean false if no URL
                  const url = (arr[1] && typeof arr[1] === 'string') ? arr[1] : null;
                  
                  if (position !== null) {
                    console.log(`[SpySERP] Saving rank: kw=${keyword_id} date=${date_key} pos=${position} engine=${engine_id}`);
                    const { error: upsertError } = await supabase.from("seo_daily_ranks").upsert({
                      keyword_id,
                      date: date_key,
                      position,
                      url,
                      engine_id,
                      folder: site.spyserp_folder_name
                    }, { onConflict: "keyword_id, date, engine_id" });

                    if (upsertError) {
                      console.error(`Error upserting rank for kw ${keyword_id}:`, upsertError);
                    }
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

        if (page === 0) {
           console.log(`[SpySERP] Volume Data (Page 0) for ${site.uuid}:`, JSON.stringify(volData).slice(0, 500));
        }

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

        const metricId = volumeColumnId;
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
           
           if (volume !== null) {
             console.log(`[SpySERP] Saving volume: kw=${keyword_id} vol=${volume}`);
           }

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

  return { results };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("key");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncSpySerpData();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("key");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { website_uuid } = body;

  try {
    const result = await syncSpySerpData(website_uuid);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
