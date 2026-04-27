/**
 * Enkel iCal-parser for SvarAI.
 * Henter en iCal-URL og returnerer opptatte tidsblokker for en gitt dato.
 * Støtter Google Calendar, Outlook, Visma, Opus Dental og alle systemer
 * som eksporterer standard iCal (.ics) format.
 */

export type BusyBlock = {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  summary?: string;
};

// Oslo er UTC+1 (CET) eller UTC+2 (CEST, sommer)
function getOsloOffset(date: Date): number {
  // Finn om vi er i sommertid (siste søndag i mars → siste søndag i oktober)
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = date.getTimezoneOffset() < Math.max(jan, jul);
  return isDST ? 2 : 1; // CEST = +2, CET = +1
}

// "20260501T090000Z" → Date (UTC)
// "20260501T090000" → Date (lokal, behandles som Oslo)
// "20260501" → Date (heldagsarrangement)
function parseIcalDate(raw: string, tzid?: string): Date | null {
  try {
    const s = raw.trim().replace(/\s/g, "");

    // Heldagsarrangement: YYYYMMDD
    if (/^\d{8}$/.test(s)) {
      return new Date(
        `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`
      );
    }

    // Med tidspunkt: YYYYMMDD'T'HHMMSS'Z' (UTC)
    if (/^\d{8}T\d{6}Z$/.test(s)) {
      return new Date(
        `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`
      );
    }

    // Med tidspunkt: YYYYMMDD'T'HHMMSS (floating/lokal tid)
    if (/^\d{8}T\d{6}$/.test(s)) {
      const d = new Date(
        `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`
      );
      // Hvis TZID er Europa/Oslo behandler vi som lokal Oslo
      // ellers antar vi lokal tid allerede er Oslo
      return d;
    }

    return null;
  } catch {
    return null;
  }
}

// Date → "HH:MM" i Oslo-tid
function toOsloTime(date: Date): string {
  const offset = getOsloOffset(date);
  const oslo = new Date(date.getTime() + offset * 60 * 60 * 1000);
  const h = oslo.getUTCHours().toString().padStart(2, "0");
  const m = oslo.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Date → "YYYY-MM-DD" i Oslo-tid
function toOsloDate(date: Date): string {
  const offset = getOsloOffset(date);
  const oslo = new Date(date.getTime() + offset * 60 * 60 * 1000);
  return oslo.toISOString().slice(0, 10);
}

// Parse alle VEVENT-blokker fra iCal-tekst
function parseEvents(ical: string): { dtstart: string; dtend: string; summary: string; tzid?: string }[] {
  const events: { dtstart: string; dtend: string; summary: string; tzid?: string }[] = [];
  const lines = ical.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Slå sammen foldede linjer (RFC 5545: linje som starter med space er fortsettelse)
  const unfolded: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  let inEvent = false;
  let current: Partial<{ dtstart: string; dtend: string; summary: string; tzid?: string }> = {};

  for (const line of unfolded) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (current.dtstart && current.dtend) {
        events.push({
          dtstart: current.dtstart,
          dtend: current.dtend,
          summary: current.summary ?? "",
          tzid: current.tzid,
        });
      }
      continue;
    }
    if (!inEvent) continue;

    // DTSTART;TZID=Europe/Oslo:20260501T090000 eller DTSTART:20260501T090000Z
    if (line.startsWith("DTSTART")) {
      const tzMatch = line.match(/TZID=([^:;]+)/);
      const val = line.split(":").slice(1).join(":");
      current.dtstart = val;
      if (tzMatch) current.tzid = tzMatch[1];
    } else if (line.startsWith("DTEND")) {
      const val = line.split(":").slice(1).join(":");
      current.dtend = val;
    } else if (line.startsWith("SUMMARY:")) {
      current.summary = line.slice(8);
    }
  }

  return events;
}

/**
 * Henter iCal-URL og returnerer opptatte tidsblokker for gitt dato (YYYY-MM-DD).
 * Returnerer [] ved feil (ikke krasj – vi degrader gracefully).
 */
export async function fetchBusyBlocks(
  icalUrl: string,
  date: string
): Promise<BusyBlock[]> {
  try {
    const res = await fetch(icalUrl, {
      headers: { "User-Agent": "SvarAI-Calendar/1.0" },
      signal: AbortSignal.timeout(5000), // 5 sek timeout
    });
    if (!res.ok) return [];

    const text = await res.text();
    const events = parseEvents(text);
    const busy: BusyBlock[] = [];

    for (const ev of events) {
      const start = parseIcalDate(ev.dtstart, ev.tzid);
      const end = parseIcalDate(ev.dtend, ev.tzid);
      if (!start || !end) continue;

      const startDate = toOsloDate(start);
      const endDate = toOsloDate(end);

      // Ta med events som starter på datoen, eller strekker seg over den
      if (startDate > date || endDate < date) continue;

      busy.push({
        start: startDate === date ? toOsloTime(start) : "00:00",
        end:   endDate   === date ? toOsloTime(end)   : "23:59",
        summary: ev.summary,
      });
    }

    return busy;
  } catch (err) {
    console.warn("[ical] Kunne ikke hente kalender:", icalUrl, err);
    return []; // Graceful degradation – vis tider selv om iCal feiler
  }
}

/**
 * Sjekk om et slot (HH:MM, varighet i min) overlapper med noen opptatte blokker.
 */
export function isBlockedByIcal(
  slotTime: string,
  durationMinutes: number,
  busy: BusyBlock[]
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const slotStart = toMin(slotTime);
  const slotEnd = slotStart + durationMinutes;

  return busy.some(b => {
    const bStart = toMin(b.start);
    const bEnd = toMin(b.end);
    return slotStart < bEnd && slotEnd > bStart;
  });
}
