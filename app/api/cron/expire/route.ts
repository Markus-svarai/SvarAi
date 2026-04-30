import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, updateBooking } from "@/lib/supabase";
import { sendSMS } from "@/lib/sms";
import { getClinic } from "@/lib/supabase";

export const runtime = "nodejs";

// Kjøres hvert 30. minutt via Vercel Cron.
// Finner alle pending bookinger eldre enn 2 timer og avlyser dem automatisk.

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function supabaseFetch(path: string, options: RequestInit = {}) {
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
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Supabase ikke konfigurert" });
  }

  try {
    // Finn alle pending bookinger eldre enn 2 timer
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const expiredBookings = await supabaseFetch(
      `/bookings?status=eq.pending&created_at=lt.${encodeURIComponent(cutoff)}`
    );

    if (!expiredBookings || expiredBookings.length === 0) {
      return NextResponse.json({ cancelled: 0 });
    }

    let cancelled = 0;
    const clinicCache: Record<string, any> = {};

    for (const booking of expiredBookings) {
      // Oppdater status til cancelled
      await updateBooking(booking.id, { status: "cancelled" }).catch(console.error);

      // Hent klinikk-info for SMS
      let clinic = clinicCache[booking.clinic_id];
      if (!clinic) {
        clinic = await getClinic(booking.clinic_id).catch(() => null);
        clinicCache[booking.clinic_id] = clinic;
      }
      const clinicPhone = clinic?.contact_phone ?? "";

      // Send SMS til pasienten
      if (booking.phone) {
        await sendSMS(
          booking.phone,
          `Hei ${booking.name}. Din timeforespørsel hos ${clinic?.name ?? "klinikken"} for ${booking.service_name} kunne dessverre ikke bekreftes innen rimelig tid. ` +
          `Vennligst ring oss på ${clinicPhone} for å booke en ny time. Beklager ulempene!`
        ).catch(console.error);
      }

      cancelled++;
      console.log(`[expire] Avlyst booking ${booking.id} for ${booking.name}`);
    }

    return NextResponse.json({ cancelled });

  } catch (err: any) {
    console.error("[expire] Feil:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
