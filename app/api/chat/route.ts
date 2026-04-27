import { NextRequest, NextResponse } from "next/server";
import { ClinicConfig, formatNok, isOpenNow } from "@/lib/clinic-config";
import { getClinicData } from "@/lib/get-clinic-data";
import { upsertConversation, isSupabaseConfigured } from "@/lib/supabase";

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
  unanswered?: boolean;
};

function norm(s: string) {
  return s.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
}

function matchAny(text: string, patterns: string[]): boolean {
  const n = norm(text);
  return patterns.some(p => n.includes(p));
}

function renderHours(config: ClinicConfig): string {
  const lines = config.openingHours.map(h => {
    if (!h.open || !h.close) return `• ${h.day}: Stengt`;
    return `• ${h.day}: ${h.open}–${h.close}`;
  });
  const status = isOpenNow(config)
    ? "✅ Vi har åpent nå."
    : "🔒 Vi har stengt akkurat nå.";
  return `${status}\n\nÅpningstider:\n${lines.join("\n")}`;
}

function renderServices(config: ClinicConfig): string {
  const lines = config.services.map(
    s => `• **${s.name}** – ${formatNok(s.priceNok)} (${s.durationMinutes} min)\n   ${s.description}`
  );
  return `Her er tjenestene våre:\n\n${lines.join("\n\n")}\n\nØnsker du å bestille en time?`;
}

function renderContact(config: ClinicConfig): string {
  const a = config.address;
  return [
    `📍 **Adresse:** ${a.street}, ${a.postalCode} ${a.city}`,
    `📞 **Telefon:** ${config.contact.phone}`,
    `✉️ **E-post:** ${config.contact.email}`,
    `🌐 **Nettside:** ${config.contact.website}`,
  ].join("\n");
}

function renderCancellation(config: ClinicConfig): string {
  return [
    "Du kan avbestille eller endre timen din slik:",
    "",
    `• Her i chatten – si bare "jeg vil avbestille"`,
    `• Telefon: ${config.contact.phone}`,
    `• E-post: ${config.contact.email}`,
    "",
    `ℹ️ ${config.cancellationPolicy}`,
  ].join("\n");
}

// --- Symptom intelligence ---

type SymptomMatch = {
  serviceId: string;
  urgency: "akutt" | "snart" | "rutine";
  reply: string;
  suggestions: string[];
};

function getServicePrice(config: ClinicConfig, serviceId: string, fallback: number): number {
  const service = config.services.find(s => s.id === serviceId);
  return service ? service.priceNok : fallback;
}

function matchSymptom(m: string, config: ClinicConfig): SymptomMatch | null {
  const akuttPris = getServicePrice(config, "akutt", 890);
  const undersokelsePris = getServicePrice(config, "undersokelse", 790);
  const fyllningPris = getServicePrice(config, "fyllning", 1290);
  const tannrensPris = getServicePrice(config, "tannrens", 990);

  // Akutt smerte / hevelse
  if (matchAny(m, ["vondt", "tannpine", "smerte", "verker", "banker", "stikker", "prikker", "pulserer", "hardt vondt", "veldig vondt"])) {
    const hasSwelling = matchAny(m, ["hoven", "hevelse", "hovner", "kinn", "betennelse"]);
    if (hasSwelling) {
      return {
        serviceId: "akutt",
        urgency: "akutt",
        reply: `Det høres ut som en mulig **tanninfeksjon eller abscess** – hevelse i kjeven kan være alvorlig og bør undersøkes **så fort som mulig**.\n\n⚠️ Vi anbefaler en **akuttkonsultasjon i dag** (${formatNok(akuttPris)}, 30 min).\n\nVil du se ledige tider?`,
        suggestions: ["Book akuttkonsultasjon", "Ring oss", "Mer info"],
      };
    }
    return {
      serviceId: "akutt",
      urgency: "akutt",
      reply: `Det høres ut som **tannpine** – dette kan skyldes et hull, sprukket tann, eller betennelse i tannroten.\n\n🦷 Vi anbefaler en **akuttkonsultasjon** så snart som mulig (${formatNok(akuttPris)}, 30 min). Legen vil undersøke og fortelle deg nøyaktig hva som må gjøres.\n\nVil du booke en time?`,
      suggestions: ["Book akuttkonsultasjon", "Se alle tider", "Hva koster det?"],
    };
  }

  // Brukket eller løs tann
  if (matchAny(m, ["brukket", "knekt", "løs tann", "falt ut", "mistet tann", "slått ut", "chip", "flekk av"])) {
    return {
      serviceId: "akutt",
      urgency: "akutt",
      reply: `En **brukket eller løs tann** bør undersøkes **snarest mulig** – jo raskere vi ser på det, jo større sjanse er det for å redde tannen.\n\n🦷 Vi anbefaler **akuttkonsultasjon** i dag (${formatNok(akuttPris)}, 30 min).\n\nVil du booke en time nå?`,
      suggestions: ["Book akuttkonsultasjon", "Ring oss direkte", "Åpningstider"],
    };
  }

  // Hull / karies
  if (matchAny(m, ["hull", "karies", "råte", "svart tann", "mørk tann", "fyllning", "fyllning har falt"])) {
    return {
      serviceId: "fyllning",
      urgency: "snart",
      reply: `Det høres ut som du trenger en **fyllning** – dette er en vanlig behandling der vi fjerner karies og fyller hullet med en hvit komposittfyllning.\n\n🦷 **Fyllning:** ${formatNok(fyllningPris)}, ca. 45 min. Smertefritt med lokalbedøvelse.\n\nVil du booke en time?`,
      suggestions: ["Book fyllning", "Hva skjer under behandlingen?", "Se priser"],
    };
  }

  // Følsomhet
  if (matchAny(m, ["følsom", "sensitiv", "kaldt", "varmt", "søtt", "surt", "ising", "iset", "isnende"])) {
    return {
      serviceId: "undersokelse",
      urgency: "snart",
      reply: `**Følsomhet for kaldt, varmt eller søtt** kan tyde på:\n\n• Hull (karies) i en tann\n• Slitt tannemalje\n• Tannhalsen er blottlagt\n\n🦷 Vi anbefaler en **undersøkelse** så vi finner årsaken og kan gi riktig behandling (${formatNok(undersokelsePris)}, 45 min inkl. røntgen).\n\nVil du booke en undersøkelse?`,
      suggestions: ["Book undersøkelse", "Se priser", "Åpningstider"],
    };
  }

  // Tannkjøtt / blødning
  if (matchAny(m, ["tannkjøtt", "blør", "blødning", "rødt", "betent tannkjøtt", "periodontitt", "løs", "trekker seg"])) {
    return {
      serviceId: "tannrens",
      urgency: "snart",
      reply: `**Blødende eller betent tannkjøtt** er ofte et tegn på **tannkjøttbetennelse (gingivitt)** eller **periodontitt**. Det er viktig å ta det på alvor – ubehandlet kan det føre til tannløsning.\n\n🦷 Vi anbefaler **tannrens og undersøkelse** (${formatNok(tannrensPris)}, 60 min) for å fjerne bakterier og vurdere tilstanden.\n\nVil du booke en time?`,
      suggestions: ["Book tannrens", "Hva er periodontitt?", "Se priser"],
    };
  }

  // Visdomstann
  if (matchAny(m, ["visdomstann", "visdomstanna", "bakerste tann", "siste tann", "tann bak"])) {
    return {
      serviceId: "trekking",
      urgency: "snart",
      reply: `Problemer med **visdomstenner** er veldig vanlig. De kan:\n\n• Vokse skjevt og dytte på andre tenner\n• Bli delvis gjennombrutt og infisert\n• Skape vondt og hevelse\n\n🦷 Vi anbefaler en **undersøkelse med røntgen** (${formatNok(undersokelsePris)}) for å se hvordan visdomstannen ligger. Deretter vurderer vi om den bør trekkes.\n\nVil du booke?`,
      suggestions: ["Book undersøkelse", "Hva koster uttrekking?", "Åpningstider"],
    };
  }

  // Tannrens / rutine
  if (matchAny(m, ["rens", "puss", "tannstein", "misfarging", "gult", "kontroll", "sjekk", "rutine", "halvår", "årlig"])) {
    return {
      serviceId: "tannrens",
      urgency: "rutine",
      reply: `**Regelmessig tannrens** anbefales minst hvert halvår. Vi fjerner tannstein, pussen tennene og sjekker at alt er bra.\n\n🦷 **Tannrens og puss:** ${formatNok(tannrensPris)}, 60 min.\n\nVil du booke en time?`,
      suggestions: ["Book tannrens", "Se åpningstider", "Priser"],
    };
  }

  return null;
}

// --- Availability helper ---

async function getAvailableSlots(
  clinicId: string,
  serviceId: string,
  date: string
): Promise<string[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://svarai.no";
    const res = await fetch(
      `${baseUrl}/api/availability?clinicId=${encodeURIComponent(clinicId)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.slots ?? []).slice(0, 5).map((s: { time: string }) => s.time);
  } catch {
    return ["09:00", "10:30", "13:00", "14:30"];
  }
}

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

// --- Intent routing ---

function isUrgent(m: string): boolean {
  return matchAny(m, ["i dag", "nå", "asap", "snarest", "så fort", "med en gang", "akutt", "umiddelbart", "første ledige", "første mulige", "så snart"]);
}

async function route(message: string, history: ChatMessage[], config: ClinicConfig, clinicId: string): Promise<ChatResponse> {
  const m = norm(message);
  const urgent = isUrgent(m);

  // 1) Symptom check
  const symptom = matchSymptom(m, config);
  if (symptom) {
    if (urgent || symptom.urgency === "akutt") {
      const times = await getAvailableSlots(clinicId, symptom.serviceId, todayStr());
      if (times.length > 0) {
        return {
          reply: `Det høres vondt ut — vi tar det på alvor.\n\n**Ledige tider i dag:**\n${times.map(t => `• kl. ${t}`).join("\n")}\n\nHvilken tid passer?`,
          action: { type: "start_booking", serviceId: symptom.serviceId },
          suggestions: times,
        };
      }
      return {
        reply: `Det høres vondt ut — vi tar det på alvor.\n\nDessverre har vi ingen ledige tider i dag. Vi anbefaler å ringe oss direkte på ${config.contact.phone} for akutthjelp.`,
        action: { type: "start_booking", serviceId: symptom.serviceId },
        suggestions: ["Ring oss", "Se tider i morgen"],
      };
    }
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
    const matchedService = config.services.find(s =>
      m.includes(norm(s.name)) || m.includes(s.id)
    );

    if (urgent) {
      const serviceId = matchedService?.id ?? (config.services[0]?.id ?? "");
      const times = await getAvailableSlots(clinicId, serviceId, todayStr());
      if (times.length > 0) {
        return {
          reply: `Ledige tider i dag:\n\n${times.map(t => `• kl. ${t}`).join("\n")}\n\nHvilken passer?`,
          action: { type: "start_booking", serviceId },
          suggestions: times,
        };
      }
      return {
        reply: `Ingen ledige tider i dag dessverre. Ring oss på ${config.contact.phone} for å finne noe som passer.`,
        action: { type: "start_booking", serviceId },
        suggestions: ["Ring oss", "Se andre datoer"],
      };
    }

    return {
      reply: matchedService
        ? `Jeg hjelper deg med **${matchedService.name}** (${formatNok(matchedService.priceNok)}, ${matchedService.durationMinutes} min). La oss finne en tid.`
        : "Jeg hjelper deg å bestille time. Hva gjelder det — eller vil du bare ha første ledige?",
      action: { type: "start_booking", serviceId: matchedService?.id },
      suggestions: matchedService ? [] : ["Første ledige time", "Akuttkonsultasjon", "Undersøkelse", "Tannrens"],
    };
  }

  // 2b) "Første ledige"
  if (matchAny(m, ["første ledige", "første mulige", "når er dere ledig", "når har dere ledig"])) {
    const serviceId = config.services[0]?.id ?? "";
    const times = await getAvailableSlots(clinicId, serviceId, todayStr());
    if (times.length > 0) {
      return {
        reply: `Første ledige tider i dag:\n\n${times.map(t => `• kl. ${t}`).join("\n")}\n\nHvilken passer?`,
        action: { type: "start_booking", serviceId },
        suggestions: times,
      };
    }
    return {
      reply: `Ingen ledige tider i dag. Ring oss på ${config.contact.phone} så finner vi noe som passer.`,
      suggestions: ["Ring oss", "Se åpningstider"],
    };
  }

  // 3) Cancellation
  if (matchAny(m, ["avbest", "avlys", "kansell", "flytte time", "endre time"])) {
    return {
      reply: renderCancellation(config),
      suggestions: ["Book ny time", "Åpningstider", "Priser"],
    };
  }

  // 4) Opening hours
  if (matchAny(m, ["åpningstid", "åpent", "stengt", "åpner", "stenger", "når har dere åpent"])) {
    return {
      reply: renderHours(config),
      suggestions: ["Book time", "Se tjenester", "Adresse"],
    };
  }

  // 5) Services & prices
  if (matchAny(m, ["tjenest", "behandling", "pris", "koste", "kost", "hva koster", "tilbud", "oversikt"])) {
    const matched = config.services.find(s =>
      m.includes(norm(s.name)) || m.includes(s.id)
    );
    if (matched) {
      return {
        reply: `**${matched.name}**\n${matched.description}\n\n• Varighet: ${matched.durationMinutes} min\n• Pris: ${formatNok(matched.priceNok)}\n\nØnsker du å bestille?`,
        suggestions: [`Book ${matched.name}`, "Se alle tjenester", "Åpningstider"],
      };
    }
    return {
      reply: renderServices(config),
      suggestions: ["Book time", "Åpningstider", "Adresse"],
    };
  }

  // 6) Address / contact
  if (matchAny(m, ["adresse", "hvor ligger", "telefon", "kontakt", "e-post", "mail"])) {
    return {
      reply: renderContact(config),
      suggestions: ["Åpningstider", "Book time", "Tjenester"],
    };
  }

  // 7) Greetings
  if (matchAny(m, ["hei", "hallo", "god dag", "god morgen", "halla", "heisann"])) {
    return {
      reply: `Hei! 👋 Jeg er her for deg – kan hjelpe med time, priser, symptomer og åpningstider.\n\nHva kan jeg gjøre for deg?`,
      suggestions: ["Jeg har tannpine", "Book time", "Åpningstider", "Priser"],
    };
  }

  // 8) Thanks
  if (matchAny(m, ["takk", "tusen takk", "ha det", "snakkes"])) {
    return {
      reply: "Bare hyggelig. Ta kontakt igjen når som helst 🦷",
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
      reply: "Jeg er SvarAI – en digital assistent som hjelper deg 24/7. Jeg kan svare på spørsmål, vurdere symptomer og booke time.\n\nFor kompliserte saker setter jeg deg direkte i kontakt med klinikken.",
      suggestions: ["Book time", "Jeg har tannpine", "Snakk med oss"],
    };
  }

  // 11) Human handoff
  if (matchAny(m, ["snakk med", "vil ha menneske", "vil snakke med", "ekte person", "ringe", "ring oss", "kontakt dere", "send melding", "la meg snakke"])) {
    return {
      reply: `Selvfølgelig! Du kan nå oss direkte her:\n\n📞 **Telefon:** ${config.contact.phone}\n✉️ **E-post:** ${config.contact.email}\n\n${isOpenNow(config) ? "✅ Vi har åpent nå – ring oss gjerne!" : "🔒 Vi har stengt akkurat nå, men send en e-post så svarer vi så fort vi kan."}`,
      suggestions: ["Book time i stedet", "Åpningstider"],
    };
  }

  // 12) Smart fallback
  const lastTopics = history
    .filter(h => h.role === "user")
    .map(h => norm(h.content))
    .join(" ");

  const fallbackCount = history
    .filter(h => h.role === "assistant")
    .filter(h => h.content.includes("Kan du si litt mer") || h.content.includes("Hva gjelder det"))
    .length;

  if (fallbackCount >= 2) {
    return {
      reply: `Jeg er ikke sikker på om jeg forstår hva du mener, og vil ikke gi deg feil svar. 🙏\n\nDu er velkommen til å ringe eller sende oss en e-post – da hjelper en av oss deg med en gang.\n\n📞 ${config.contact.phone}\n✉️ ${config.contact.email}`,
      suggestions: ["Book time", "Åpningstider", "Priser"],
    };
  }

  if (matchAny(lastTopics, ["book", "time", "bestill", "avtale"])) {
    return {
      reply: "Hvilken behandling gjelder det? Er det tannrens, undersøkelse, eller har du vondt et sted?",
      suggestions: ["Tannrens", "Undersøkelse", "Jeg har tannpine", "Fyllning"],
    };
  }

  if (matchAny(lastTopics, ["pris", "kost", "betale"])) {
    return {
      reply: "Hvilken behandling lurer du på prisen for? Jeg finner det med én gang.",
      suggestions: ["Tannrens", "Fyllning", "Undersøkelse", "Tannuttrekking"],
    };
  }

  if (matchAny(m, ["tann", "munn", "kjeve", "gom", "leppe", "bite", "tygge"])) {
    return {
      reply: "Det høres ut som du har et spørsmål om tannen din. Kan du beskrive litt mer hva du kjenner – er det smerte, følsomhet, eller noe annet?",
      suggestions: ["Det gjør vondt", "Følsomt for kaldt", "Noe løst eller brukket", "Blødende tannkjøtt"],
    };
  }

  return {
    reply: "Hva gjelder det? Jeg hjelper gjerne med time, priser, åpningstider eller symptomer. Eller si \"snakk med oss\" om du vil ringe/sende e-post.",
    suggestions: ["Jeg har tannpine", "Book time", "Se priser", "Snakk med oss"],
    unanswered: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body?.message ?? "";
    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];
    const clinicId: string = typeof body?.clinicId === "string" ? body.clinicId : "demo";
    const sessionId: string = typeof body?.sessionId === "string" ? body.sessionId : "";

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing 'message'." }, { status: 400 });
    }

    const config = await getClinicData(clinicId);
    const response = await route(message, history, config, clinicId);

    // Lagre samtale i Supabase (asynkront, blokkerer ikke svaret)
    if (sessionId && isSupabaseConfigured()) {
      const updatedMessages = [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: response.reply },
      ];
      upsertConversation({
        clinic_id: clinicId,
        session_id: sessionId,
        messages: updatedMessages,
        has_unanswered: response.unanswered === true,
      }).catch(() => {}); // stille feil — logging skal ikke krasje chat
    }

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Intern feil i chat.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
