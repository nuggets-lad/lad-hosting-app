import { NextResponse } from "next/server";

const SPYSERP_API_KEY = process.env.SPYSERP_API_KEY;
const SPYSERP_API_URL = "https://spyserp.com/panel/api";

export async function POST(req: Request) {
  if (!SPYSERP_API_KEY) {
    return NextResponse.json({ error: "SPYSERP_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { method, ...params } = body;

    if (!method) {
      return NextResponse.json({ error: "Method is required" }, { status: 400 });
    }

    // Construct the request payload for SpySERP
    // SpySERP expects JSON body for POST requests
    const payload = {
      token: SPYSERP_API_KEY,
      method,
      ...params,
    };

    const response = await fetch(SPYSERP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `SpySERP API error: ${response.status}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("SpySERP Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
