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
  bookingLeadHours: number;
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
    email: "post@dinklinikk.no",
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
};

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
