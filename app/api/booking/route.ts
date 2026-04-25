import { NextRequest, NextResponse } from "next/server";
import { clinicConfig, formatNok } from "@/lib/clinic-config";

export const runtime = "nodejs";

// Resend sender e-post til klinikken når noen booker.
// Klinikken ringer pasienten tilbake for å bekrefte.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.LEAD_NOTIFY_EMAIL || "Markus08aasheim@gmail.com";

type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
};

// Gjør dato mer lesbar: "2026-04-28" → "mandag 28. april 2026"
function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Sender e-post til klinikken med all booking-info
async function sendBookingEmail(booking: Booking, servicePriceNok: number): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("[booking] Ingen RESEND_API_KEY – logger booking lokalt:", booking);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SvarAI <hei@svarai.no>",
        to: [NOTIFY_EMAIL],
        subject: `📅 Ny booking: ${booking.serviceName} – ${booking.name}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 520px;">
            <h2 style="color: #1a1a2e; margin-bottom: 4px;">Ny booking fra ${clinicConfig.name}</h2>
            <p style="color: #6b7280; margin-top: 0;">En pasient har bestilt time via SvarAI. Ring for å bekrefte.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />

            <h3 style="font-size: 14px; color: #374151; margin-bottom: 8px;">📋 Bookingdetaljer</h3>
            <table style="font-size: 14px; color: #374151; width: 100%;">
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600; width: 120px;">Bookingnr.</td><td><strong>${booking.id}</strong></td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Behandling</td><td>${booking.serviceName}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Dato</td><td>${formatDate(booking.date)}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Tidspunkt</td><td>kl. ${booking.time}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Pris</td><td>${formatNok(servicePriceNok)}</td></tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />

            <h3 style="font-size: 14px; color: #374151; margin-bottom: 8px;">👤 Pasientinfo</h3>
            <table style="font-size: 14px; color: #374151; width: 100%;">
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600; width: 120px;">Navn</td><td>${booking.name}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Telefon</td><td><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">E-post</td><td><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="font-size: 13px; color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 8px;">
              ⚠️ <strong>Husk å ringe pasienten</strong> for å bekrefte timen. Bookingtidspunktet er valgt av pasienten selv og er ikke automatisk satt opp i kalendereren din ennå.
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">Sendt automatisk fra SvarAI · ${new Date(booking.createdAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[booking] Resend error:", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[booking] Feil ved sending av e-post:", err);
    return false;
  }
}

function validate(input: any): { ok: true; booking: Omit<Booking, "id" | "createdAt" | "serviceName"> } | { ok: false; error: string } {
  if (!input) return { ok: false, error: "Mangler data." };
  const { serviceId, date, time, name, phone, email } = input;

  if (typeof serviceId !== "string" || !clinicConfig.services.find(s => s.id === serviceId)) {
    return { ok: false, error: "Ugyldig tjeneste." };
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Ugyldig dato." };
  }
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, error: "Ugyldig tidspunkt." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, error: "Vennligst skriv inn fullt navn." };
  }
  if (typeof phone !== "string" || phone.replace(/\D/g, "").length < 8) {
    return { ok: false, error: "Vennligst skriv inn et gyldig telefonnummer." };
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Vennligst skriv inn en gyldig e-postadresse." };
  }

  return {
    ok: true,
    booking: { serviceId, date, time, name: name.trim(), phone: phone.trim(), email: email.trim() },
  };
}

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const result = validate(input);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const service = clinicConfig.services.find(s => s.id === result.booking.serviceId)!;

    const booking: Booking = {
      id: `SVR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      ...result.booking,
      serviceName: service.name,
      createdAt: new Date().toISOString(),
    };

    // Send e-post til klinikken
    await sendBookingEmail(booking, service.priceNok);

    return NextResponse.json({
      ok: true,
      booking,
      message: `Timen din er mottatt! Klinikken vil kontakte deg på ${booking.phone} for å bekrefte.`,
    });

  } catch (err: any) {
    console.error("[booking] Serverfeil:", err);
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen eller ring oss direkte." },
      { status: 500 }
    );
  }
}
