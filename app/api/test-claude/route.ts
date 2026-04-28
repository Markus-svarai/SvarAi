import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY mangler" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        messages: [{ role: "user", content: "Si bare: OK" }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: data });
    }

    return NextResponse.json({ ok: true, reply: data.content?.[0]?.text });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) });
  }
}
