import { NextRequest, NextResponse } from "next/server";
import { getConversations, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";
  try {
    const rows = await getConversations(clinicId, 100);
    return NextResponse.json(rows ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
