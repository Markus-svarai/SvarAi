import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function sb(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const t = await res.text();
  return t ? JSON.parse(t) : [];
}

export async function GET(req: NextRequest) {
  const adminPw = process.env.ADMIN_PASSWORD;
  const token = req.nextUrl.searchParams.get("token");

  if (!adminPw || token !== adminPw) {
    return NextResponse.json({ error: "Ikke autorisert." }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json([]);
  }

  try {
    // Hent alle klinikker
    const clinics = await sb(`/clinics?select=id,name,type,contact_email,subscription_status,created_at&order=created_at.desc`);

    // Hent booking-telling per klinikk
    const bookings = await sb(`/bookings?select=clinic_id`);
    const bookingCounts: Record<string, number> = {};
    for (const b of bookings ?? []) {
      bookingCounts[b.clinic_id] = (bookingCounts[b.clinic_id] ?? 0) + 1;
    }

    // Hent siste booking per klinikk
    const lastBookings = await sb(`/bookings?select=clinic_id,created_at&order=created_at.desc&limit=500`);
    const lastActivity: Record<string, string> = {};
    for (const b of lastBookings ?? []) {
      if (!lastActivity[b.clinic_id]) lastActivity[b.clinic_id] = b.created_at;
    }

    // Hent samtale-statistikk per klinikk
    const conversations = await sb(`/conversations?select=clinic_id,ended_in_booking,updated_at&order=updated_at.desc&limit=2000`);
    const convCounts: Record<string, number> = {};
    const convBookings: Record<string, number> = {};
    const convActivity: Record<string, string> = {};
    for (const c of conversations ?? []) {
      convCounts[c.clinic_id] = (convCounts[c.clinic_id] ?? 0) + 1;
      if (c.ended_in_booking) convBookings[c.clinic_id] = (convBookings[c.clinic_id] ?? 0) + 1;
      if (!convActivity[c.clinic_id]) convActivity[c.clinic_id] = c.updated_at;
    }

    const result = (clinics ?? []).map((c: any) => {
      const convTotal = convCounts[c.id] ?? 0;
      const convBooked = convBookings[c.id] ?? 0;
      // Siste aktivitet: nyeste av booking og samtale
      const lastA = lastActivity[c.id] ?? null;
      const lastC = convActivity[c.id] ?? null;
      const last_activity = !lastA ? lastC : !lastC ? lastA :
        new Date(lastA) > new Date(lastC) ? lastA : lastC;
      return {
        ...c,
        booking_count: bookingCounts[c.id] ?? 0,
        conversation_count: convTotal,
        booking_rate: convTotal > 0 ? Math.round((convBooked / convTotal) * 100) : null,
        last_activity,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
