import { NextRequest, NextResponse } from "next/server";
import { formatNok } from "@/lib/clinic-config";
import { getClinicData } from "@/lib/get-clinic-data";
import { saveBooking, isSupabaseConfigured } from "@/lib/supabase";
import { generateToken } from "@/lib/booking-token";

export const runtime = "nodejs";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.LEAD_NOTIFY_EMAIL || "Markus08aasheim@gmail.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://svarai.no";

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

// Sender e-post til klinikken med Bekreft/Avvis-knapper + .ics vedlegg
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

  const token = generateToken(booking.id);
  const confirmUrl = `${BASE_URL}/api/booking/confirm?id=${booking.id}&action=confirm&token=${token}`;
  const rejectUrl  = `${BASE_URL}/api/booking/confirm?id=${booking.id}&action=reject&token=${token}`;

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
        subject: `📅 Ny bookingforespørsel: ${booking.serviceName} – ${booking.name}`,
        attachments: [
          {
            filename: `booking-${booking.id}.ics`,
            content: generateICS(booking, serviceDurationMinutes, clinicName),
          },
        ],
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;color:#111;">
            <h2 style="color:#1a1a2e;margin-bottom:4px;">Ny bookingforespørsel</h2>
            <p style="color:#6b7280;margin-top:0;">En pasient ønsker time hos ${clinicName}. Bekreft eller avvis nedenfor.</p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:20px 0;">
              <table style="font-size:14px;color:#374151;width:100%;border-collapse:collapse;">
                <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;width:110px;">Pasient</td><td><strong>${booking.name}</strong></td></tr>
                <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Telefon</td><td><a href="tel:${booking.phone}" style="color:#1a1a2e;">${booking.phone}</a></td></tr>
                <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">E-post</td><td><a href="mailto:${booking.email}" style="color:#1a1a2e;">${booking.email}</a></td></tr>
                <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Behandling</td><td>${booking.serviceName}</td></tr>
                <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Dato</td><td>${formatDate(booking.date)}</td></tr>
                <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Tidspunkt</td><td>kl. ${booking.time}</td></tr>
                <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Pris</td><td>${formatNok(servicePriceNok)}</td></tr>
                ${booking.staffName ? `<tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Ansatt</td><td>${booking.staffName}</td></tr>` : ""}
              </table>
            </div>

            <table style="width:100%;border-collapse:collapse;margin:24px 0;">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${confirmUrl}" style="display:block;text-align:center;padding:14px;background:#16a34a;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">✅ Bekreft time</a>
                </td>
                <td style="padding-left:8px;">
                  <a href="${rejectUrl}" style="display:block;text-align:center;padding:14px;background:#dc2626;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">❌ Avvis</a>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;color:#6b7280;background:#fef9c3;border:1px solid #fde68a;padding:12px;border-radius:8px;">
              💡 Klikker du <strong>Bekreft</strong> får pasienten automatisk SMS-bekreftelse. Klikker du <strong>Avvis</strong> prøver vi neste ledige ansatt automatisk.
            </p>
            <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Ref: ${booking.id} · Sendt automatisk fra SvarAI · ${new Date(booking.createdAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}</p>
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

    // Lagre i Supabase som "pending" – venter på bekreftelse fra klinikken
    if (isSupabaseConfigured()) {
      await saveBooking({
        id: booking.id,
        service_id: booking.serviceId,
        service_name: booking.serviceName,
        date: booking.date,
        time: booking.time,
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        clinic_id: clinicId,
        status: "pending",
        staff_id: staffId ?? null,
        staff_name: staffName ?? null,
        created_at: booking.createdAt,
      }).catch(err => console.error("[booking] Supabase save feil:", err));
    }

    // Send e-poster parallelt: klinikk + pasient
    // Demo-klinikk bruker alltid NOTIFY_EMAIL (env var eller fallback til Markus sin Gmail)
    const notifyEmail = clinicId === "demo"
      ? NOTIFY_EMAIL
      : (config.contact.email || NOTIFY_EMAIL);
    await Promise.all([
      sendBookingEmail(booking, service.priceNok, service.durationMinutes, config.name, notifyEmail),
      sendPatientReceiptEmail(booking, config.name, config.contact.phone),
    ]);

    return NextResponse.json({
      ok: true,
      booking,
      message: `Forespørselen er sendt! Du vil motta en SMS når klinikken bekrefter timen din.`,
    });

  } catch (err: any) {
    console.error("[booking] Serverfeil:", err);
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen eller ring oss direkte." },
      { status: 500 }
    );
  }
}
