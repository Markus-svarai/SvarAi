import { NextRequest, NextResponse } from "next/server";
import { getBookingsByDate, getClinic, isSupabaseConfigured } from "@/lib/supabase";
import { sendSMS, isTwilioConfigured } from "@/lib/sms";

export const runtime = "nodejs";

// Vercel Cron kaller dette endepunktet kl. 09:00 norsk tid (07:00 UTC) hver dag.
// Det sender SMS-påminnelse til alle pasienter med time i morgen.

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(req: NextRequest) {
  // Sikkerhet: kun Vercel Cron eller requests med riktig secret
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Supabase ikke konfigurert" });
  }

  // Finn morgendagens dato (norsk tid)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" }); // "2026-04-30"

  try {
    const bookings = await getBookingsByDate(tomorrowDate);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ sent: 0, date: tomorrowDate });
    }

    let sent = 0;
    let skipped = 0;

    // Cache klinikknavn for å unngå doble oppslag
    const clinicCache: Record<string, string> = {};

    for (const booking of bookings) {
      if (!booking.phone) { skipped++; continue; }

      // Hent klinikkens navn
      let clinicName = clinicCache[booking.clinic_id];
      if (!clinicName) {
        const clinic = await getClinic(booking.clinic_id).catch(() => null);
        clinicName = clinic?.name ?? "klinikken";
        clinicCache[booking.clinic_id] = clinicName;
      }

      const message =
        `Hei ${booking.name}! 👋 Påminnelse om din time hos ${clinicName} i morgen kl. ${booking.time} – ${booking.service_name}. ` +
        `Kan ikke møte? Kontakt oss så snart som mulig. Vi gleder oss til å se deg!`;

      const ok = await sendSMS(booking.phone, message);
      if (ok) sent++;
      else skipped++;
    }

    console.log(`[reminders] ${tomorrowDate}: sendt ${sent}, hoppet over ${skipped}`);
    return NextResponse.json({ sent, skipped, date: tomorrowDate });

  } catch (err: any) {
    console.error("[reminders] Feil:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
