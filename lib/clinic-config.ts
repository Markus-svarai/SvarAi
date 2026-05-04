export type ClinicService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceNok: number;
};

export type OpeningHour = {
  day: "Mandag" | "Tirsdag" | "Onsdag" | "Torsdag" | "Fredag" | "Lørdag" | "Søndag";
  open: string | null;
  close: string | null;
};

export type ClinicConfig = {
  name: string;
  type: "medisinsk" | "tannlege" | "skjønnhet" | "fysioterapi" | "generell";
  tagline: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website: string;
  };
  openingHours: OpeningHour[];
  services: ClinicService[];
  cancellationPolicy: string;
  bookingLeadHours: number;  // Min. varsel i timer før booking
  bufferMinutes: number;     // Buffer mellom timer i minutter
  blockedDates: string[];    // ISO-datoer klinikken er stengt (YYYY-MM-DD)
  botInstructions?: string;
};

export const clinicConfig: ClinicConfig = {
  name: "Din Klinikk AS",
  type: "tannlege",
  tagline: "Trygg tannbehandling for hele familien",
  address: {
    street: "Eksempelgaten 1",
    postalCode: "0001",
    city: "Oslo",
    country: "Norge",
  },
  contact: {
    phone: "+47 22 00 11 22",
    email: "",
    website: "www.dinklinikk.no",
  },
  openingHours: [
    { day: "Mandag",   open: "08:00", close: "17:00" },
    { day: "Tirsdag",  open: "08:00", close: "17:00" },
    { day: "Onsdag",   open: "08:00", close: "17:00" },
    { day: "Torsdag",  open: "08:00", close: "19:00" },
    { day: "Fredag",   open: "08:00", close: "15:00" },
    { day: "Lørdag",   open: null,    close: null },
    { day: "Søndag",   open: null,    close: null },
  ],
  services: [
    {
      id: "akutt",
      name: "Akuttkonsultasjon",
      description: "Rask hjelp ved tannpine, hevelse eller brukket tann. Vi ser på deg samme dag.",
      durationMinutes: 30,
      priceNok: 890,
    },
    {
      id: "undersokelse",
      name: "Undersøkelse og røntgen",
      description: "Full undersøkelse av tenner og tannkjøtt, inkludert røntgenbilde.",
      durationMinutes: 45,
      priceNok: 790,
    },
    {
      id: "fyllning",
      name: "Fyllning (hull i tann)",
      description: "Behandling av karies og hull. Hvit komposittfyllning som matcher tannfargen.",
      durationMinutes: 45,
      priceNok: 1290,
    },
    {
      id: "tannrens",
      name: "Tannrens og puss",
      description: "Profesjonell rens som fjerner tannstein og misfarging. Anbefales hvert halvår.",
      durationMinutes: 60,
      priceNok: 990,
    },
    {
      id: "rotfylling",
      name: "Rotfylling",
      description: "Behandling av infisert tannrot for å redde tannen. Utføres over 1–2 besøk.",
      durationMinutes: 90,
      priceNok: 4500,
    },
    {
      id: "trekking",
      name: "Tannuttrekking",
      description: "Uttrekking av tann under lokalbedøvelse. Inkludert visdomstann.",
      durationMinutes: 45,
      priceNok: 1490,
    },
  ],
  cancellationPolicy:
    "Avbestilling må gjøres senest 24 timer før timen. Ved senere avbestilling eller uteblivelse belastes et gebyr på 490 kr.",
  bookingLeadHours: 2,
  bufferMinutes: 0,
  blockedDates: [],
};

// ── Demo-konfig per klinikktype ────────────────────────────────────────────

const DEMO_OPENING_HOURS: OpeningHour[] = [
  { day: "Mandag",   open: "08:00", close: "17:00" },
  { day: "Tirsdag",  open: "08:00", close: "17:00" },
  { day: "Onsdag",   open: "08:00", close: "17:00" },
  { day: "Torsdag",  open: "08:00", close: "19:00" },
  { day: "Fredag",   open: "08:00", close: "15:00" },
  { day: "Lørdag",   open: null,    close: null },
  { day: "Søndag",   open: null,    close: null },
];

const DEMO_ADDRESS = {
  street: "Storgata 12",
  postalCode: "0155",
  city: "Oslo",
  country: "Norge",
};

const DEMO_CONTACT = {
  phone: "+47 22 00 11 22",
  email: "post@klinikken.no",
  website: "www.klinikken.no",
};

const DEMO_CONFIGS: Record<string, Partial<ClinicConfig>> = {
  tannklinikk: {
    name: "Demo Tannklinikk",
    type: "tannlege",
    services: [
      { id: "akutt",       name: "Akuttkonsultasjon",       description: "", durationMinutes: 30, priceNok: 890  },
      { id: "undersokelse",name: "Undersøkelse og røntgen", description: "", durationMinutes: 45, priceNok: 790  },
      { id: "tannrens",    name: "Tannrens og puss",        description: "", durationMinutes: 60, priceNok: 990  },
      { id: "fyllning",    name: "Fyllning (karies)",       description: "", durationMinutes: 45, priceNok: 1290 },
    ],
  },
  hudklinikk: {
    name: "Demo Hudklinikk",
    type: "skjønnhet",
    services: [
      { id: "konsultasjon",    name: "Konsultasjon",          description: "", durationMinutes: 45, priceNok: 850  },
      { id: "hudanalyse",      name: "Hudanalyse",            description: "", durationMinutes: 60, priceNok: 1100 },
      { id: "aknebehandling",  name: "Aknebehandling",        description: "", durationMinutes: 45, priceNok: 950  },
      { id: "laserbehandling", name: "Laserbehandling",       description: "", durationMinutes: 60, priceNok: 2500 },
    ],
  },
  fysioterapi: {
    name: "Demo Fysioterapiklinikk",
    type: "fysioterapi",
    services: [
      { id: "vurdering",   name: "Vurdering og undersøkelse", description: "", durationMinutes: 45, priceNok: 690  },
      { id: "behandling",  name: "Behandling",                description: "", durationMinutes: 45, priceNok: 790  },
      { id: "opptrening",  name: "Opptrening / treningsveil.", description: "", durationMinutes: 60, priceNok: 690  },
    ],
  },
  psykolog: {
    name: "Demo Psykologsenter",
    type: "medisinsk",
    services: [
      { id: "forste-time",     name: "Innledende samtale",  description: "", durationMinutes: 60, priceNok: 1400 },
      { id: "individualterapi",name: "Individualterapi",    description: "", durationMinutes: 60, priceNok: 1400 },
    ],
  },
  legeklinikk: {
    name: "Demo Legekontor",
    type: "medisinsk",
    services: [
      { id: "legetime",    name: "Legetime",         description: "", durationMinutes: 20, priceNok: 360 },
      { id: "blodprove",   name: "Blodprøve",        description: "", durationMinutes: 15, priceNok: 150 },
      { id: "resept",      name: "Reseptfornyelse",  description: "", durationMinutes: 10, priceNok: 150 },
    ],
  },
  kiropraktor: {
    name: "Demo Kiropraktorklinikk",
    type: "medisinsk",
    services: [
      { id: "forste-konsultasjon", name: "Første konsultasjon", description: "", durationMinutes: 45, priceNok: 750 },
      { id: "behandling",          name: "Behandling",          description: "", durationMinutes: 30, priceNok: 650 },
      { id: "akutt",               name: "Akutt time",          description: "", durationMinutes: 30, priceNok: 850 },
    ],
  },
};

export function getDemoClinicConfig(clinicType: string): ClinicConfig {
  const key = clinicType.toLowerCase().trim();
  const match = Object.keys(DEMO_CONFIGS).find(k => k.startsWith(key) || key.startsWith(k));
  const overrides = (match ? DEMO_CONFIGS[match] : null) ?? {};

  return {
    ...clinicConfig,
    address: DEMO_ADDRESS,
    contact: DEMO_CONTACT,
    openingHours: DEMO_OPENING_HOURS,
    bufferMinutes: 0,
    blockedDates: [],
    bookingLeadHours: 2,
    ...overrides,
  };
}

export function isOpenNow(config: ClinicConfig, date: Date = new Date()): boolean {
  const days: OpeningHour["day"][] = [
    "Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag",
  ];
  const today = config.openingHours.find(h => h.day === days[date.getDay()]);
  if (!today || !today.open || !today.close) return false;
  const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return hhmm >= today.open && hhmm <= today.close;
}

export function formatNok(amount: number): string {
  return `${amount.toLocaleString("nb-NO")} kr`;
}
