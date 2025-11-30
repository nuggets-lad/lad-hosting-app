import { NextResponse } from "next/server";

export const maxDuration = 900; // Allow up to 15 minutes for AI processing

const AI_KEY = process.env.AI_KEY;
const AI_MODEL = process.env.AI_MODEL || "openai/gpt-4o"; // Default to a capable model if not set
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  if (!AI_KEY) {
    return NextResponse.json(
      { error: "AI_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const { messages, websiteContext } = await req.json();

    const systemPrompt = `You are an expert AI website assistant. You have access to the configuration of a website, including global settings (brand, domain, images, etc.) and the siteframe content (HTML/content structure).
    
Your goal is to help the user edit this information. You can answer questions about the current state or perform edits using the provided tools.

Current Website Context:
${JSON.stringify(websiteContext, null, 2)}

When the user asks to change something, use the appropriate tool to update the state. 
If the user asks to "save" or "deploy", explain that you have updated the local state and they need to press the "Зберегти" (Save) button in the UI to persist changes to the server.

IMPORTANT: When editing the siteframe content (HTML/CSS/JS), PREFER using the 'search' and 'replace' parameters of 'update_siteframe_content' to modify specific sections. This avoids truncating the file or hitting token limits.
Only use 'full_content' if you are rewriting the entire file or if the changes are too complex for search/replace.
When using 'search', ensure you include enough context (surrounding lines) so that the search string is unique and matches exactly.

Be concise and helpful. Respond in the language of the user (likely Ukrainian).`;

    const tools = [
      {
        type: "function",
        function: {
          name: "update_global_fields",
          description: "Update global website settings like brand, domain, images, etc.",
          parameters: {
            type: "object",
            properties: {
              brand: { type: "string" },
              pretty_link: { type: "string" },
              domain: { type: "string" },
              ref: { type: "string" },
              logo: { type: "string" },
              banner: { type: "string" },
              banner_mobile: { type: "string" },
              image_1: { type: "string" },
              image_2: { type: "string" },
              image_3: { type: "string" },
              image_4: { type: "string" },
              locale: { type: "string" },
              favicon: { type: "string" },
              global_code_after_head_open: { type: "string" },
              global_code_after_body_open: { type: "string" },
              login_button_text: { type: "string" },
              register_button_text: { type: "string" },
              bonus_button_text: { type: "string" },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_siteframe_content",
          description: "Update the siteframe content. You can either provide the full content or perform a search and replace operation.",
          parameters: {
            type: "object",
            properties: {
              full_content: { type: "string", description: "The new FULL content for the siteframe. Use this ONLY if you are rewriting the entire file." },
              search: { type: "string", description: "The exact string to search for in the current content. Must be unique." },
              replace: { type: "string", description: "The string to replace the search string with." },
            },
            required: [],
          },
        },
      },
    ];

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_KEY}`,
        "HTTP-Referer": "https://lad-hosting.com", // Optional, for OpenRouter rankings
        "X-Title": "LAD Hosting App", // Optional
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", errorText);
      return NextResponse.json(
        { error: `AI API returned error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in AI chat route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
