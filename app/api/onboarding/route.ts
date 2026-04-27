import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function sb(path: string, options: RequestInit = {}) {
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
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Genererer et lesbart tilfeldig passord, f.eks. "kx7m-p2nq"
function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(4)}-${part(4)}`;
}

// Genererer en URL-vennlig ID fra klinikk-navn
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// Standardtjenester per klinikk-type
const DEFAULT_SERVICES: Record<string, Array<{ name: string; description: string; duration_minutes: number; price_nok: number }>> = {
  tannlege: [
    { name: "Akuttkonsultasjon",       description: "Rask hjelp ved tannpine, hevelse eller brukket tann.",       duration_minutes: 30,  price_nok: 890  },
    { name: "Undersøkelse og røntgen", description: "Full undersøkelse av tenner og tannkjøtt.",                   duration_minutes: 45,  price_nok: 790  },
    { name: "Fyllning (hull i tann)",  description: "Hvit komposittfyllning som matcher tannfargen.",              duration_minutes: 45,  price_nok: 1290 },
    { name: "Tannrens og puss",        description: "Profesjonell rens. Anbefales hvert halvår.",                  duration_minutes: 60,  price_nok: 990  },
    { name: "Rotfylling",              description: "Behandling av infisert tannrot. 1–2 besøk.",                  duration_minutes: 90,  price_nok: 4500 },
    { name: "Tannuttrekking",          description: "Uttrekking under lokalbedøvelse. Inkl. visdomstann.",          duration_minutes: 45,  price_nok: 1490 },
  ],
  lege: [
    { name: "Konsultasjon",            description: "Allmennmedisinsk konsultasjon.",                               duration_minutes: 20,  price_nok: 395  },
    { name: "Lang konsultasjon",       description: "Utvidet konsultasjon for sammensatte problemstillinger.",      duration_minutes: 40,  price_nok: 595  },
    { name: "Blodprøvetaking",         description: "Blodprøver med svar innen 2–3 virkedager.",                   duration_minutes: 15,  price_nok: 195  },
    { name: "Sykemelding",             description: "Vurdering og utstedelse av sykemelding.",                     duration_minutes: 20,  price_nok: 395  },
    { name: "Vaksinasjon",             description: "Vaksinasjoner og reisevaksiner.",                             duration_minutes: 15,  price_nok: 250  },
  ],
  hudklinikk: [
    { name: "Hudkonsultasjon",         description: "Vurdering av hudproblem eller tilstand.",                     duration_minutes: 30,  price_nok: 750  },
    { name: "Aknebehandling",          description: "Profesjonell behandling av akne og uren hud.",                duration_minutes: 60,  price_nok: 1200 },
    { name: "Anti-age behandling",     description: "Behandling mot aldring og rynker.",                           duration_minutes: 60,  price_nok: 1800 },
    { name: "Laser behandling",        description: "Laserbehandling for ulike hudtilstander.",                    duration_minutes: 45,  price_nok: 2500 },
    { name: "Kjemisk peeling",         description: "Dybderens og fornyelse av huden.",                           duration_minutes: 45,  price_nok: 1400 },
  ],
  fysioterapi: [
    { name: "Førstegangskonsultasjon", description: "Undersøkelse og kartlegging av plager.",                      duration_minutes: 60,  price_nok: 750  },
    { name: "Behandlingstime",         description: "Manuell terapi og behandling.",                               duration_minutes: 45,  price_nok: 590  },
    { name: "Treningsveiledning",      description: "Individuelt tilpasset treningsprogram.",                      duration_minutes: 45,  price_nok: 690  },
    { name: "Tøyning og massasje",     description: "Sportsbehandling og spenningslindring.",                      duration_minutes: 30,  price_nok: 450  },
  ],
  generell: [
    { name: "Konsultasjon",            description: "Standard konsultasjon.",                                      duration_minutes: 30,  price_nok: 500  },
    { name: "Oppfølgingstime",         description: "Oppfølging og kontroll.",                                     duration_minutes: 20,  price_nok: 350  },
  ],
};

const DEFAULT_HOURS = [
  { day: "Mandag",   sort_order: 0, open: "08:00", close: "16:00" },
  { day: "Tirsdag",  sort_order: 1, open: "08:00", close: "16:00" },
  { day: "Onsdag",   sort_order: 2, open: "08:00", close: "16:00" },
  { day: "Torsdag",  sort_order: 3, open: "08:00", close: "16:00" },
  { day: "Fredag",   sort_order: 4, open: "08:00", close: "15:00" },
  { day: "Lørdag",   sort_order: 5, open: null,    close: null     },
  { day: "Søndag",   sort_order: 6, open: null,    close: null     },
];

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database ikke konfigurert." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { name, type, tagline, address_street, address_postal, address_city,
            contact_phone, contact_email, contact_website, hours } = body;

    // Validering
    if (!name?.trim()) return NextResponse.json({ error: "Klinikk-navn er påkrevd." }, { status: 400 });
    if (!contact_phone?.trim()) return NextResponse.json({ error: "Telefonnummer er påkrevd." }, { status: 400 });
    if (!contact_email?.trim()) return NextResponse.json({ error: "E-post er påkrevd." }, { status: 400 });

    // Generer unik ID
    const baseSlug = slugify(name.trim());
    let clinicId = baseSlug;

    // Sjekk om ID er ledig – prøv opp til 5 varianter
    for (let i = 0; i < 5; i++) {
      const existing = await sb(`/clinics?id=eq.${encodeURIComponent(clinicId)}&limit=1`);
      if (!existing || existing.length === 0) break;
      clinicId = i === 0
        ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
        : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const clinicType = type ?? "generell";
    const adminPassword = generatePassword();

    // Opprett klinikk
    await sb("/clinics", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: clinicId,
        name: name.trim(),
        type: clinicType,
        admin_password: adminPassword,
        tagline: tagline?.trim() ?? "",
        address_street: address_street?.trim() ?? "",
        address_postal: address_postal?.trim() ?? "",
        address_city: address_city?.trim() ?? "",
        contact_phone: contact_phone.trim(),
        contact_email: contact_email.trim(),
        contact_website: contact_website?.trim() ?? "",
        cancellation_policy: "Avbestilling må gjøres senest 24 timer før timen.",
        booking_lead_hours: 2,
      }),
    });

    // Opprett standardtjenester
    const services = (DEFAULT_SERVICES[clinicType] ?? DEFAULT_SERVICES.generell).map(s => ({
      ...s,
      clinic_id: clinicId,
      active: true,
    }));
    await sb("/clinic_services", {
      method: "POST",
      body: JSON.stringify(services),
    });

    // Opprett åpningstider (bruk custom hvis oppgitt, ellers standard)
    const hoursToInsert = (Array.isArray(hours) && hours.length > 0 ? hours : DEFAULT_HOURS).map(
      (h: any) => ({ ...h, clinic_id: clinicId })
    );
    await sb("/clinic_hours", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(hoursToInsert),
    });

    return NextResponse.json({
      ok: true,
      clinicId,
      adminPassword,
      embedCode: `<script src="https://svarai.no/widget.js" data-clinic="${clinicId}" defer></script>`,
      widgetUrl: `https://svarai.no/widget?id=${clinicId}`,
      adminUrl: `https://svarai.no/admin`,
    });

  } catch (err: any) {
    console.error("[onboarding] feil:", err);
    return NextResponse.json({ error: "Noe gikk galt. Prøv igjen." }, { status: 500 });
  }
}
