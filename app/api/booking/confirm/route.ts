import { NextRequest, NextResponse } from "next/server";
import {
  getBookingById,
  updateBooking,
  getActiveStaff,
  getBookingsAtSlot,
  getClinic,
} from "@/lib/supabase";
import { verifyToken } from "@/lib/booking-token";
import { sendSMS } from "@/lib/sms";

export const runtime = "nodejs";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://svarai.no";

function html(title: string, emoji: string, heading: string, body: string, color: string) {
  return new NextResponse(
    `<!DOCTYPE html><html lang="no"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title}</title></head>
    <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;">
      <div style="text-align:center;max-width:400px;padding:32px 24px;">
        <div style="font-size:56px;margin-bottom:16px;">${emoji}</div>
        <h1 style="font-size:22px;font-weight:700;color:#111;margin-bottom:8px;">${heading}</h1>
        <p style="font-size:15px;color:#6b7280;line-height:1.6;">${body}</p>
        <div style="margin-top:24px;padding:12px 20px;border-radius:8px;background:${color};display:inline-block;font-size:13px;font-weight:600;">
          Sendt fra SvarAI
        </div>
      </div>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function sendStaffConfirmEmail(
  booking: any,
  staffName: string,
  staffEmail: string,
  clinicName: string,
  isReassignment = false
) {
  if (!RESEND_API_KEY || !staffEmail) return;

  const token = (await import("@/lib/booking-token")).generateToken(booking.id);
  const confirmUrl = `${BASE_URL}/api/booking/confirm?id=${booking.id}&action=confirm&token=${token}`;
  const rejectUrl  = `${BASE_URL}/api/booking/confirm?id=${booking.id}&action=reject&token=${token}`;

  const subject = isReassignment
    ? `⏩ Videresendt booking: ${booking.service_name} – ${booking.name}`
    : `📅 Ny booking: ${booking.service_name} – ${booking.name}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "SvarAI <hei@svarai.no>",
      to: [staffEmail],
      subject,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;color:#111;">
          ${isReassignment ? `<p style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:13px;color:#92400e;">⏩ En kollega kunne ikke ta denne timen. Du er neste tilgjengelige.</p>` : ""}
          <h2 style="margin-bottom:4px;">${isReassignment ? "Videresendt booking" : "Ny bookingforespørsel"}</h2>
          <p style="color:#6b7280;margin-top:0;">Hei ${staffName}! En pasient ønsker time. Bekreft eller avvis nedenfor.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:20px 0;">
            <table style="font-size:14px;color:#374151;width:100%;border-collapse:collapse;">
              <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;width:110px;">Pasient</td><td>${booking.name}</td></tr>
              <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Telefon</td><td><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
              <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Behandling</td><td>${booking.service_name}</td></tr>
              <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Dato</td><td>${new Date(booking.date + "T00:00:00").toLocaleDateString("nb-NO", { weekday:"long", day:"numeric", month:"long" })}</td></tr>
              <tr><td style="padding:5px 12px 5px 0;font-weight:600;color:#6b7280;">Tid</td><td>kl. ${booking.time}</td></tr>
            </table>
          </div>
          <div style="display:flex;gap:12px;margin-top:24px;">
            <a href="${confirmUrl}" style="flex:1;text-align:center;padding:14px;background:#16a34a;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">✅ Bekreft time</a>
            <a href="${rejectUrl}" style="flex:1;text-align:center;padding:14px;background:#dc2626;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">❌ Avvis</a>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px;">
            Ref: ${booking.id} · ${clinicName} · Sendt fra SvarAI
          </p>
        </div>
      `,
    }),
  }).catch(err => console.error("[confirm] E-postfeil:", err));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id     = searchParams.get("id") ?? "";
  const action = searchParams.get("action") ?? "";
  const token  = searchParams.get("token") ?? "";

  if (!id || !token || !["confirm", "reject"].includes(action)) {
    return html("Ugyldig lenke", "⚠️", "Ugyldig lenke", "Denne lenken er ikke gyldig.", "#fee2e2");
  }

  if (!verifyToken(id, token)) {
    return html("Ugyldig token", "🔒", "Ugyldig sikkerhetstoken", "Lenken er ikke gyldig eller har utløpt.", "#fee2e2");
  }

  const booking = await getBookingById(id).catch(() => null);
  if (!booking) {
    return html("Ikke funnet", "🔍", "Booking ikke funnet", "Denne bookingen finnes ikke lenger.", "#fee2e2");
  }

  if (booking.status === "confirmed") {
    return html("Allerede bekreftet", "✅", "Allerede bekreftet", `Timen til ${booking.name} er allerede bekreftet.`, "#dcfce7");
  }
  if (booking.status === "cancelled") {
    return html("Avvist", "❌", "Booking avvist", "Denne bookingen er allerede avvist.", "#fee2e2");
  }

  const clinic = await getClinic(booking.clinic_id).catch(() => null);
  const clinicName = clinic?.name ?? "klinikken";
  const clinicPhone = clinic?.contact_phone ?? "";

  // ── BEKREFT ────────────────────────────────────────────────────────────────
  if (action === "confirm") {
    await updateBooking(id, { status: "confirmed" });

    // SMS til pasienten
    if (booking.phone) {
      await sendSMS(
        booking.phone,
        `Hei ${booking.name}! Timen din hos ${clinicName} er bekreftet ✅\n📅 ${new Date(booking.date + "T00:00:00").toLocaleDateString("nb-NO", { weekday:"long", day:"numeric", month:"long" })} kl. ${booking.time} – ${booking.service_name}.\nSpørsmål? Ring ${clinicPhone}.`
      );
    }

    return html(
      "Time bekreftet",
      "✅",
      "Time bekreftet!",
      `${booking.name} er nå bekreftet for ${booking.service_name} ${new Date(booking.date + "T00:00:00").toLocaleDateString("nb-NO", { day:"numeric", month:"long" })} kl. ${booking.time}. Pasienten har fått SMS.`,
      "#dcfce7"
    );
  }

  // ── AVVIS — prøv neste tilgjengelige ansatt ────────────────────────────────
  if (action === "reject") {
    await updateBooking(id, { status: "cancelled" });

    // Finn andre ledige ansatte for denne klinikken på samme tidspunkt
    const [allStaff, takenBookings] = await Promise.all([
      getActiveStaff(booking.clinic_id).catch(() => [] as any[]),
      getBookingsAtSlot(booking.clinic_id, booking.date, booking.time).catch(() => [] as any[]),
    ]);

    const takenStaffIds = new Set((takenBookings ?? []).map((b: any) => b.staff_id).filter(Boolean));
    const currentStaffId = booking.staff_id;

    // Neste tilgjengelige ansatt (ikke den som avviste, ikke allerede booket)
    const nextStaff = (allStaff ?? []).find(
      (s: any) => s.id !== currentStaffId && !takenStaffIds.has(s.id) && s.email
    );

    if (nextStaff) {
      // Lag ny booking for neste ansatt
      const { generateToken } = await import("@/lib/booking-token");
      const newBookingId = `${id}-R${Date.now().toString(36).toUpperCase()}`;
      const { saveBooking } = await import("@/lib/supabase");

      await saveBooking({
        ...booking,
        id: newBookingId,
        staff_id: nextStaff.id,
        staff_name: nextStaff.name,
        status: "pending",
        created_at: new Date().toISOString(),
      }).catch(console.error);

      await sendStaffConfirmEmail(
        { ...booking, id: newBookingId, staff_id: nextStaff.id, staff_name: nextStaff.name },
        nextStaff.name,
        nextStaff.email,
        clinicName,
        true
      );

      return html(
        "Avvist – videresendt",
        "⏩",
        "Avvist og videresendt",
        `Timen er sendt videre til ${nextStaff.name}. Pasienten venter på bekreftelse.`,
        "#fef3c7"
      );
    }

    // Ingen andre tilgjengelige — SMS til pasienten
    if (booking.phone) {
      await sendSMS(
        booking.phone,
        `Hei ${booking.name}. Dessverre er ikke den valgte timen tilgjengelig lenger. Vennligst ring oss på ${clinicPhone} så finner vi en ny tid som passer deg. Beklager ulempen!`
      );
    }

    return html(
      "Avvist",
      "❌",
      "Time avvist",
      `Ingen andre ansatte er ledige på dette tidspunktet. ${booking.name} har fått SMS om å ringe inn.`,
      "#fee2e2"
    );
  }

  return html("Feil", "⚠️", "Noe gikk galt", "Prøv igjen.", "#fee2e2");
}
