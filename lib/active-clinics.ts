/**
 * Liste over aktive klinikker som har tilgang til widgeten.
 *
 * For å gi tilgang: legg til klinikk-ID her, push → deploy.
 * For å fjerne tilgang (sluttet å betale): fjern ID, push → deploy (~30 sek).
 *
 * "demo" er alltid aktiv – brukes på svarai.no og i salgssammenheng.
 */
export const activeClinics: Set<string> = new Set([
  "demo",
  // Legg til betalende klinikker her:
  // "tannklinikken-oslo",
  // "hudklinikk-bergen",
]);

export function isClinicActive(id: string): boolean {
  return activeClinics.has(id);
}
