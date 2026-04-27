import { NextRequest, NextResponse } from "next/server";
import { getBookings, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) {
    // Returner tom liste hvis Supabase ikke er satt opp ennå
    return NextResponse.json([]);
  }

  try {
    const bookings = await getBookings(clinicId);
    return NextResponse.json(bookings ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
