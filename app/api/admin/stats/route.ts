import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function query(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });
  }

  // Hent alle bookinger for klinikken
  const bookings = await query(
    `bookings?clinic_id=eq.${encodeURIComponent(clinicId)}&select=id,status,service_name,date,created_at&order=date.desc`
  );

  // Hent samtaler
  const conversations = await query(
    `conversations?clinic_id=eq.${encodeURIComponent(clinicId)}&select=id,ended_in_booking,has_unanswered,created_at`
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Bookinger denne måneden
  const thisMonth = bookings.filter((b: any) =>
    new Date(b.created_at) >= startOfMonth
  );
  const lastMonth = bookings.filter((b: any) => {
    const d = new Date(b.created_at);
    return d >= startOfLastMonth && d <= endOfLastMonth;
  });

  // Status-fordeling
  const byStatus = bookings.reduce((acc: Record<string, number>, b: any) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  // Tjeneste-fordeling
  const byService = bookings.reduce((acc: Record<string, number>, b: any) => {
    const name = b.service_name ?? "Ukjent";
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  // Bookinger per dag siste 30 dager
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    dailyMap[d.toLocaleDateString("sv-SE")] = 0;
  }
  bookings.forEach((b: any) => {
    const day = b.date?.slice(0, 10);
    if (day && dailyMap[day] !== undefined) dailyMap[day]++;
  });
  const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  // Samtale-stats
  const totalConversations = conversations.length;
  const thisMonthConversations = conversations.filter((c: any) =>
    new Date(c.created_at) >= startOfMonth
  ).length;
  const unanswered = conversations.filter((c: any) => c.has_unanswered).length;

  return NextResponse.json({
    bookings: {
      total: bookings.length,
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      byStatus,
      byService,
      daily,
    },
    conversations: {
      total: totalConversations,
      thisMonth: thisMonthConversations,
      unanswered,
    },
  });
}
