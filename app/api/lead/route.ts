import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.LEAD_NOTIFY_EMAIL || "Markus08aasheim@gmail.com";

type Lead = {
  id: string;
  clinic: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

function generateId(): string {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sendNotification(lead: Lead): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("[lead] No RESEND_API_KEY set – skipping email notification.");
    console.log("[lead] Lead saved locally:", lead);
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
        subject: `🎯 Ny demo-forespørsel: ${lead.clinic}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px;">
            <h2 style="color: #1a1a2e; margin-bottom: 4px;">Ny lead fra svarai.no</h2>
            <p style="color: #6b7280; margin-top: 0;">Noen vil se en demo!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <table style="font-size: 14px; color: #374151;">
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Klinikk</td><td>${lead.clinic}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Navn</td><td>${lead.name}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">E-post</td><td><a href="mailto:${lead.email}">${lead.email}</a></td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Telefon</td><td><a href="tel:${lead.phone}">${lead.phone}</a></td></tr>
              <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Tidspunkt</td><td>${new Date(lead.createdAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">Sendt automatisk fra SvarAI</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[lead] Resend error:", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[lead] Failed to send email:", err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clinic, name, email, phone } = body;

    // Validation
    if (!clinic || !name || !email || !phone) {
      return NextResponse.json(
        { error: "Alle felt er påkrevd." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Ugyldig e-postadresse." },
        { status: 400 }
      );
    }

    const lead: Lead = {
      id: generateId(),
      clinic: String(clinic).trim(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      createdAt: new Date().toISOString(),
    };

    // Send email notification
    const emailSent = await sendNotification(lead);

    return NextResponse.json({
      success: true,
      id: lead.id,
      emailSent,
    });
  } catch (err: any) {
    console.error("[lead] Server error:", err);
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen." },
      { status: 500 }
    );
  }
}

