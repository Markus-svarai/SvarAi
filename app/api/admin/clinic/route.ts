import { NextRequest, NextResponse } from "next/server";
import { getClinic, upsertClinic, isSupabaseConfigured } from "@/lib/supabase";
import { clinicConfig } from "@/lib/clinic-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      id: "demo",
      name: clinicConfig.name,
      type: clinicConfig.type,
      tagline: clinicConfig.tagline,
      address_street: clinicConfig.address.street,
      address_postal: clinicConfig.address.postalCode,
      address_city: clinicConfig.address.city,
      contact_phone: clinicConfig.contact.phone,
      contact_email: clinicConfig.contact.email,
      contact_website: clinicConfig.contact.website,
      cancellation_policy: clinicConfig.cancellationPolicy,
      booking_lead_hours: clinicConfig.bookingLeadHours,
    });
  }

  try {
    const clinic = await getClinic(clinicId);
    return NextResponse.json(clinic);
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
    const result = await upsertClinic({ ...body, updated_at: new Date().toISOString() });
    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
