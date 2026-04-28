import { NextRequest, NextResponse } from "next/server";
import { getBookings, isSupabaseConfigured } from "@/lib/supabase";
import { getClinicData } from "@/lib/get-clinic-data";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

async function sb(path: string, options: RequestInit = {}) {
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
  const clinicId = req.nextUrl.searchParams.get("clinicId") ?? "demo";

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const bookings = await getBookings(clinicId);
    return NextResponse.json(bookings ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendConfirmationEmail(booking: any, clinicName: string, clinicPhone: string) {
  if (!RESEND_API_KEY || !booking?.email) return;

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("nb-NO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SvarAI <hei@svarai.no>",
        to: [booking.email],
        subject: `Din time er bekreftet – ${clinicName}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 520px; color: #111;">
            <h2 style="margin-bottom: 4px;">Din time er bekreftet</h2>
            <p style="color: #6b7280; margin-top: 0;">
              Hei ${booking.name}, vi gleder oss til å se deg.
            </p>

            <div style="background: #f0faf6; border: 1px solid #86efac; border-radius: 10px; padding: 16px; margin: 20px 0;">
              <table style="font-size: 14px; color: #374151; width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; width: 120px; color: #6b7280;">Behandling</td><td>${booking.service_name}</td></tr>
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; color: #6b7280;">Dato</td><td>${formatDate(booking.date)}</td></tr>
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; color: #6b7280;">Tidspunkt</td><td>kl. ${booking.time}</td></tr>
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; color: #6b7280;">Klinikk</td><td>${clinicName}</td></tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #374151;">
              Hvis du trenger å avbestille eller endre timen, ring oss på
              <a href="tel:${clinicPhone}" style="color: #1ea67e;">${clinicPhone}</a>.
            </p>

            <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
              Ref: ${booking.id} · Sendt automatisk fra SvarAI
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("[admin/bookings] Feil ved sending av bekreftelse til pasient:", err);
  }
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) return NextResponse.json({ error: "Booking-ID mangler." }, { status: 400 });
    const allowed = ["pending", "confirmed", "cancelled"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Ugyldig status." }, { status: 400 });
    }

    // Hent booking FØR oppdatering (trenger clinic_id og pasientinfo)
    const existing = await sb(`/bookings?id=eq.${encodeURIComponent(id)}&limit=1`);
    const booking = existing?.[0];

    const updated = await sb(`/bookings?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    // Send bekreftelse til pasient kun ved "confirmed"
    if (status === "confirmed" && booking?.email && booking?.clinic_id) {
      try {
        const config = await getClinicData(booking.clinic_id);
        sendConfirmationEmail(booking, config.name, config.contact.phone).catch(() => {});
      } catch { /* ikke krasj hele requesten */ }
    }

    return NextResponse.json(updated?.[0] ?? { ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
