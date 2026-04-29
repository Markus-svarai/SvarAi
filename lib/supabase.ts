/**
 * Supabase REST API wrapper – ingen npm-pakke nødvendig.
 * Bruk NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY i .env.local
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function supabaseFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Klinikk ────────────────────────────────────────────────────────────────

export async function getClinic(id: string) {
  const rows = await supabaseFetch(
    `/clinics?id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows?.[0] ?? null;
}

export async function upsertClinic(data: Record<string, any>) {
  return supabaseFetch(`/clinics`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(data),
  });
}

// ── Tjenester ──────────────────────────────────────────────────────────────

export async function getServices(clinicId: string) {
  return supabaseFetch(
    `/clinic_services?clinic_id=eq.${encodeURIComponent(clinicId)}&active=eq.true&order=price_nok.asc`
  );
}

export async function upsertService(data: Record<string, any>) {
  return supabaseFetch(`/clinic_services`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(data),
  });
}

export async function deleteService(id: string) {
  return supabaseFetch(`/clinic_services?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── Åpningstider ───────────────────────────────────────────────────────────

export async function getHours(clinicId: string) {
  return supabaseFetch(
    `/clinic_hours?clinic_id=eq.${encodeURIComponent(clinicId)}&order=sort_order.asc`
  );
}

export async function upsertHours(rows: Record<string, any>[]) {
  return supabaseFetch(`/clinic_hours`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
}

// ── Bookinger ──────────────────────────────────────────────────────────────

export async function saveBooking(data: Record<string, any>) {
  return supabaseFetch(`/bookings`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBookings(clinicId: string, limit = 50) {
  return supabaseFetch(
    `/bookings?clinic_id=eq.${encodeURIComponent(clinicId)}&order=created_at.desc&limit=${limit}`
  );
}

export async function getBookingsByDate(date: string) {
  // Henter alle bookinger for en gitt dato på tvers av klinikker (for SMS-påminnelser)
  return supabaseFetch(
    `/bookings?date=eq.${encodeURIComponent(date)}&status=neq.cancelled&order=time.asc`
  );
}

// ── Samtaler ───────────────────────────────────────────────────────────────

export async function upsertConversation(data: {
  clinic_id: string;
  session_id: string;
  messages: { role: string; content: string }[];
  ended_in_booking?: boolean;
  has_unanswered?: boolean;
}) {
  return supabaseFetch(`/conversations`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
  });
}

export async function getConversations(clinicId: string, limit = 50) {
  return supabaseFetch(
    `/conversations?clinic_id=eq.${encodeURIComponent(clinicId)}&order=created_at.desc&limit=${limit}`
  );
}

export async function deleteOldConversations(clinicId: string, daysToKeep = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  return supabaseFetch(
    `/conversations?clinic_id=eq.${encodeURIComponent(clinicId)}&created_at=lt.${cutoff.toISOString()}`,
    { method: "DELETE" }
  );
}
