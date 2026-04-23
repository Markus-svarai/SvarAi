export type ClinicService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceNok: number;
};

export type OpeningHour = {
  day: "Mandag" | "Tirsdag" | "Onsdag" | "Torsdag" | "Fredag" | "Lørdag" | "Søndag";
  open: string | null; // "08:00" or null if closed
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
  name: "Oslo Klinikk",
  type: "generell",
  tagline: "Din lokale klinikk i hjertet av Oslo",
  address: {
    street: "Karl Johans gate 12",
    postalCode: "0154",
    city: "Oslo",
    country: "Norge",
  },
  contact: {
    phone: "+47 22 00 11 22",
    email: "post@osloklinikk.no",
    website: "www.osloklinikk.no",
  },
  openingHours: [
    { day: "Mandag", open: "08:00", close: "18:00" },
    { day: "Tirsdag", open: "08:00", close: "18:00" },
    { day: "Onsdag", open: "08:00", close: "18:00" },
    { day: "Torsdag", open: "08:00", close: "20:00" },
    { day: "Fredag", open: "08:00", close: "16:00" },
    { day: "Lørdag", open: "10:00", close: "14:00" },
    { day: "Søndag", open: null, close: null },
  ],
  services: [
    {
      id: "konsultasjon",
      name: "Allmenn konsultasjon",
      description: "Generell legekonsultasjon med erfaren allmennlege.",
      durationMinutes: 30,
      priceNok: 690,
    },
    {
      id: "helsesjekk",
      name: "Helsesjekk (utvidet)",
      description: "Full kroppsundersøkelse med blodprøver og EKG.",
      durationMinutes: 60,
      priceNok: 1890,
    },
    {
      id: "vaksinering",
      name: "Vaksinering",
      description: "Reise- og sesongvaksiner. Pris avhenger av vaksine.",
      durationMinutes: 15,
      priceNok: 450,
    },
    {
      id: "blodprover",
      name: "Blodprøver",
      description: "Rutineblodprøver med rask svartid.",
      durationMinutes: 20,
      priceNok: 590,
    },
    {
      id: "hudsjekk",
      name: "Hudsjekk / føflekkontroll",
      description: "Undersøkelse av føflekker og hudforandringer.",
      durationMinutes: 30,
      priceNok: 990,
    },
    {
      id: "attester",
      name: "Attester & helseerklæringer",
      description: "Førerkortattest, helseattest, reisehelse m.m.",
      durationMinutes: 20,
      priceNok: 790,
    },
  ],
  cancellationPolicy:
    "Avbestilling må gjøres senest 24 timer før timen. Ved senere avbestilling eller uteblivelse belastes et gebyr på 450 kr.",
  bookingLeadHours: 2,
};

// Helper: returns true if clinic is open right now (server-time; demo-friendly).
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
