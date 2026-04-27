import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function sb(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// GET – hent alle ansatte for en klinikk
export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) return NextResponse.json([]);

  try {
    const staff = await sb(
      `/clinic_staff?clinic_id=eq.${encodeURIComponent(clinicId)}&order=created_at.asc`
    );
    return NextResponse.json(staff ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST – legg til eller oppdater ansatt
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });

  try {
    const body = await req.json();
    const { id, clinic_id, name, title, active } = body;

    if (!clinic_id || !name?.trim())
      return NextResponse.json({ error: "Klinikk-ID og navn er påkrevd." }, { status: 400 });

    const { ical_url } = body;
    const icalValue = ical_url?.trim() || null;

    if (id) {
      const updated = await sb(`/clinic_staff?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          title: title?.trim() ?? null,
          active: active ?? true,
          ical_url: icalValue,
        }),
      });
      return NextResponse.json(updated?.[0] ?? { ok: true });
    } else {
      const created = await sb("/clinic_staff", {
        method: "POST",
        body: JSON.stringify({
          clinic_id,
          name: name.trim(),
          title: title?.trim() ?? null,
          active: true,
          ical_url: icalValue,
        }),
      });
      return NextResponse.json(created?.[0] ?? { ok: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE – slett ansatt
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID mangler." }, { status: 400 });

    await sb(`/clinic_staff?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
