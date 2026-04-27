import { NextRequest, NextResponse } from "next/server";
import { getHours, upsertHours, isSupabaseConfigured } from "@/lib/supabase";
import { clinicConfig } from "@/lib/clinic-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      clinicConfig.openingHours.map((h, i) => ({
        clinic_id: "demo",
        day: h.day,
        sort_order: i,
        open: h.open,
        close: h.close,
      }))
    );
  }

  try {
    const hours = await getHours(clinicId);
    return NextResponse.json(hours ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase ikke konfigurert" }, { status: 503 });
  }
  try {
    const { clinicId, hours } = await req.json();
    const rows = hours.map((h: any, i: number) => ({
      ...h,
      clinic_id: clinicId,
      sort_order: i,
    }));
    await upsertHours(rows);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
