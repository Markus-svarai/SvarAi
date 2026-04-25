import { NextRequest, NextResponse } from "next/server";
import { clinicConfig, formatNok, isOpenNow } from "@/lib/clinic-config";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatAction =
  | { type: "start_booking"; serviceId?: string }
  | { type: "show_hours" }
  | { type: "show_services" };

type ChatResponse = {
  reply: string;
  action?: ChatAction;
  suggestions?: string[];
};

function norm(s: string) {
  return s.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
}

function matchAny(text: string, patterns: string[]): boolean {
  const n = norm(text);
  return patterns.some(p => n.includes(p));
}

function renderHours(): string {
  const lines = clinicConfig.openingHours.map(h => {
    if (!h.open || !h.close) return `• ${h.day}: Stengt`;
    return `• ${h.day}: ${h.open}–${h.close}`;
  });
  const status = isOpenNow(clinicConfig)
    ? "✅ Vi har åpent nå."
    : "🔒 Vi har stengt akkurat nå.";
  return `${status}\n\nÅpningstider:\n${lines.join("\n")}`;
}

function renderServices(): string {
  const lines = clinicConfig.services.map(
    s => `• **${s.name}** – ${formatNok(s.priceNok)} (${s.durationMinutes} min)\n   ${s.description}`
  );
  return `Her er tjenestene våre:\n\n${lines.join("\n\n")}\n\nØnsker du å bestille en time?`;
}

function renderContact(): string {
  const a = clinicConfig.address;
  return [
    `📍 **Adresse:** ${a.street}, ${a.postalCode} ${a.city}`,
    `📞 **Telefon:** ${clinicConfig.contact.phone}`,
    `✉️ **E-post:** ${clinicConfig.contact.email}`,
    `🌐 **Nettside:** ${clinicConfig.contact.website}`,
  ].join("\n");
}

function renderCancellation(): string {
  return [
    "Du kan avbestille eller endre timen din slik:",
    "",
    `• Her i chatten – si bare "jeg vil avbestille"`,
    `• Telefon: ${clinicConfig.contact.phone}`,
    `• E-post: ${clinicConfig.contact.email}`,
    "",
    `ℹ️ ${clinicConfig.cancellationPolicy}`,
  ].join("\n");
}

// --- Symptom intelligence ---

type SymptomMatch = {
  serviceId: string;
  urgency: "akutt" | "snart" | "rutine";
  reply: string;
  suggestions: string[];
};

function matchSymptom(m: string): SymptomMatch | null {

  // Akutt smerte / hevelse
  if (matchAny(m, ["vondt", "tannpine", "smerte", "verker", "banker", "stikker", "prikker", "pulserer", "hardt vondt", "veldig vondt"])) {
    const hasSwelling = matchAny(m, ["hoven", "hevelse", "hovner", "kinn", "betennelse"]);
    if (hasSwelling) {
      return {
        serviceId: "akutt",
        urgency: "akutt",
        reply: `Det høres ut som en mulig **tanninfeksjon eller abscess** – hevelse i kjeven kan være alvorlig og bør undersøkes **så fort som mulig**.\n\n⚠️ Vi anbefaler en **akuttkonsultasjon i dag** (${formatNok(890)}, 30 min).\n\nVil du se ledige tider?`,
        suggestions: ["Book akuttkonsultasjon", "Ring oss", "Mer info"],
      };
    }
    return {
      serviceId: "akutt",
      urgency: "akutt",
      reply: `Det høres ut som **tannpine** – dette kan skyldes et hull, sprukket tann, eller betennelse i tannroten.\n\n🦷 Vi anbefaler en **akuttkonsultasjon** så snart som mulig (${formatNok(890)}, 30 min). Legen vil undersøke og fortelle deg nøyaktig hva som må gjøres.\n\nVil du booke en time?`,
      suggestions: ["Book akuttkonsultasjon", "Se alle tider", "Hva koster det?"],
    };
  }

  // Brukket eller løs tann
  if (matchAny(m, ["brukket", "knekt", "løs tann", "falt ut", "mistet tann", "slått ut", "chip", "flekk av"])) {
    return {
      serviceId: "akutt",
      urgency: "akutt",
      reply: `En **brukket eller løs tann** bør undersøkes **snarest mulig** – jo raskere vi ser på det, jo større sjanse er det for å redde tannen.\n\n🦷 Vi anbefaler **akuttkonsultasjon** i dag (${formatNok(890)}, 30 min).\n\nVil du booke en time nå?`,
      suggestions: ["Book akuttkonsultasjon", "Ring oss direkte", "Åpningstider"],
    };
  }

  // Hull / karies
  if (matchAny(m, ["hull", "karies", "råte", "svart tann", "mørk tann", "fyllning", "fyllning har falt"])) {
    return {
      serviceId: "fyllning",
      urgency: "snart",
      reply: `Det høres ut som du trenger en **fyllning** – dette er en vanlig behandling der vi fjerner karies og fyller hullet med en hvit komposittfyllning.\n\n🦷 **Fyllning:** ${formatNok(1290)}, ca. 45 min. Smertefritt med lokalbedøvelse.\n\nVil du booke en time?`,
      suggestions: ["Book fyllning", "Hva skjer under behandlingen?", "Se priser"],
    };
  }

  // Følsomhet
  if (matchAny(m, ["følsom", "sensitiv", "kaldt", "varmt", "søtt", "surt", "ising", "iset", "isnende"])) {
    return {
      serviceId: "undersokelse",
      urgency: "snart",
      reply: `**Følsomhet for kaldt, varmt eller søtt** kan tyde på:\n\n• Hull (karies) i en tann\n• Slitt tannemalje\n• Tannhalsen er blottlagt\n\n🦷 Vi anbefaler en **undersøkelse** så vi finner årsaken og kan gi riktig behandling (${formatNok(790)}, 45 min inkl. røntgen).\n\nVil du booke en undersøkelse?`,
      suggestions: ["Book undersøkelse", "Se priser", "Åpningstider"],
    };
  }

  // Tannkjøtt / blødning
  if (matchAny(m, ["tannkjøtt", "blør", "blødning", "rødt", "betent tannkjøtt", "periodontitt", "løs", "trekker seg"])) {
    return {
      serviceId: "tannrens",
      urgency: "snart",
      reply: `**Blødende eller betent tannkjøtt** er ofte et tegn på **tannkjøttbetennelse (gingivitt)** eller **periodontitt**. Det er viktig å ta det på alvor – ubehandlet kan det føre til tannløsning.\n\n🦷 Vi anbefaler **tannrens og undersøkelse** (${formatNok(990)}, 60 min) for å fjerne bakterier og vurdere tilstanden.\n\nVil du booke en time?`,
      suggestions: ["Book tannrens", "Hva er periodontitt?", "Se priser"],
    };
  }

  // Visdomstann
  if (matchAny(m, ["visdomstann", "visdomstanna", "bakerste tann", "siste tann", "tann bak"])) {
    return {
      serviceId: "trekking",
      urgency: "snart",
      reply: `Problemer med **visdomstenner** er veldig vanlig. De kan:\n\n• Vokse skjevt og dytte på andre tenner\n• Bli delvis gjennombrutt og infisert\n• Skape vondt og hevelse\n\n🦷 Vi anbefaler en **undersøkelse med røntgen** (${formatNok(790)}) for å se hvordan visdomstannen ligger. Deretter vurderer vi om den bør trekkes.\n\nVil du booke?`,
      suggestions: ["Book undersøkelse", "Hva koster uttrekking?", "Åpningstider"],
    };
  }

  // Tannrens / rutine
  if (matchAny(m, ["rens", "puss", "tannstein", "misfarging", "gult", "kontroll", "sjekk", "rutine", "halvår", "årlig"])) {
    return {
      serviceId: "tannrens",
      urgency: "rutine",
      reply: `**Regelmessig tannrens** anbefales minst hvert halvår. Vi fjerner tannstein, pussen tennene og sjekker at alt er bra.\n\n🦷 **Tannrens og puss:** ${formatNok(990)}, 60 min.\n\nVil du booke en time?`,
      suggestions: ["Book tannrens", "Se åpningstider", "Priser"],
    };
  }

  return null;
}

// --- Intent routing ---

function route(message: string, history: ChatMessage[]): ChatResponse {
  const m = norm(message);

  // 1) Symptom check – runs before everything else
  const symptom = matchSymptom(m);
  if (symptom) {
    return {
      reply: symptom.reply,
      action: { type: "start_booking", serviceId: symptom.serviceId },
      suggestions: symptom.suggestions,
    };
  }

  // 2) Booking intent
  if (
    matchAny(m, ["book", "bestille", "bestill", "reservere", "sette opp", "time", "avtale", "ledig time", "ny time"]) &&
    !matchAny(m, ["avbest", "avlys", "kansell", "flytte", "endre"])
  ) {
    const matchedService = clinicConfig.services.find(s =>
      m.includes(norm(s.name)) || m.includes(s.id)
    );
    return {
      reply: matchedService
        ? `Selvsagt! Jeg hjelper deg med å bestille **${matchedService.name}** (${formatNok(matchedService.priceNok)}, ${matchedService.durationMinutes} min). La oss finne en tid som passer.`
        : "Flott! Jeg hjelper deg å bestille time. Hvilken behandling gjelder det?",
      action: { type: "start_booking", serviceId: matchedService?.id },
      suggestions: matchedService ? [] : ["Akuttkonsultasjon", "Undersøkelse", "Tannrens", "Fyllning"],
    };
  }

  // 3) Cancellation
  if (matchAny(m, ["avbest", "avlys", "kansell", "flytte time", "endre time"])) {
    return {
      reply: renderCancellation(),
      suggestions: ["Book ny time", "Åpningstider", "Priser"],
    };
  }

  // 4) Opening hours
  if (matchAny(m, ["åpningstid", "åpent", "stengt", "åpner", "stenger", "når har dere åpent"])) {
    return {
      reply: renderHours(),
      suggestions: ["Book time", "Se tjenester", "Adresse"],
    };
  }

  // 5) Services & prices
  if (matchAny(m, ["tjenest", "behandling", "pris", "koste", "kost", "hva koster", "tilbud", "oversikt"])) {
    const matched = clinicConfig.services.find(s =>
      m.includes(norm(s.name)) || m.includes(s.id)
    );
    if (matched) {
      return {
        reply: `**${matched.name}**\n${matched.description}\n\n• Varighet: ${matched.durationMinutes} min\n• Pris: ${formatNok(matched.priceNok)}\n\nØnsker du å bestille?`,
        suggestions: [`Book ${matched.name}`, "Se alle tjenester", "Åpningstider"],
      };
    }
    return {
      reply: renderServices(),
      suggestions: ["Book time", "Åpningstider", "Adresse"],
    };
  }

  // 6) Address / contact
  if (matchAny(m, ["adresse", "hvor ligger", "telefon", "kontakt", "e-post", "mail"])) {
    return {
      reply: renderContact(),
      suggestions: ["Åpningstider", "Book time", "Tjenester"],
    };
  }

  // 7) Greetings
  if (matchAny(m, ["hei", "hallo", "god dag", "god morgen", "halla", "heisann"])) {
    return {
      reply: `Hei! 👋 Jeg er den digitale resepsjonisten til ${clinicConfig.name}. Jeg hjelper deg med timer, priser og spørsmål – døgnet rundt.\n\nHva kan jeg hjelpe deg med?`,
      suggestions: ["Jeg har tannpine", "Book time", "Åpningstider", "Priser"],
    };
  }

  // 8) Thanks
  if (matchAny(m, ["takk", "tusen takk", "ha det", "snakkes"])) {
    return {
      reply: "Bare hyggelig! Ta kontakt igjen når som helst. Ha en fin dag! 🦷",
    };
  }

  // 9) Emergency
  if (matchAny(m, ["nød", "akutt", "livstruende", "pustepro", "kraftig blød"])) {
    return {
      reply: "⚠️ **Ved livstruende tilstand, ring 113 umiddelbart.**\n\nVed tannlegevakt utenfor åpningstid, kontakt nærmeste tannlegevakt.\n\nHar du tannpine som ikke er livstruende? Jeg hjelper deg å booke en akuttkonsultasjon.",
      suggestions: ["Book akuttkonsultasjon", "Åpningstider"],
    };
  }

  // 10) Identity
  if (matchAny(m, ["hvem er du", "robot", "ai", "bot", "menneske", "ekte"])) {
    return {
      reply: "Jeg er SvarAI – en digital assistent som hjelper deg 24/7. Jeg kan svare på spørsmål, vurdere symptomer og booke time. Er det noe mer komplisert setter jeg deg i kontakt med klinikken.",
      suggestions: ["Book time", "Jeg har tannpine", "Åpningstider"],
    };
  }

  // 11) Fallback – always helpful and positive
  return {
    reply: `Godt spørsmål! 😊 Her er hva jeg kan hjelpe deg med akkurat nå:\n\n🦷 **Har du vondt eller ubehag?** – beskriv symptomet ditt, så finner jeg riktig behandling for deg\n📅 **Vil du bestille time?** – jeg finner ledig tid med én gang\n💰 **Lurer du på priser?** – jeg gir deg full oversikt\n🕐 **Åpningstider eller adresse?** – bare spør!\n\nBare skriv hva som plager deg, så tar jeg det derfra! 👇`,
    suggestions: ["Jeg har tannpine", "Book time", "Se priser", "Åpningstider"],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body?.message ?? "";
    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing 'message'." }, { status: 400 });
    }

    const response = route(message, history);
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Intern feil i chat.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
