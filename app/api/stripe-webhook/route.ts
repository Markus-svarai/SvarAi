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

async function getClinicForWelcome(clinicId: string): Promise<{ name: string; contact_email: string; admin_password: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/clinics?id=eq.${encodeURIComponent(clinicId)}&select=name,contact_email,admin_password&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch { return null; }
}

async function sendActivationEmail(clinic: { name: string; contact_email: string; admin_password: string }, clinicId: string, isTrial: boolean) {
  const adminUrl = `https://svarai.no/admin?clinicId=${encodeURIComponent(clinicId)}`;
  const widgetUrl = `https://svarai.no/widget?id=${clinicId}`;
  const embedCode = `&lt;iframe\n  src="https://svarai.no/widget?id=${clinicId}"\n  width="420" height="620"\n  frameborder="0"\n  style="border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);"\n&gt;&lt;/iframe&gt;`;
  const subject = isTrial
    ? `Prøveperioden din har startet – ${clinic.name}`
    : `Abonnementet er aktivert – ${clinic.name}`;
  const headline = isTrial
    ? `14 dager gratis starter nå`
    : `AI-resepsjonisten din er aktiv`;
  const intro = isTrial
    ? `Prøveperioden din har startet. Du har 14 dager gratis, deretter 1 490 kr/mnd. Avbestill når som helst i admin-panelet.`
    : `Betalingen er bekreftet og AI-resepsjonisten din er klar til bruk.`;

  await sendEmail(
    clinic.contact_email,
    subject,
    `<div style="font-family: system-ui, sans-serif; max-width: 520px; color: #111;">
      <div style="background: #111827; border-radius: 12px 12px 0 0; padding: 20px 28px;">
        <span style="font-size: 18px; font-weight: 700; color: #fff;">SvarAI</span>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
        <h2 style="margin: 0 0 6px; font-size: 20px; color: #111827;">${headline}</h2>
        <p style="color: #6b7280; margin: 0 0 24px; font-size: 14px;">${intro}</p>

        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
          <p style="font-weight: 700; margin: 0 0 10px; color: #92400e; font-size: 13px;">Innloggingsdetaljer</p>
          <table style="font-size: 13px; width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 14px 4px 0; color: #78350f; font-weight: 600; width: 100px;">Admin-panel</td>
              <td><a href="${adminUrl}" style="color: #1a1a2e; font-size: 12px;">${adminUrl}</a></td>
            </tr>
            <tr>
              <td style="padding: 4px 14px 4px 0; color: #78350f; font-weight: 600;">Klinikk-ID</td>
              <td><code style="background: #fff; border: 1px solid #fcd34d; border-radius: 4px; padding: 2px 8px; font-family: monospace;">${clinicId}</code></td>
            </tr>
            <tr>
              <td style="padding: 4px 14px 4px 0; color: #78350f; font-weight: 600;">Passord</td>
              <td><code style="background: #fff; border: 1px solid #fcd34d; border-radius: 4px; padding: 2px 8px; font-family: monospace;">${clinic.admin_password}</code></td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 10px;">Tre steg for å komme i gang</h3>
        <ol style="padding-left: 18px; color: #374151; font-size: 14px; line-height: 1.9; margin: 0 0 24px;">
          <li><a href="${adminUrl}" style="color: #1ea67e;">Logg inn i admin</a> og sjekk tjenester, priser og åpningstider</li>
          <li><a href="${widgetUrl}" style="color: #1ea67e;">Test AI-chatten</a> som om du var en pasient</li>
          <li>Kopier embed-koden og lim den inn på nettsiden din</li>
        </ol>

        <div style="background: #111827; border-radius: 10px; padding: 14px; margin-bottom: 24px;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0 0 6px;">Embed-kode — lim inn på nettsiden din, før &lt;/body&gt;</p>
          <code style="color: #34d399; font-family: monospace; font-size: 11px; white-space: pre-wrap; display: block; line-height: 1.5;">${embedCode}</code>
        </div>

        <a href="${adminUrl}" style="display: inline-block; background: #1ea67e; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px;">
          Gå til admin-panelet
        </a>

        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Spørsmål? Svar på denne e-posten — vi hjelper deg.<br/>
          SvarAI · <a href="https://svarai.no" style="color: #9ca3af;">svarai.no</a>
        </p>
      </div>
    </div>`
  );
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
      // Stripe setter trial_end på subscription-objektet når prøveperiode er aktiv
      const hasTrial    = !!(obj.subscription && obj.amount_total === 0);

      if (clinicId) {
        await updateClinic(clinicId, {
          stripe_customer_id:    customerId,
          stripe_subscription_id: subsId,
          subscription_status:   "active",
        });

        // Send full velkomst-e-post til klinikken
        const clinic = await getClinicForWelcome(clinicId);
        if (clinic) {
          sendActivationEmail(clinic, clinicId, hasTrial).catch(() => {});
        }
      }

      // Varsle Markus
      await sendEmail(
        NOTIFY_EMAIL,
        `Ny betalende klinikk: ${clinicId}`,
        `<h2>Ny betalende klinikk!</h2>
         <p><strong>Klinikk-ID:</strong> ${clinicId}</p>
         <p><strong>E-post:</strong> ${email}</p>
         <p><strong>Stripe customer:</strong> ${customerId}</p>
         <p><strong>Prøveperiode:</strong> ${hasTrial ? "Ja (14 dager)" : "Nei"}</p>`
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

    // ── Prøveperiode utløper om 3 dager → send påminnelse ───────────────
    case "customer.subscription.trial_will_end": {
      const subsId = obj.id;
      const trialEnd: number = obj.trial_end; // Unix timestamp
      const trialEndDate = new Date(trialEnd * 1000).toLocaleDateString("nb-NO", {
        weekday: "long", day: "numeric", month: "long",
      });

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/clinics?stripe_subscription_id=eq.${encodeURIComponent(subsId)}&select=id,name,contact_email&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const rows = await res.json();
      const clinic = rows?.[0];

      if (clinic?.contact_email) {
        const adminUrl = `https://svarai.no/admin?clinicId=${encodeURIComponent(clinic.id)}`;
        await sendEmail(
          clinic.contact_email,
          `Prøveperioden din utløper ${trialEndDate}`,
          `<div style="font-family: system-ui, sans-serif; max-width: 520px; color: #111;">
            <div style="background: #111827; border-radius: 12px 12px 0 0; padding: 20px 28px;">
              <span style="font-size: 18px; font-weight: 700; color: #fff;">SvarAI</span>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">Prøveperioden utløper snart</h2>
              <p style="color: #6b7280; margin: 0 0 20px; font-size: 14px;">
                Hei ${clinic.name}, prøveperioden din utløper <strong>${trialEndDate}</strong>. Etter det belastes kortet ditt automatisk med 1 490 kr/mnd.
              </p>
              <p style="color: #374151; font-size: 14px; margin: 0 0 20px;">
                Ønsker du ikke å fortsette, kan du avbestille abonnementet enkelt i admin-panelet — ingen spørsmål stilt.
              </p>
              <a href="${adminUrl}" style="display: inline-block; background: #1ea67e; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                Gå til admin-panelet
              </a>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                SvarAI · <a href="https://svarai.no" style="color: #9ca3af;">svarai.no</a> · hei@svarai.no
              </p>
            </div>
          </div>`
        );
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
