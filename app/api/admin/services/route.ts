import { NextRequest, NextResponse } from "next/server";
import { getServices, upsertService, deleteService, isSupabaseConfigured } from "@/lib/supabase";
import { clinicConfig } from "@/lib/clinic-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) {
    // Fallback til hardkodet config
    return NextResponse.json(
      clinicConfig.services.map(s => ({
        id: s.id,
        clinic_id: "demo",
        name: s.name,
        description: s.description,
        duration_minutes: s.durationMinutes,
        price_nok: s.priceNok,
        active: true,
      }))
    );
  }

  try {
    const services = await getServices(clinicId);
    return NextResponse.json(services ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase ikke konfigurert" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const result = await upsertService(body);
    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase ikke konfigurert" }, { status: 503 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Mangler id" }, { status: 400 });
  try {
    await deleteService(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
