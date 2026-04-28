/**
 * Henter klinikk-data fra Supabase og mapper til ClinicConfig-format.
 * Faller tilbake til hardkodet clinicConfig hvis Supabase ikke er satt opp
 * eller klinikken ikke finnes.
 */
import { clinicConfig, ClinicConfig, ClinicService, OpeningHour } from "./clinic-config";
import { getClinic, getServices, getHours, isSupabaseConfigured } from "./supabase";

export async function getClinicData(clinicId: string): Promise<ClinicConfig> {
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
      botInstructions: clinic.bot_instructions ?? undefined,
    };
  } catch (err) {
    console.error("[getClinicData] feil:", err);
    return clinicConfig;
  }
}
