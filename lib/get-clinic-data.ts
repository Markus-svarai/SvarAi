/**
 * Henter klinikk-data fra Supabase og mapper til ClinicConfig-format.
 * Faller tilbake til hardkodet clinicConfig hvis Supabase ikke er satt opp
 * eller klinikken ikke finnes.
 */
import { clinicConfig, ClinicConfig, ClinicService, OpeningHour, getDemoClinicConfig } from "./clinic-config";
import { getClinic, getServices, getHours, isSupabaseConfigured } from "./supabase";

// ── Hardkodede pilotklinikker ─────────────────────────────────────────────

const HOS_LINDA: ClinicConfig = {
  name: "Hos Linda",
  type: "skjønnhet",
  tagline: "Personlig hårpleie",
  address: { street: "", postalCode: "", city: "", country: "Norge" },
  contact: { phone: "975 08 978", email: "", website: "hoslinda.no" },
  openingHours: [],
  services: [
    { id: "klipp-15", name: "Klipp 15 min", description: "Klipp", durationMinutes: 15, priceNok: 385 },
    { id: "klipp-30", name: "Klipp 30 min", description: "Klipp", durationMinutes: 30, priceNok: 685 },
    { id: "klipp-45", name: "Klipp 45 min", description: "Klipp", durationMinutes: 45, priceNok: 830 },
    { id: "klipp-60", name: "Klipp 60 min", description: "Klipp", durationMinutes: 60, priceNok: 985 },
    { id: "klipp-75", name: "Klipp 75 min", description: "Klipp", durationMinutes: 75, priceNok: 1290 },
    { id: "farge-ettervekst", name: "Ettervekst", description: "Farging av ny hårvekst", durationMinutes: 90, priceNok: 1250 },
    { id: "farge-striper", name: "Striper", description: "Farging", durationMinutes: 120, priceNok: 1100 },
    { id: "farge-helfarge", name: "Helfarge", description: "Helfarging", durationMinutes: 120, priceNok: 1490 },
    { id: "farge-delfarge", name: "Delfarge", description: "Delfarging", durationMinutes: 60, priceNok: 500 },
    { id: "styling-brud", name: "Brudstyling (pr. time)", description: "Styling", durationMinutes: 60, priceNok: 1600 },
    { id: "styling-fon", name: "Føn/legg/tang 30 min", description: "Styling", durationMinutes: 30, priceNok: 450 },
    { id: "styling-frisering-30", name: "Frisering 30 min", description: "Styling", durationMinutes: 30, priceNok: 685 },
    { id: "styling-frisering-60", name: "Frisering 60 min", description: "Styling", durationMinutes: 60, priceNok: 985 },
    { id: "pleie-kur1", name: "Pleie kur 1", description: "Lett pleie i tillegg til behandling", durationMinutes: 15, priceNok: 250 },
    { id: "pleie-kur2", name: "Pleie kur 2", description: "Peeling, rens + pleie med 5 min massasje", durationMinutes: 30, priceNok: 450 },
    { id: "pleie-kur3", name: "Pleie kur 3", description: "Peeling, rens + lux cure med 5 min massasje", durationMinutes: 30, priceNok: 685 },
    { id: "vipper-bryn", name: "Farging vipper og bryn", description: "", durationMinutes: 30, priceNok: 500 },
    { id: "vipper-bryn-ekstra", name: "Farging vipper og bryn (under annen behandling)", description: "", durationMinutes: 15, priceNok: 250 },
  ],
  cancellationPolicy: "Ta kontakt med Linda for avbestilling",
  bookingLeadHours: 0,
  bufferMinutes: 0,
  blockedDates: [],
  botInstructions: `Dette er en frisørsalong. Bruk alltid "kunde", aldri "pasient".

BOOKING: Linda tar ikke booking via denne chatten. Når noen spør om å booke time, lurer på ledige tider eller vil bestille: si alltid "For timebestilling, ring eller send SMS til Linda på 975 08 978."

ÅPNINGSTIDER: Linda har variable åpningstider. Si: "Linda har litt varierende timer — ring eller send SMS på 975 08 978 for å avtale en time."

DU SKAL: Svare på spørsmål om tjenester og priser. Hjelpe kunden å forstå hvilken behandling de trenger.
ALDRI: Trigger start_booking eller vis bookingkalender.`,
};

const PILOT_CLINICS: Record<string, ClinicConfig> = {
  hoslinda: HOS_LINDA,
};

// ─────────────────────────────────────────────────────────────────────────────

export async function getClinicData(clinicId: string, clinicType?: string): Promise<ClinicConfig> {
  if (clinicId === "demo") return getDemoClinicConfig(clinicType ?? "");
  if (PILOT_CLINICS[clinicId]) return PILOT_CLINICS[clinicId];
  if (!isSupabaseConfigured()) return clinicConfig;

  try {
    const [clinic, services, hours] = await Promise.all([
      getClinic(clinicId),
      getServices(clinicId),
      getHours(clinicId),
    ]);

    if (!clinic) return clinicConfig;

    const mappedServices: ClinicService[] = (services ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      durationMinutes: s.duration_minutes,
      priceNok: s.price_nok,
    }));

    const mappedHours: OpeningHour[] = (hours ?? []).map((h: any) => ({
      day: h.day as OpeningHour["day"],
      open: h.open ?? null,
      close: h.close ?? null,
    }));

    return {
      name: clinic.name,
      type: (clinic.type as ClinicConfig["type"]) ?? "generell",
      tagline: clinic.tagline ?? "",
      address: {
        street: clinic.address_street ?? "",
        postalCode: clinic.address_postal ?? "",
        city: clinic.address_city ?? "",
        country: "Norge",
      },
      contact: {
        phone: clinic.contact_phone ?? "",
        email: clinic.contact_email ?? "",
        website: clinic.contact_website ?? "",
      },
      openingHours: mappedHours.length > 0 ? mappedHours : clinicConfig.openingHours,
      services: mappedServices.length > 0 ? mappedServices : clinicConfig.services,
      cancellationPolicy: clinic.cancellation_policy ?? clinicConfig.cancellationPolicy,
      bookingLeadHours: clinic.booking_lead_hours ?? clinicConfig.bookingLeadHours,
      bufferMinutes: clinic.buffer_minutes ?? 0,
      blockedDates: Array.isArray(clinic.blocked_dates) ? clinic.blocked_dates : [],
      botInstructions: clinic.bot_instructions ?? undefined,
    };
  } catch (err) {
    console.error("[getClinicData] feil:", err);
    return clinicConfig;
  }
}
