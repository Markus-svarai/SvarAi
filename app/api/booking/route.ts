import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { clinicConfig } from "@/lib/clinic-config";

export const runtime = "nodejs";

const BOOKINGS_FILE = path.join(process.cwd(), "data", "bookings.json");

type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  phone: string;
  email: string;
  createdAt: string;
};

async function readBookings(): Promise<Booking[]> {
  try {
    const raw = await fs.readFile(BOOKINGS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeBookings(bookings: Booking[]) {
  await fs.mkdir(path.dirname(BOOKINGS_FILE), { recursive: true });
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

function validate(input: any): { ok: true; booking: Omit<Booking, "id" | "createdAt" | "serviceName"> } | { ok: false; error: string } {
  if (!input) return { ok: false, error: "Mangler data." };
  const { serviceId, date, time, name, phone, email } = input;

  if (typeof serviceId !== "string" || !clinicConfig.services.find(s => s.id === serviceId)) {
    return { ok: false, error: "Ugyldig tjeneste." };
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Ugyldig dato." };
  }
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, error: "Ugyldig tidspunkt." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, error: "Vennligst skriv inn fullt navn." };
  }
  if (typeof phone !== "string" || phone.replace(/\D/g, "").length < 8) {
    return { ok: false, error: "Vennligst skriv inn et gyldig telefonnummer." };
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Vennligst skriv inn en gyldig e-postadresse." };
  }

  return {
    ok: true,
    booking: {
      serviceId,
      date,
      time,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const result = validate(input);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const service = clinicConfig.services.find(s => s.id === result.booking.serviceId)!;

    const booking: Booking = {
      id: `SVR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      ...result.booking,
      serviceName: service.name,
      createdAt: new Date().toISOString(),
    };

    const bookings = await readBookings();
    bookings.push(booking);
    await writeBookings(bookings);

    return NextResponse.json({
      ok: true,
      booking,
      message: `Timen din er bekreftet. Vi sender en påminnelse til ${booking.phone} og ${booking.email}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Kunne ikke lagre booking.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const bookings = await readBookings();
  // Redact contact fields for demo safety.
  const safe = bookings.map(b => ({
    id: b.id,
    serviceId: b.serviceId,
    serviceName: b.serviceName,
    date: b.date,
    time: b.time,
    createdAt: b.createdAt,
  }));
  return NextResponse.json({ count: bookings.length, bookings: safe });
}
