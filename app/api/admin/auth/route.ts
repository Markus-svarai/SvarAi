import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function getClinicPassword(clinicId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clinics?id=eq.${encodeURIComponent(clinicId)}&select=admin_password&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.admin_password ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clinicId: string = (body?.clinicId ?? "demo").trim();
    const password: string = body?.password ?? "";
    const superBypass: string = body?.superBypass ?? "";

    // Super-admin bypass: gir direkte tilgang til hvilken som helst klinikk
    const adminPw = process.env.ADMIN_PASSWORD;
    if (adminPw && superBypass === adminPw && clinicId) {
      return NextResponse.json({ ok: true, clinicId });
    }

    if (!password) {
      return NextResponse.json({ error: "Passord er påkrevd." }, { status: 400 });
    }

    // Demo-klinikk: sjekk env var først, deretter DB
    if (clinicId === "demo") {
      const adminPw = process.env.ADMIN_PASSWORD;
      if (adminPw && password === adminPw) {
        return NextResponse.json({ ok: true, clinicId: "demo" });
      }
      if (isSupabaseConfigured()) {
        const dbPw = await getClinicPassword("demo");
        if (dbPw && password === dbPw) {
          return NextResponse.json({ ok: true, clinicId: "demo" });
        }
      }
      return NextResponse.json({ error: "Feil passord." }, { status: 401 });
    }

    // Alle andre klinikker: sjekk mot DB
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database ikke tilgjengelig." }, { status: 503 });
    }

    const dbPw = await getClinicPassword(clinicId);
    if (!dbPw) {
      return NextResponse.json({ error: "Klinikk ikke funnet." }, { status: 404 });
    }
    if (password !== dbPw) {
      return NextResponse.json({ error: "Feil klinikk-ID eller passord." }, { status: 401 });
    }

    return NextResponse.json({ ok: true, clinicId });
  } catch {
    return NextResponse.json({ error: "Intern feil." }, { status: 500 });
  }
}
