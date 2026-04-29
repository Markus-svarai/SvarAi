import { NextRequest, NextResponse } from "next/server";
import { formatNok } from "@/lib/clinic-config";
import { getClinicData } from "@/lib/get-clinic-data";
import { saveBooking, isSupabaseConfigured } from "@/lib/supabase";

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
  staffId?: string;
  staffName?: string;
  createdAt: string;
};

// Genererer .ics kalenderfil som base64 for vedlegg i e-post
function generateICS(booking: Booking, durationMinutes: number, clinicName: string): string {
  // Parse dato og tid i norsk tidssone (Europe/Oslo)
  const [year, month, day] = booking.date.split("-").map(Number);
  const [hour, minute] = booking.time.split(":").map(Number);

  // Bygg start- og sluttid som lokal tid med TZID
  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
  const endDate = new Date(year, month - 1, day, hour, minute + durationMinutes);
  const dtEnd = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

  const uid = `${booking.id}@svarai.no`;
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SvarAI//SvarAI Booking//NO",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/Oslo:${dtStart}`,
    `DTEND;TZID=Europe/Oslo:${dtEnd}`,
    `SUMMARY:${booking.name} – ${booking.serviceName}`,
    `DESCRIPTION:Pasient: ${booking.name}\\nTelefon: ${booking.phone}\\nE-post: ${booking.email}\\nBookingnr: ${booking.id}`,
    `LOCATION:${clinicName}`,
    `STATUS:TENTATIVE`,
    `BEGIN:VALARM`,
    `TRIGGER:-PT60M`,
    `ACTION:DISPLAY`,
    `DESCRIPTION:Påminnelse: ${booking.name} – ${booking.serviceName}`,
    `END:VALARM`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return Buffer.from(ics).toString("base64");
}

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

// Sender e-post til pasienten: "vi har mottatt forespørselen din"
async function sendPatientReceiptEmail(
  booking: Booking,
  clinicName: string,
  clinicPhone: string,
): Promise<void> {
  if (!RESEND_API_KEY || !booking.email) return;
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
        subject: `Timeforespørsel mottatt – ${clinicName}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 520px; color: #111;">
            <h2 style="margin-bottom: 4px;">Vi har mottatt din forespørsel</h2>
            <p style="color: #6b7280; margin-top: 0;">
              Takk, ${booking.name}. Vi har registrert forespørselen din og vil ta kontakt snart for å bekrefte timen.
            </p>

            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 20px 0;">
              <table style="font-size: 14px; color: #374151; width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; width: 120px; color: #6b7280;">Behandling</td><td>${booking.serviceName}</td></tr>
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; color: #6b7280;">Dato</td><td>${formatDate(booking.date)}</td></tr>
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; color: #6b7280;">Tidspunkt</td><td>kl. ${booking.time}</td></tr>
                <tr><td style="padding: 5px 12px 5px 0; font-weight: 600; color: #6b7280;">Klinikk</td><td>${clinicName}</td></tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #374151;">
              Timen er ikke bekreftet ennå. Du vil motta en ny e-post når klinikken har bekreftet.
              Har du spørsmål kan du ringe oss på <a href="tel:${clinicPhone}" style="color: #1ea67e;">${clinicPhone}</a>.
            </p>

            <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
              Ref: ${booking.id} · Sendt automatisk fra SvarAI
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("[booking] Feil ved sending av pasient-kvittering:", err);
  }
}

// Sender e-post til klinikken med all booking-info + .ics vedlegg
async function sendBookingEmail(
  booking: Booking,
  servicePriceNok: number,
  serviceDurationMinutes: number,
  clinicName: string,
  notifyEmail: string
): Promise<boolean> {
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
        to: [notifyEmail],
        subject: `📅 Ny booking: ${booking.serviceName} – ${booking.name}`,
        attachments: [
          {
            filename: `booking-${booking.id}.ics`,
            content: generateICS(booking, serviceDurationMinutes, clinicName),
          },
        ],
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 520px;">
            <h2 style="color: #1a1a2e; margin-bottom: 4px;">Ny booking fra ${clinicName}</h2>
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

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    if (!input) return NextResponse.json({ error: "Mangler data." }, { status: 400 });

    const clinicId: string = typeof input.clinicId === "string" ? input.clinicId : "demo";

    // Hent klinikk-data dynamisk (fra Supabase eller fallback)
    const config = await getClinicData(clinicId);

    const { serviceId, date, time, name, phone, email, staffId, staffName } = input;

    // Validering
    if (typeof serviceId !== "string" || !config.services.find(s => s.id === serviceId)) {
      return NextResponse.json({ error: "Ugyldig tjeneste." }, { status: 400 });
    }
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Ugyldig dato." }, { status: 400 });
    }
    if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Ugyldig tidspunkt." }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Vennligst skriv inn fullt navn." }, { status: 400 });
    }
    if (typeof phone !== "string" || phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Vennligst skriv inn et gyldig telefonnummer." }, { status: 400 });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Vennligst skriv inn en gyldig e-postadresse." }, { status: 400 });
    }

    const service = config.services.find(s => s.id === serviceId)!;

    const booking: Booking = {
      id: `SVR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      serviceId,
      serviceName: service.name,
      date,
      time,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      staffId: staffId ?? undefined,
      staffName: staffName ?? undefined,
      createdAt: new Date().toISOString(),
    };

    // Lagre i Supabase (hvis konfigurert)
    if (isSupabaseConfigured()) {
      await saveBooking({
        ...booking,
        clinic_id: clinicId,
        staff_id: staffId ?? null,
        staff_name: staffName ?? null,
      }).catch(err => console.error("[booking] Supabase save feil:", err));
    }

    // Send e-poster parallelt: klinikk + pasient
    const notifyEmail = config.contact.email || NOTIFY_EMAIL;
    await Promise.all([
      sendBookingEmail(booking, service.priceNok, service.durationMinutes, config.name, notifyEmail),
      sendPatientReceiptEmail(booking, config.name, config.contact.phone),
    ]);

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
