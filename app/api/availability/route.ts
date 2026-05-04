import { NextRequest, NextResponse } from "next/server";
import { getDemoClinicConfig } from "@/lib/clinic-config";
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

// ── Norske helligdager ─────────────────────────────────────────────────────

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getNorwegianHolidays(year: number): Set<string> {
  const easter = getEasterSunday(year);
  return new Set([
    `${year}-01-01`,                        // Nyttårsdag
    toISO(addDays(easter, -3)),             // Skjærtorsdag
    toISO(addDays(easter, -2)),             // Langfredag
    toISO(easter),                          // Første påskedag
    toISO(addDays(easter, 1)),              // Andre påskedag
    `${year}-05-01`,                        // Arbeidernes dag
    `${year}-05-17`,                        // Grunnlovsdag
    toISO(addDays(easter, 39)),             // Kristi Himmelfartsdag
    toISO(addDays(easter, 49)),             // Første pinsedag
    toISO(addDays(easter, 50)),             // Andre pinsedag
    `${year}-12-25`,                        // Første juledag
    `${year}-12-26`,                        // Andre juledag
  ]);
}

const HOLIDAY_NAMES: Record<string, string> = {
  "01-01": "Nyttårsdag",
  "05-01": "Arbeidernes dag",
  "05-17": "Grunnlovsdagen",
  "12-25": "Første juledag",
  "12-26": "Andre juledag",
};

// ── Dag-helpers ────────────────────────────────────────────────────────────

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

function getDayName(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr + "T12:00:00Z").getUTCDay()];
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay(); // 0=Sun, 6=Sat
}

// ── Slot-generering ────────────────────────────────────────────────────────

function generateSlots(
  open: string,
  close: string,
  durationMinutes: number,
  bufferMinutes: number
): string[] {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const interval = durationMinutes + bufferMinutes;
  const openMin = toMin(open);
  const closeMin = toMin(close);
  const slots: string[] = [];

  for (let t = openMin; t + durationMinutes <= closeMin; t += interval) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

// Filtrer bort slots som er for nære nå (minNoticeHours)
function filterByMinNotice(slots: string[], dateStr: string, minNoticeHours: number): string[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

  return slots.filter(time => {
    const [h, m] = time.split(":").map(Number);
    const slotDate = new Date(`${dateStr}T${time}:00`);
    // Bruk lokal tid (norsk timezone ikke kritisk for demo)
    return slotDate >= cutoff;
  });
}

// Sjekk overlap med eksisterende booking
function overlaps(
  slotTime: string,
  slotDuration: number,
  bookingTime: string,
  bookingDuration: number
): boolean {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const slotStart = toMin(slotTime);
  const slotEnd = slotStart + slotDuration;
  const bookStart = toMin(bookingTime);
  const bookEnd = bookStart + bookingDuration;
  return slotStart < bookEnd && slotEnd > bookStart;
}

// ── Svar-typer ─────────────────────────────────────────────────────────────

export type AvailabilitySlot = {
  time: string;
  staff: { id: string; name: string; title: string | null }[];
};

export type AvailabilityResponse = {
  date: string;
  slots: AvailabilitySlot[];
  closed: boolean;
  reason?: "holiday" | "weekend" | "blocked" | "no_hours" | "full";
  holidayName?: string;
  nextAvailable?: { date: string; time: string } | null;
};

// ── Demo-slots per klinikktype ─────────────────────────────────────────────

const DEMO_STAFF: Record<string, { id: string; name: string; title: string }[]> = {
  tannklinikk: [
    { id: "d1", name: "Dr. Hansen",    title: "Tannlege" },
    { id: "d2", name: "Dr. Olsen",     title: "Tannlege" },
  ],
  hudklinikk: [
    { id: "d1", name: "Lena Berg",     title: "Hudterapeut" },
    { id: "d2", name: "Sofia Andersen",title: "Hudlege" },
  ],
  fysioterapi: [
    { id: "d1", name: "Per Nilsen",    title: "Fysioterapeut" },
    { id: "d2", name: "Marte Holm",    title: "Fysioterapeut" },
  ],
  psykolog: [
    { id: "d1", name: "Dr. Karin Bakke", title: "Psykolog" },
  ],
  legeklinikk: [
    { id: "d1", name: "Dr. Marie Hansen",   title: "Fastlege" },
    { id: "d2", name: "Dr. Erik Sørensen",  title: "Lege" },
  ],
  kiropraktor: [
    { id: "d1", name: "Dr. Thomas Vik", title: "Kiropraktor" },
  ],
};

function getDemoStaff(clinicType: string) {
  const key = clinicType.toLowerCase().trim();
  const match = Object.keys(DEMO_STAFF).find(k => k.startsWith(key) || key.startsWith(k));
  return (match ? DEMO_STAFF[match] : null) ?? DEMO_STAFF["tannklinikk"];
}

function buildDemoSlots(
  open: string,
  close: string,
  durationMinutes: number,
  bufferMinutes: number,
  dateStr: string,
  clinicType: string,
  minNoticeHours: number
): AvailabilitySlot[] {
  const staff = getDemoStaff(clinicType);
  let times = generateSlots(open, close, durationMinutes, bufferMinutes);
  times = filterByMinNotice(times, dateStr, minNoticeHours);

  // For demo: roter ansatte mellom slots for å se realistisk ut
  return times.map((time, i) => ({
    time,
    staff: [staff[i % staff.length]],
  }));
}

// ── Finn neste ledige dato (brukes når ingen tider er tilgjengelig) ─────────

async function findNextAvailable(
  clinicId: string,
  clinicType: string,
  serviceId: string,
  durationMinutes: number,
  bufferMinutes: number,
  minNoticeHours: number,
  holidays: Set<string>,
  blockedDates: string[],
  startDate: string,
  isDemo: boolean,
  demoConfig: ReturnType<typeof getDemoClinicConfig>
): Promise<{ date: string; time: string } | null> {
  const blockedSet = new Set(blockedDates);

  for (let i = 1; i <= 14; i++) {
    const d = addDays(new Date(startDate + "T12:00:00Z"), i);
    const dateStr = toISO(d);
    const dow = getDayOfWeek(dateStr);

    if (dow === 0) continue; // Søndag alltid stengt
    if (holidays.has(dateStr)) continue;
    if (blockedSet.has(dateStr)) continue;

    const dayName = getDayName(dateStr);

    let open: string | null = null;
    let close: string | null = null;

    if (isDemo) {
      const dayH = demoConfig.openingHours.find(h => h.day === dayName);
      open = dayH?.open ?? null;
      close = dayH?.close ?? null;
    } else {
      try {
        const hours = await sb(
          `/clinic_hours?clinic_id=eq.${encodeURIComponent(clinicId)}&day=eq.${encodeURIComponent(dayName)}&limit=1`
        );
        open = hours?.[0]?.open ?? null;
        close = hours?.[0]?.close ?? null;
      } catch {
        continue;
      }
    }

    if (!open || !close) continue;

    let times = generateSlots(open, close, durationMinutes, bufferMinutes);
    times = filterByMinNotice(times, dateStr, minNoticeHours);
    if (times.length > 0) return { date: dateStr, time: times[0] };
  }
  return null;
}

// ── Hovend-handler ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clinicId   = searchParams.get("clinicId")   ?? "demo";
  const serviceId  = searchParams.get("serviceId")  ?? "";
  const date       = searchParams.get("date")       ?? "";
  const clinicType = searchParams.get("clinicType") ?? "";

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Ugyldig dato. Bruk YYYY-MM-DD." }, { status: 400 });
  }

  const year = parseInt(date.slice(0, 4));
  const holidays = getNorwegianHolidays(year);
  const isDemo = clinicId === "demo" || !isSupabaseConfigured();

  // ── Helligdag? ────────────────────────────────────────────────────────────
  if (holidays.has(date)) {
    const mmdd = date.slice(5);
    const holidayName = HOLIDAY_NAMES[mmdd] ?? "Helligdag";
    return NextResponse.json({
      date, slots: [], closed: true, reason: "holiday", holidayName,
    } satisfies AvailabilityResponse);
  }

  // ── Søndag alltid stengt ──────────────────────────────────────────────────
  if (getDayOfWeek(date) === 0) {
    return NextResponse.json({
      date, slots: [], closed: true, reason: "weekend",
    } satisfies AvailabilityResponse);
  }

  const dayName = getDayName(date);

  // ── Demo-modus ────────────────────────────────────────────────────────────
  if (isDemo) {
    const demoCfg = getDemoClinicConfig(clinicType);

    // Sjekk blockedDates
    if (demoCfg.blockedDates.includes(date)) {
      return NextResponse.json({
        date, slots: [], closed: true, reason: "blocked",
      } satisfies AvailabilityResponse);
    }

    const dayH = demoCfg.openingHours.find(h => h.day === dayName);
    if (!dayH?.open || !dayH?.close) {
      const nextAvailable = await findNextAvailable(
        clinicId, clinicType, serviceId,
        30, demoCfg.bufferMinutes, demoCfg.bookingLeadHours,
        holidays, demoCfg.blockedDates, date, true, demoCfg
      );
      return NextResponse.json({
        date, slots: [], closed: true, reason: "no_hours", nextAvailable,
      } satisfies AvailabilityResponse);
    }

    // Finn tjenestens varighet fra demo-config
    let durationMinutes = 30;
    const svc = serviceId ? demoCfg.services.find(s => s.id === serviceId) : null;
    if (svc) durationMinutes = svc.durationMinutes;

    const slots = buildDemoSlots(
      dayH.open, dayH.close,
      durationMinutes, demoCfg.bufferMinutes,
      date, clinicType, demoCfg.bookingLeadHours
    );

    if (slots.length === 0) {
      const nextAvailable = await findNextAvailable(
        clinicId, clinicType, serviceId,
        durationMinutes, demoCfg.bufferMinutes, demoCfg.bookingLeadHours,
        holidays, demoCfg.blockedDates, date, true, demoCfg
      );
      return NextResponse.json({
        date, slots: [], closed: false, reason: "full", nextAvailable,
      } satisfies AvailabilityResponse);
    }

    return NextResponse.json({ date, slots, closed: false } satisfies AvailabilityResponse);
  }

  // ── Ekte Supabase-modus ───────────────────────────────────────────────────
  try {
    // Hent klinikk-innstillinger
    let bufferMinutes = 0;
    let minNoticeHours = 2;
    let blockedDates: string[] = [];
    try {
      const clinicRow = await sb(`/clinics?id=eq.${encodeURIComponent(clinicId)}&limit=1`);
      if (clinicRow?.[0]) {
        bufferMinutes   = clinicRow[0].buffer_minutes   ?? 0;
        minNoticeHours  = clinicRow[0].booking_lead_hours ?? 2;
        blockedDates    = Array.isArray(clinicRow[0].blocked_dates) ? clinicRow[0].blocked_dates : [];
      }
    } catch { /* bruk defaults */ }

    // Sjekk blockedDates
    if (blockedDates.includes(date)) {
      return NextResponse.json({
        date, slots: [], closed: true, reason: "blocked",
      } satisfies AvailabilityResponse);
    }

    // Hent åpningstider for denne dagen
    const hours = await sb(
      `/clinic_hours?clinic_id=eq.${encodeURIComponent(clinicId)}&day=eq.${encodeURIComponent(dayName)}&limit=1`
    );
    const dayHours = hours?.[0];

    if (!dayHours?.open || !dayHours?.close) {
      const demoCfg = getDemoClinicConfig(""); // fallback for findNextAvailable
      const nextAvailable = await findNextAvailable(
        clinicId, clinicType, serviceId,
        30, bufferMinutes, minNoticeHours,
        holidays, blockedDates, date, false, demoCfg
      );
      return NextResponse.json({
        date, slots: [], closed: true,
        reason: getDayOfWeek(date) === 6 ? "weekend" : "no_hours",
        nextAvailable,
      } satisfies AvailabilityResponse);
    }

    // Finn tjenestens varighet
    let durationMinutes = 30;
    if (serviceId) {
      try {
        const services = await sb(
          `/clinic_services?clinic_id=eq.${encodeURIComponent(clinicId)}&id=eq.${encodeURIComponent(serviceId)}&limit=1`
        );
        if (services?.[0]?.duration_minutes) durationMinutes = services[0].duration_minutes;
      } catch { /* bruk default */ }
    }

    // Hent alle aktive ansatte
    const staff = await sb(
      `/clinic_staff?clinic_id=eq.${encodeURIComponent(clinicId)}&active=eq.true&order=created_at.asc`
    );

    // Ingen ansatte → returner åpne tider uten stafftilknytning
    if (!staff || staff.length === 0) {
      let times = generateSlots(dayHours.open, dayHours.close, durationMinutes, bufferMinutes);
      times = filterByMinNotice(times, date, minNoticeHours);
      return NextResponse.json({
        date,
        slots: times.map(time => ({ time, staff: [] })),
        closed: false,
      } satisfies AvailabilityResponse);
    }

    // Hent bookinger for denne datoen
    const bookings = await sb(
      `/bookings?clinic_id=eq.${encodeURIComponent(clinicId)}&date=eq.${encodeURIComponent(date)}&status=in.(pending,confirmed)`
    );

    // Arbeidsplan per ansatt
    const staffHoursMap = new Map<string, { open: string; close: string; closed: boolean } | null>();
    await Promise.all(
      staff.map(async (s: any) => {
        try {
          const rows = await sb(
            `/clinic_staff_hours?staff_id=eq.${encodeURIComponent(s.id)}&day=eq.${encodeURIComponent(dayName)}&limit=1`
          );
          staffHoursMap.set(s.id, rows?.[0] ?? null);
        } catch {
          staffHoursMap.set(s.id, null);
        }
      })
    );

    // iCal-opptatthet
    const icalBusyMap = new Map<string, Awaited<ReturnType<typeof fetchBusyBlocks>>>();
    await Promise.all(
      staff.map(async (s: any) => {
        if (s.ical_url) {
          const busy = await fetchBusyBlocks(s.ical_url, date);
          icalBusyMap.set(s.id, busy);
        }
      })
    );

    // Samle alle mulige slot-tider på tvers av ansattes arbeidstider
    const allSlotTimes = new Set<string>();
    for (const s of staff) {
      const sh = staffHoursMap.get(s.id);
      if (!sh || sh.closed) continue;
      const staffSlots = generateSlots(sh.open, sh.close, durationMinutes, bufferMinutes);
      staffSlots.forEach(t => allSlotTimes.add(t));
    }

    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

    // Filtrer etter minNotice og bygg resultat
    const sortedSlots = Array.from(allSlotTimes).sort();
    const noticeCutoff = new Date(Date.now() + minNoticeHours * 3600 * 1000);

    const result: AvailabilitySlot[] = [];
    for (const slotTime of sortedSlots) {
      // Min-varsel filter
      const slotDateTime = new Date(`${date}T${slotTime}:00`);
      if (slotDateTime < noticeCutoff) continue;

      const availableStaff = staff.filter((s: any) => {
        const sh = staffHoursMap.get(s.id);
        if (!sh || sh.closed) return false;
        const slotStart = toMin(slotTime);
        const slotEnd = slotStart + durationMinutes;
        if (slotStart < toMin(sh.open) || slotEnd > toMin(sh.close)) return false;

        const staffBookings = bookings.filter((b: any) => b.staff_id === s.id);
        if (staffBookings.some((b: any) => overlaps(slotTime, durationMinutes, b.time, b.duration_minutes ?? durationMinutes))) return false;

        const icalBusy = icalBusyMap.get(s.id);
        if (icalBusy && isBlockedByIcal(slotTime, durationMinutes, icalBusy)) return false;

        return true;
      });

      if (availableStaff.length > 0) {
        result.push({
          time: slotTime,
          staff: availableStaff.map((s: any) => ({ id: s.id, name: s.name, title: s.title ?? null })),
        });
      }
    }

    if (result.length === 0) {
      const demoCfg = getDemoClinicConfig("");
      const nextAvailable = await findNextAvailable(
        clinicId, clinicType, serviceId,
        durationMinutes, bufferMinutes, minNoticeHours,
        holidays, blockedDates, date, false, demoCfg
      );
      return NextResponse.json({
        date, slots: [], closed: false, reason: "full", nextAvailable,
      } satisfies AvailabilityResponse);
    }

    return NextResponse.json({ date, slots: result, closed: false } satisfies AvailabilityResponse);

  } catch (err: any) {
    console.error("[availability] feil:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
