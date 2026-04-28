import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BASE_URL          = process.env.NEXT_PUBLIC_BASE_URL ?? "https://svarai.no";

async function getStripeCustomerId(clinicId: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clinics?id=eq.${encodeURIComponent(clinicId)}&select=stripe_customer_id&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const rows = await res.json();
  return rows?.[0]?.stripe_customer_id ?? null;
}

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe ikke konfigurert." }, { status: 503 });
  }

  try {
    const { clinicId } = await req.json();
    if (!clinicId) return NextResponse.json({ error: "clinicId mangler." }, { status: 400 });

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });
    }

    const customerId = await getStripeCustomerId(clinicId);
    if (!customerId) {
      return NextResponse.json({ error: "Ingen Stripe-kunde funnet for denne klinikken." }, { status: 404 });
    }

    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer:     customerId,
        return_url:   `${BASE_URL}/admin?clinicId=${encodeURIComponent(clinicId)}`,
      }).toString(),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Stripe portal feil");

    return NextResponse.json({ url: data.url });
  } catch (err: any) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
