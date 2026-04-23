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
  return s
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  return `${status}\n\nÅpningstider ved ${clinicConfig.name}:\n${lines.join("\n")}`;
}

function renderServices(): string {
  const lines = clinicConfig.services.map(
    s =>
      `• **${s.name}** – ${formatNok(s.priceNok)} (${s.durationMinutes} min)\n   ${s.description}`
  );
  return `Her er tjenestene våre:\n\n${lines.join("\n\n")}\n\nØnsker du å bestille en time?`;
}

function renderContact(): string {
  const a = clinicConfig.address;
  return [
    `📍 **Adresse**`,
    `${a.street}, ${a.postalCode} ${a.city}`,
    ``,
    `📞 **Telefon:** ${clinicConfig.contact.phone}`,
    `✉️ **E-post:** ${clinicConfig.contact.email}`,
    `🌐 **Nettside:** ${clinicConfig.contact.website}`,
  ].join("\n");
}

function renderCancellation(): string {
  return [
    "Du kan endre eller avbestille timen din på flere måter:",
    "",
    `• Her i chatten – bare si "jeg vil avbestille timen min"`,
    `• På telefon: ${clinicConfig.contact.phone}`,
    `• Via e-post: ${clinicConfig.contact.email}`,
    "",
    `ℹ️ ${clinicConfig.cancellationPolicy}`,
  ].join("\n");
}

// Intent routing.
function route(message: string, history: ChatMessage[]): ChatResponse {
  const m = norm(message);

  // 1) Booking intent
  if (
    matchAny(m, [
      "book", "bestille", "bestill", "reservere", "sette opp",
      "time", "avtale", "ledig time", "ny time",
    ]) &&
    !matchAny(m, ["avbest", "avlys", "kansell", "flytte", "endre"])
  ) {
    // Try to match a service
    const matchedService = clinicConfig.services.find(s =>
      m.includes(norm(s.name)) || m.includes(s.id)
    );
    return {
      reply: matchedService
        ? `Selvsagt! Jeg hjelper deg med å bestille **${matchedService.name}** (${formatNok(matchedService.priceNok)}, ${matchedService.durationMinutes} min). La oss finne en tid som passer.`
        : "Flott! Jeg hjelper deg gjerne å bestille time. Jeg åpner bookingen nå – der kan du velge tjeneste, dato og tid.",
      action: { type: "start_booking", serviceId: matchedService?.id },
    };
  }

  // 2) Cancellation / reschedule
  if (matchAny(m, ["avbest", "avlys", "kansell", "flytte time", "endre time", "endre avtale"])) {
    return {
      reply: renderCancellation(),
      suggestions: ["Åpningstider", "Priser", "Adresse"],
    };
  }

  // 3) Opening hours
  if (matchAny(m, ["åpningstid", "åpent", "stengt", "åpner", "stenger", "når har dere åpent", "når er dere åpne", "åpningstider"])) {
    return {
      reply: renderHours(),
      action: { type: "show_hours" },
      suggestions: ["Book time", "Se tjenester", "Adresse"],
    };
  }

  // 4) Services & prices
  if (matchAny(m, [
    "tjenest", "behandling", "pris", "koste", "kost", "hva koster",
    "hva tilbyr", "tilbud", "konsultasjon", "undersøkelse",
  ])) {
    // If specific service is mentioned
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
      action: { type: "show_services" },
      suggestions: ["Book time", "Åpningstider", "Adresse"],
    };
  }

  // 5) Address / contact
  if (matchAny(m, [
    "adresse", "hvor ligger", "hvor er dere", "kommer dere", "finner dere",
    "telefon", "nummer", "ring", "kontakt", "e-post", "epost", "mail",
  ])) {
    return {
      reply: renderContact(),
      suggestions: ["Åpningstider", "Book time", "Tjenester"],
    };
  }

  // 6) Greetings
  if (matchAny(m, ["hei", "hallo", "god dag", "god morgen", "god kveld", "halla", "heisann"])) {
    return {
      reply: `Hei! 👋 Jeg er SvarAI – den digitale resepsjonisten til ${clinicConfig.name}. Hva kan jeg hjelpe deg med i dag?`,
      suggestions: ["Book time", "Åpningstider", "Priser", "Adresse"],
    };
  }

  // 7) Thanks / goodbye
  if (matchAny(m, ["takk", "tusen takk", "ha det", "snakkes", "ses"])) {
    return {
      reply: "Bare hyggelig! Ta kontakt igjen når som helst. Ha en fin dag! 🌿",
    };
  }

  // 8) Emergency
  if (matchAny(m, ["nød", "akutt", "livstruende", "hjerteinfarkt", "pustepro", "blør"])) {
    return {
      reply:
        "⚠️ **Ved akutt sykdom eller livstruende tilstand, ring 113 (medisinsk nødhjelp).**\n\nVed behov for legevakt på kvelden/natten: ring 116 117.\n\nHvis det ikke haster, hjelper jeg deg gjerne med å bestille en vanlig time.",
      suggestions: ["Book time", "Åpningstider"],
    };
  }

  // 9) Identity
  if (matchAny(m, ["hvem er du", "er du en robot", "er du ekte", "ai", "bot", "menneske"])) {
    return {
      reply:
        "Jeg er SvarAI – en digital assistent som hjelper deg 24/7 på vegne av klinikken. Jeg kan svare på vanlige spørsmål, og sette opp timer for deg. Trenger du noe mer komplisert, setter jeg deg gjerne i kontakt med en av våre ansatte.",
      suggestions: ["Book time", "Snakke med ansatt", "Åpningstider"],
    };
  }

  // 10) Fallback
  return {
    reply:
      `Jeg er ikke helt sikker på hva du mener – men jeg kan hjelpe deg med åpningstider, tjenester og priser, booking, avbestilling eller kontaktinformasjon.\n\nKan du omformulere spørsmålet, eller velge et av forslagene nedenfor?`,
    suggestions: ["Book time", "Åpningstider", "Priser", "Adresse", "Avbestille time"],
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
