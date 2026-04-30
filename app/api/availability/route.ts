import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchBusyBlocks, isBlockedByIcal } from "@/lib/ical-parser";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function sb(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

// "2026-05-01" → "Torsdag" (norsk ukedag-navn som matcherDB)
function getDayName(dateStr: string): string {
  const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
  const d = new Date(dateStr + "T12:00:00Z");
  return days[d.getUTCDay()];
}

// Generer alle mulige slot-starttider for en dag gitt åpningstid og varighet
function generateSlots(open: string, close: string, durationMinutes: number): string[] {
  const [openH, openM] = open.split(":").map(Number);
  const [closeH, closeM] = close.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const slots: string[] = [];
  for (let t = openMinutes; t + durationMinutes <= closeMinutes; t += 30) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

// Sjekk om et slot overlapper med en eksisterende booking
function overlaps(
  slotTime: string,
  slotDuration: number,
  bookingTime: string,
  bookingDuration: number
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const slotStart = toMin(slotTime);
  const slotEnd = slotStart + slotDuration;
  const bookStart = toMin(bookingTime);
  const bookEnd = bookStart + bookingDuration;
  return slotStart < bookEnd && slotEnd > bookStart;
}

export type AvailabilitySlot = {
  time: string;
  staff: { id: string; name: string; title: string | null }[];
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clinicId = searchParams.get("clinicId") ?? "demo";
  const serviceId = searchParams.get("serviceId") ?? "";
  const date = searchParams.get("date") ?? "";

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Ugyldig dato. Bruk YYYY-MM-DD." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    // Fallback: returner statiske demo-tider
    return NextResponse.json({
      date,
      slots: [
        { time: "09:00", staff: [{ id: "demo-1", name: "Dr. Hansen", title: "Tannlege" }] },
        { time: "10:30", staff: [{ id: "demo-2", name: "Dr. Olsen",  title: "Tannlege" }] },
        { time: "13:00", staff: [{ id: "demo-1", name: "Dr. Hansen", title: "Tannlege" }] },
        { time: "14:30", staff: [{ id: "demo-2", name: "Dr. Olsen",  title: "Tannlege" }] },
      ],
    });
  }

  try {
    const dayName = getDayName(date);

    // Hent åpningstider for denne dagen
    const hours = await sb(
      `/clinic_hours?clinic_id=eq.${encodeURIComponent(clinicId)}&day=eq.${encodeURIComponent(dayName)}&limit=1`
    );
    let dayHours = hours?.[0];

    if (!dayHours?.open || !dayHours?.close) {
      // Ingen åpningstider satt opp for denne dagen — bruk standard hverdagstider
      const dow = new Date(date + "T12:00:00Z").getUTCDay();
      if (dow === 0 || dow === 6) {
        return NextResponse.json({ date, slots: [], closed: true });
      }
      // Sett inn default åpningstider for hverdager
      dayHours = { open: "08:00", close: "17:00" };
    }

    // Hent tjenestens varighet
    let durationMinutes = 30;
    if (serviceId) {
      const services = await sb(
        `/clinic_services?clinic_id=eq.${encodeURIComponent(clinicId)}&id=eq.${encodeURIComponent(serviceId)}&limit=1`
      );
      if (services?.[0]?.duration_minutes) {
        durationMinutes = services[0].duration_minutes;
      }
    }

    // Hent alle aktive ansatte
    const staff = await sb(
      `/clinic_staff?clinic_id=eq.${encodeURIComponent(clinicId)}&active=eq.true&order=created_at.asc`
    );

    if (!staff || staff.length === 0) {
      // Ingen ansatte registrert – returner åpne tider uten stafftilknytning
      const slots = generateSlots(dayHours.open, dayHours.close, durationMinutes);
      return NextResponse.json({
        date,
        slots: slots.map(time => ({ time, staff: [] })),
      });
    }

    // Hent alle bookinger for denne datoen for klinikken (pending + confirmed)
    const bookings = await sb(
      `/bookings?clinic_id=eq.${encodeURIComponent(clinicId)}&date=eq.${encodeURIComponent(date)}&status=in.(pending,confirmed)`
    );

    // Hent arbeidsplan for alle ansatte parallelt
    const staffHoursMap = new Map<string, { open: string; close: string; closed: boolean } | null>();
    await Promise.all(
      staff.map(async (s: any) => {
        try {
          const rows = await sb(
            `/clinic_staff_hours?staff_id=eq.${encodeURIComponent(s.id)}&day=eq.${encodeURIComponent(dayName)}&limit=1`
          );
          if (rows && rows.length > 0) {
            staffHoursMap.set(s.id, rows[0]);
          } else {
            // Ingen timeplan satt – ansatt er ikke tilgjengelig (krever oppsett)
            staffHoursMap.set(s.id, null);
          }
        } catch {
          staffHoursMap.set(s.id, null);
        }
      })
    );

    // Hent iCal-opptatthet for alle ansatte parallelt
    const icalBusyMap = new Map<string, Awaited<ReturnType<typeof fetchBusyBlocks>>>();
    await Promise.all(
      staff.map(async (s: any) => {
        if (s.ical_url) {
          const busy = await fetchBusyBlocks(s.ical_url, date);
          icalBusyMap.set(s.id, busy);
        }
      })
    );

    // Samle alle mulige slots på tvers av ansattes arbeidstider
    const allSlotTimes = new Set<string>();
    for (const s of staff) {
      const sh = staffHoursMap.get(s.id);
      if (!sh || sh.closed) continue;
      const staffSlots = generateSlots(sh.open, sh.close, durationMinutes);
      staffSlots.forEach(t => allSlotTimes.add(t));
    }

    // Sorter slottene kronologisk
    const sortedSlots = Array.from(allSlotTimes).sort();

    // For hvert slot: finn hvilke ansatte som er ledige
    const result: AvailabilitySlot[] = [];

    for (const slotTime of sortedSlots) {
      const availableStaff = staff.filter((s: any) => {
        // 1) Sjekk at ansatt jobber på dette tidspunktet
        const sh = staffHoursMap.get(s.id);
        if (!sh || sh.closed) return false;
        const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        const slotStart = toMin(slotTime);
        const slotEnd = slotStart + durationMinutes;
        if (slotStart < toMin(sh.open) || slotEnd > toMin(sh.close)) return false;

        // 2) Sjekk SvarAI-bookinger
        const staffBookings = bookings.filter((b: any) => b.staff_id === s.id);
        const busyInDb = staffBookings.some((b: any) => {
          const bookDuration = b.duration_minutes ?? durationMinutes;
          return overlaps(slotTime, durationMinutes, b.time, bookDuration);
        });
        if (busyInDb) return false;

        // 3) Sjekk iCal-kalender (Google, Outlook etc.)
        const icalBusy = icalBusyMap.get(s.id);
        if (icalBusy && isBlockedByIcal(slotTime, durationMinutes, icalBusy)) return false;

        return true;
      });

      if (availableStaff.length > 0) {
        result.push({
          time: slotTime,
          staff: availableStaff.map((s: any) => ({
            id: s.id,
            name: s.name,
            title: s.title ?? null,
          })),
        });
      }
    }

    return NextResponse.json({ date, slots: result });
  } catch (err: any) {
    console.error("[availability] feil:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
