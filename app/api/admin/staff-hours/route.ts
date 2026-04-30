import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

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

// GET – hent arbeidsplan for en ansatt
export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  if (!staffId) return NextResponse.json({ error: "staffId mangler" }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json([]);

  try {
    const rows = await sb(
      `/clinic_staff_hours?staff_id=eq.${encodeURIComponent(staffId)}&order=id.asc`
    );

    // Returner alle 7 dager – fyll inn defaults for dager som mangler
    const existing = new Map((rows ?? []).map((r: any) => [r.day, r]));
    const result = DAYS.map(day => {
      const row = existing.get(day);
      return row
        ? { day, open: row.open ?? "08:00", close: row.close ?? "16:00", closed: row.closed ?? false }
        : { day, open: "08:00", close: "16:00", closed: true }; // default: stengt
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST – lagre arbeidsplan (alle 7 dager) for en ansatt
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });

  try {
    const { staffId, hours } = await req.json();
    if (!staffId || !Array.isArray(hours))
      return NextResponse.json({ error: "staffId og hours er påkrevd." }, { status: 400 });

    // Slett eksisterende og sett inn alle 7 dager på nytt
    await sb(`/clinic_staff_hours?staff_id=eq.${encodeURIComponent(staffId)}`, {
      method: "DELETE",
    });

    const rows = hours.map((h: { day: string; open: string; close: string; closed: boolean }) => ({
      staff_id: staffId,
      day: h.day,
      open: h.closed ? null : (h.open || "08:00"),
      close: h.closed ? null : (h.close || "16:00"),
      closed: h.closed,
    }));

    await sb(`/clinic_staff_hours`, {
      method: "POST",
      body: JSON.stringify(rows),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
