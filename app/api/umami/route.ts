import { NextRequest, NextResponse } from "next/server";

const UMAMI_URL = process.env.UMAMI_URL?.trim();
const UMAMI_USER = process.env.UMAMI_USER?.trim();
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD?.trim();

// Simple in-memory cache for the token
let tokenCache: { token: string; expires: number } | null = null;

async function getUmamiToken() {
  if (!UMAMI_URL || !UMAMI_USER || !UMAMI_PASSWORD) {
    console.error("Umami credentials missing:", { 
      hasUrl: !!UMAMI_URL, 
      hasUser: !!UMAMI_USER, 
      hasPass: !!UMAMI_PASSWORD 
    });
    throw new Error("Umami credentials not configured");
  }

  // Return cached token if valid
  if (tokenCache && tokenCache.expires > Date.now()) {
    return tokenCache.token;
  }

  // Remove trailing slash if present
  const baseUrl = UMAMI_URL.replace(/\/$/, "");
  
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: UMAMI_USER, password: UMAMI_PASSWORD }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Umami] Auth failed with status ${res.status}. Response: ${errorText}`);
      throw new Error(`Umami Auth Failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const token = data.token;

    // Cache for 23 hours (usually valid for 24h)
    tokenCache = {
      token,
      expires: Date.now() + 23 * 60 * 60 * 1000,
    };

    return token;
  } catch (error) {
    console.error("Umami Login Error:", error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const websiteId = searchParams.get("websiteId");
  const range = searchParams.get("range") || "30d"; // 24h, 7d, 30d, 90d

  if (!websiteId) {
    return NextResponse.json({ error: "Missing websiteId" }, { status: 400 });
  }

  try {
    const token = await getUmamiToken();
    const baseUrl = UMAMI_URL?.replace(/\/$/, "");

    // Calculate start/end based on range
    const endAt = Date.now();
    let startAt = endAt - 30 * 24 * 60 * 60 * 1000; // Default 30d

    if (range === "24h") startAt = endAt - 24 * 60 * 60 * 1000;
    if (range === "7d") startAt = endAt - 7 * 24 * 60 * 60 * 1000;
    if (range === "30d") startAt = endAt - 30 * 24 * 60 * 60 * 1000;
    if (range === "90d") startAt = endAt - 90 * 24 * 60 * 60 * 1000;

    // Determine unit for chart
    let unit = "day";
    if (range === "24h") unit = "hour";
    if (range === "90d") unit = "month";

    // Fetch Stats (Pageviews, Visitors)
    // /api/websites/{websiteId}/stats
    const statsRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (!statsRes.ok) throw new Error(`Failed to fetch stats: ${statsRes.status}`);
    const stats = await statsRes.json();

    // Fetch Chart Data (Pageviews over time)
    // /api/websites/{websiteId}/pageviews
    const chartRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=${unit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!chartRes.ok) throw new Error(`Failed to fetch chart: ${chartRes.status}`);
    const chart = await chartRes.json();
    
    // Fetch Country Metrics
    // /api/websites/{websiteId}/metrics?type=country
    const metricsRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=country`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const countries = metricsRes.ok ? await metricsRes.json() : [];

    return NextResponse.json({ stats, chart, countries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
