import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPw = process.env.ADMIN_PASSWORD;

    if (!adminPw) {
      return NextResponse.json({ error: "ADMIN_PASSWORD ikke satt." }, { status: 503 });
    }
    if (!password || password !== adminPw) {
      return NextResponse.json({ error: "Feil passord." }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Intern feil." }, { status: 500 });
  }
}
