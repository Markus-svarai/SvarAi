import { NextRequest, NextResponse } from "next/server";
import { getBookings, isSupabaseConfigured } from "@/lib/supabase";

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

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const bookings = await getBookings(clinicId);
    return NextResponse.json(bookings ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) return NextResponse.json({ error: "Booking-ID mangler." }, { status: 400 });
    const allowed = ["pending", "confirmed", "cancelled"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Ugyldig status." }, { status: 400 });
    }

    const updated = await sb(`/bookings?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    return NextResponse.json(updated?.[0] ?? { ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
