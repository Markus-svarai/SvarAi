import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// Verifiser Stripe webhook-signatur manuelt (ingen stripe-bibliotek nødvendig)
function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): boolean {
  const parts = sigHeader.split(",").reduce(
    (acc: Record<string, string>, part) => {
      const [key, val] = part.split("=");
      acc[key] = val;
      return acc;
    },
    {}
  );

  const timestamp = parts["t"];
  const signature = parts["v1"];

  if (!timestamp || !signature) return false;

  // Avvis hvis eldre enn 5 minutter
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > tolerance) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret ikke satt" }, { status: 500 });
  }

  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();

  if (!verifyStripeSignature(payload, sigHeader, webhookSecret)) {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  const event = JSON.parse(payload);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email ?? "ukjent";
    const customerName = session.customer_details?.name ?? "ukjent";
    const businessName =
      session.custom_fields?.find((f: { key: string }) => f.key === "klinikknavn")?.text?.value ??
      customerName;

    const clinicId = slugify(businessName);

    // Send e-post til Markus med aktiveringsdetaljer
    await notifyMarkus({ customerEmail, customerName, businessName, clinicId });
  }

  return NextResponse.json({ received: true });
}

async function notifyMarkus({
  customerEmail,
  customerName,
  businessName,
  clinicId,
}: {
  customerEmail: string;
  customerName: string;
  businessName: string;
  clinicId: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SvarAI <noreply@svarai.no>",
      to: process.env.LEAD_NOTIFY_EMAIL,
      subject: `🎉 Ny betaling: ${businessName}`,
      html: `
        <h2>Ny betalende klinikk!</h2>
        <p><strong>Klinikk:</strong> ${businessName}</p>
        <p><strong>Kontaktperson:</strong> ${customerName}</p>
        <p><strong>E-post:</strong> ${customerEmail}</p>
        <hr>
        <p><strong>Klinikk-ID:</strong> <code>${clinicId}</code></p>
        <p>Legg til denne IDen i <code>lib/active-clinics.ts</code> og push til GitHub:</p>
        <pre>"${clinicId}",</pre>
        <p>Widgeten aktiveres automatisk innen 30 sekunder etter push.</p>
      `,
    }),
  });
}
