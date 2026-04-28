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

// ── Availability helper ────────────────────────────────────────────────────

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
    return (data.slots ?? []).slice(0, 6).map((s: { time: string }) => s.time);
  } catch {
    return [];
  }
}

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE");
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
}

function tomorrowLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("nb-NO", { weekday: "long" });
}

// ── Build system prompt ────────────────────────────────────────────────────

function buildSystemPrompt(
  config: ClinicConfig,
  todaySlots: Record<string, string[]>,
  tomorrowSlots: Record<string, string[]>
): string {
  const hours = config.openingHours
    .map(h => (!h.open ? `${h.day}: Stengt` : `${h.day}: ${h.open}–${h.close}`))
    .join(", ");

  const services = config.services
    .map(s => `- ${s.name} (id: ${s.id}): ${formatNok(s.priceNok)}, ${s.durationMinutes} min — ${s.description}`)
    .join("\n");

  const slotsSection = config.services.map(s => {
    const today = todaySlots[s.id] ?? [];
    const tomorrow = tomorrowSlots[s.id] ?? [];
    if (today.length === 0 && tomorrow.length === 0) return `- ${s.name}: ingen ledige tider de nærmeste dagene`;
    const todayTxt = today.length > 0 ? `i dag: ${today.join(", ")}` : "i dag: fullt";
    const tomorrowTxt = tomorrow.length > 0 ? `${tomorrowLabel()}: ${tomorrow.join(", ")}` : "";
    return `- ${s.name} (${s.id}): ${[todayTxt, tomorrowTxt].filter(Boolean).join(" | ")}`;
  }).join("\n");

  const openStatus = isOpenNow(config) ? "Vi har åpent akkurat nå." : "Vi har stengt akkurat nå.";

  return `Du er en vennlig resepsjonist-assistent for ${config.name}, en tannklinikk i Norge.
Din oppgave er å hjelpe pasienter med spørsmål, symptomvurdering og timebestilling.

KLINIKK-INFO:
- Navn: ${config.name}
- Telefon: ${config.contact.phone}
- E-post: ${config.contact.email}
- Adresse: ${config.address.street}, ${config.address.postalCode} ${config.address.city}
- Åpningstider: ${hours}
- Status nå: ${openStatus}
- Avbestillingspolitikk: ${config.cancellationPolicy}

TJENESTER OG PRISER:
${services}

LEDIGE TIDER:
${slotsSection}

PERSONLIGHETSREGLER:
1. Svar alltid direkte på det pasienten faktisk spør om — ikke ignorer spørsmålet og push en booking.
2. Hvis pasienten er usikker på diagnosen (sier "tror", "kanskje", "ikke sikker"), IKKE konkluder med en spesifikk behandling. Si heller: "Det kan godt hende, men vi starter alltid med en undersøkelse for å finne ut av det."
3. Pasienten betaler ALDRI for behandling som ikke blir gjort. Si dette tydelig hvis de er bekymret for pris.
4. Hvis pasienten stiller et nytt spørsmål, svar på DET spørsmålet — ikke gjenta forrige anbefaling.
5. La pasienten føle at de velger selv. Gi alternativer istedenfor å bestemme for dem.
6. Vær varm, rolig og ærlig. Ikke pushy eller salgsorientert.
7. Aldri nevn at du er en AI eller chatbot med mindre pasienten spør direkte.
8. Svar alltid på norsk.
9. Hold svar korte og konsise — maks 4-5 setninger om gangen.

BOOKING-REGLER:
- Trigger "start_booking" kun når pasienten aktivt ønsker en time, ikke ved symptomspørsmål.
- Bruk serviceId fra tjenestelisten over.
- Hvis det ikke er ledige tider, be dem ringe: ${config.contact.phone}

SVAR-FORMAT:
Du MÅ alltid svare med gyldig JSON i dette formatet:
{
  "reply": "Melding til pasienten (støtter **bold** og linjeskift med \\n)",
  "action": {"type": "start_booking", "serviceId": "tjeneste-id"} eller null,
  "suggestions": ["Alternativ 1", "Alternativ 2", "Alternativ 3"]
}

Suggestions skal være korte knapper pasienten kan trykke på (2-4 stykk). Velg dem basert på hva som er logisk neste steg.
Svar KUN med JSON — ingen tekst rundt.`;
}

// ── LLM call ──────────────────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): Promise<ChatResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ikke satt");

  // Bygg meldingshistorikk (maks 10 siste for å holde kontekst)
  const trimmedHistory = history.slice(-10);
  const messages = [
    ...trimmedHistory.map(h => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API feil: ${res.status} ${err}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";

  // Parse JSON fra svaret
  try {
    // Prøv direkte parse
    return JSON.parse(raw) as ChatResponse;
  } catch {
    // Prøv å ekstrahere fra ```json blokk
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim()) as ChatResponse;
      } catch { /* fall through */ }
    }
    // Prøv å finne første { ... } blokk
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as ChatResponse;
      } catch { /* fall through */ }
    }
    // Fallback: returner rå tekst som reply
    return {
      reply: raw || "Beklager, noe gikk galt. Ring oss gjerne direkte.",
      suggestions: ["Ring oss", "Book time", "Åpningstider"],
    };
  }
}

// ── Fallback (brukes hvis Claude API er nede) ─────────────────────────────

function fallbackResponse(config: ClinicConfig): ChatResponse {
  return {
    reply: `Beklager, jeg har tekniske problemer akkurat nå. 🙏\n\nRing oss direkte på **${config.contact.phone}** eller send e-post til **${config.contact.email}** — vi hjelper deg med en gang!`,
    suggestions: ["Ring oss", "Send e-post"],
    unanswered: true,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────

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

    // Hent ledige tider parallelt for de to vanligste tjenestene
    const today = todayStr();
    const tomorrow = tomorrowStr();
    const mainServices = config.services.slice(0, 4).map(s => s.id);

    const [todayResults, tomorrowResults] = await Promise.all([
      Promise.all(mainServices.map(id => getAvailableSlots(clinicId, id, today).then(slots => ({ id, slots })))),
      Promise.all(mainServices.map(id => getAvailableSlots(clinicId, id, tomorrow).then(slots => ({ id, slots })))),
    ]);

    const todaySlots = Object.fromEntries(todayResults.map(r => [r.id, r.slots]));
    const tomorrowSlots = Object.fromEntries(tomorrowResults.map(r => [r.id, r.slots]));

    const systemPrompt = buildSystemPrompt(config, todaySlots, tomorrowSlots);

    // Kall Claude — fallback til enkel feilmelding hvis API er nede
    let response: ChatResponse;
    try {
      response = await callClaude(systemPrompt, history, message);
    } catch (err: any) {
      console.error("Claude API feil:", err?.message ?? err);
      console.error("ANTHROPIC_API_KEY satt:", !!process.env.ANTHROPIC_API_KEY);
      response = fallbackResponse(config);
      // Returner feildetaljer i dev
      if (process.env.NODE_ENV !== "production") {
        response.reply = `Debug: ${err?.message ?? String(err)}`;
      }
    }

    // Lagre samtale i Supabase (asynkront)
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
      }).catch(() => {});
    }

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Intern feil i chat.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
