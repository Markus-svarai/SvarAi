import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_PRICE_ID   = process.env.STRIPE_PRICE_ID ?? "";
const BASE_URL          = process.env.NEXT_PUBLIC_BASE_URL ?? "https://svarai.no";

async function stripe(path: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Stripe feil");
  return data;
}

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Stripe ikke konfigurert." }, { status: 503 });
  }

  try {
    const { clinicId, clinicName, email } = await req.json();

    if (!clinicId || !email) {
      return NextResponse.json({ error: "clinicId og email er påkrevd." }, { status: 400 });
    }

    // Opprett Stripe Checkout-session
    const session = await stripe("/checkout/sessions", {
      "mode":                        "subscription",
      "line_items[0][price]":        STRIPE_PRICE_ID,
      "line_items[0][quantity]":     "1",
      "customer_email":              email,
      "client_reference_id":         clinicId,
      "metadata[clinic_id]":         clinicId,
      "metadata[clinic_name]":       clinicName ?? clinicId,
      "success_url":                 `${BASE_URL}/takk?clinicId=${encodeURIComponent(clinicId)}`,
      "cancel_url":                  `${BASE_URL}/registrer?payment=cancelled`,
      "subscription_data[metadata][clinic_id]": clinicId,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
