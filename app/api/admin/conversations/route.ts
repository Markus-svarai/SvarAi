import { NextRequest, NextResponse } from "next/server";
import { getConversations, deleteOldConversations, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";
  try {
    // Slett samtaler eldre enn 30 dager automatisk
    deleteOldConversations(clinicId, 30).catch(() => {});

    const rows = await getConversations(clinicId, 100);
    return NextResponse.json(rows ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
