import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const RESEND_KEY   = process.env.RESEND_API_KEY ?? "";
const NOTIFY_EMAIL = process.env.LEAD_NOTIFY_EMAIL ?? "Markus08aasheim@gmail.com";

// ── Stripe signatur-verifisering ───────────────────────────────────────────

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  const parts = sigHeader.split(",").reduce((acc: Record<string, string>, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});

  const { t, v1 } = parts;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(t)) > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${payload}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
}

// ── Supabase helper ────────────────────────────────────────────────────────

async function updateClinic(clinicId: string, data: Record<string, any>) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/clinics?id=eq.${encodeURIComponent(clinicId)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
}

// ── E-postvarsler ──────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "SvarAI <hei@svarai.no>", to: [to], subject, html }),
  }).catch(err => console.error("[webhook] e-post feil:", err));
}

// ── Webhook handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret ikke satt" }, { status: 500 });
  }

  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const payload   = await req.text();

  if (!verifyStripeSignature(payload, sigHeader, webhookSecret)) {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  const event = JSON.parse(payload);
  const obj   = event.data.object;

  switch (event.type) {

    // ── Betaling fullført → aktiver klinikk ─────────────────────────────
    case "checkout.session.completed": {
      const clinicId    = obj.metadata?.clinic_id ?? obj.client_reference_id;
      const customerId  = obj.customer;
      const subsId      = obj.subscription;
      const email       = obj.customer_details?.email;

      if (clinicId) {
        await updateClinic(clinicId, {
          stripe_customer_id:    customerId,
          stripe_subscription_id: subsId,
          subscription_status:   "active",
        });
      }

      // Varsle Markus
      await sendEmail(
        NOTIFY_EMAIL,
        `🎉 Ny betalende klinikk: ${clinicId}`,
        `<h2>Ny betalende klinikk!</h2>
         <p><strong>Klinikk-ID:</strong> ${clinicId}</p>
         <p><strong>E-post:</strong> ${email}</p>
         <p><strong>Stripe customer:</strong> ${customerId}</p>`
      );
      break;
    }

    // ── Abonnement fornyet / aktivt ──────────────────────────────────────
    case "invoice.payment_succeeded": {
      const subsId = obj.subscription;
      if (subsId) {
        // Finn klinikk via subscription ID
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/clinics?stripe_subscription_id=eq.${encodeURIComponent(subsId)}&select=id&limit=1`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        const rows = await res.json();
        const clinicId = rows?.[0]?.id;
        if (clinicId) {
          await updateClinic(clinicId, { subscription_status: "active" });
        }
      }
      break;
    }

    // ── Betaling feilet → varsle klinikk ────────────────────────────────
    case "invoice.payment_failed": {
      const subsId    = obj.subscription;
      const email     = obj.customer_email;

      if (subsId) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/clinics?stripe_subscription_id=eq.${encodeURIComponent(subsId)}&select=id,name&limit=1`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        const rows = await res.json();
        const clinic = rows?.[0];
        if (clinic) {
          await updateClinic(clinic.id, { subscription_status: "past_due" });
          if (email) {
            await sendEmail(
              email,
              "Betalingen din til SvarAI feilet",
              `<p>Hei,</p>
               <p>Vi klarte dessverre ikke å trekke betalingen for SvarAI-abonnementet ditt.</p>
               <p>Logg inn på <a href="https://svarai.no/admin">admin-panelet</a> for å oppdatere betalingsinformasjonen.</p>
               <p>– Teamet i SvarAI</p>`
            );
          }
        }
      }
      break;
    }

    // ── Abonnement avsluttet → deaktiver klinikk ────────────────────────
    case "customer.subscription.deleted": {
      const subsId = obj.id;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/clinics?stripe_subscription_id=eq.${encodeURIComponent(subsId)}&select=id&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const rows = await res.json();
      const clinicId = rows?.[0]?.id;
      if (clinicId) {
        await updateClinic(clinicId, { subscription_status: "cancelled" });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
