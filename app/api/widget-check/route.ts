import { NextRequest, NextResponse } from "next/server";
import { isClinicActive } from "@/lib/active-clinics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id || !isClinicActive(id)) {
    return NextResponse.json({ active: false }, { status: 403 });
  }
  return NextResponse.json({ active: true });
}
