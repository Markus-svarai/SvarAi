"use client";

import { useEffect, useRef, useState } from "react";
import { clinicConfig, formatNok } from "@/lib/clinic-config";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
};

type BookingStep =
  | "none"
  | "choose-service"
  | "choose-date"
  | "choose-time"
  | "enter-details"
  | "confirm"
  | "booked";

type BookingDraft = {
  serviceId?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  name?: string;
  phone?: string;
  email?: string;
};

const INITIAL_SUGGESTIONS = ["Book time", "Åpningstider", "Priser", "Adresse", "Avbestille time"];

const welcome: Msg = {
  id: "welcome",
  role: "assistant",
  content: `Hei! 👋 Jeg er **SvarAI**, den digitale resepsjonisten til ${clinicConfig.name}. Jeg er her 24/7 og hjelper deg med timer, priser, åpningstider og andre spørsmål. Hva kan jeg gjøre for deg?`,
  suggestions: INITIAL_SUGGESTIONS,
};

// --- Helpers ---

function fmtDateLabel(iso: string): string {
  // iso YYYY-MM-DD -> "man. 27. april"
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "long" });
}

function nextNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  let added = 0;
  let offset = 0;
  while (added < n && offset < 60) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const day = d.getDay(); // 0 = sunday
    const dayName = clinicConfig.openingHours[(day + 6) % 7]; // map sunday(0)->index 6
    const dayKey = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"][day] as any;
    const hours = clinicConfig.openingHours.find(h => h.day === dayKey);
    if (hours?.open) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push(iso);
      added++;
    }
    offset++;
  }
  return out;
}

function timeSlotsFor(dateIso: string, durationMin: number): string[] {
  const d = new Date(dateIso + "T00:00:00");
  const day = d.getDay();
  const dayKey = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"][day] as any;
  const hours = clinicConfig.openingHours.find(h => h.day === dayKey);
  if (!hours?.open || !hours.close) return [];
  const [oh, om] = hours.open.split(":").map(Number);
  const [ch, cm] = hours.close.split(":").map(Number);
  const start = oh * 60 + om;
  const end = ch * 60 + cm - durationMin;
  const step = Math.max(15, Math.min(30, durationMin));
  const slots: string[] = [];
  for (let t = start; t <= end; t += step) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  // drop a couple of random ones to feel realistic
  return slots.filter((_, i) => i % 3 !== 1).slice(0, 8);
}

// --- Render helpers ---

function MarkdownText({ text }: { text: string }) {
  // Very small, safe "markdown": **bold** only, preserve newlines.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="msg-content">
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "assistant") {
    return (
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-soft">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4zm0 11c4.5 0 8 2.5 8 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1c0-2.5 3.5-5 8-5z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs font-medium">
      DU
    </div>
  );
}

// --- Main component ---

export default function ChatDemo() {
  const [messages, setMessages] = useState<Msg[]>([welcome]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>("none");
  const [draft, setDraft] = useState<BookingDraft>({});
  const [confirmation, setConfirmation] = useState<{ id: string; serviceName: string; date: string; time: string } | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, bookingStep, confirmation]);

  function push(msg: Omit<Msg, "id">) {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2) }]);
  }

  async function sendToChat(text: string) {
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      push({
        role: "assistant",
        content: data.reply,
        suggestions: data.suggestions,
      });
      if (data.action?.type === "start_booking") {
        startBooking(data.action.serviceId);
      }
    } catch {
      push({
        role: "assistant",
        content: "Beklager, jeg fikk ikke tak i svaret. Prøv igjen om et øyeblikk.",
      });
    } finally {
      setSending(false);
    }
  }

  function startBooking(serviceId?: string) {
    setConfirmation(null);
    setDraft({ serviceId });
    if (serviceId) {
      setBookingStep("choose-date");
    } else {
      setBookingStep("choose-service");
    }
  }

  async function handleSubmit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    push({ role: "user", content: trimmed });
    setInput("");
    await sendToChat(trimmed);
  }

  // --- Booking submit ---
  async function submitBooking() {
    if (!draft.serviceId || !draft.date || !draft.time || !draft.name || !draft.phone || !draft.email) return;
    setSending(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (data.ok) {
        setConfirmation({
          id: data.booking.id,
          serviceName: data.booking.serviceName,
          date: data.booking.date,
          time: data.booking.time,
        });
        setBookingStep("booked");
        push({
          role: "assistant",
          content: `✅ **Timen din er bekreftet!**\n\n**${data.booking.serviceName}**\n${fmtDateLabel(data.booking.date)} kl. ${data.booking.time}\n\nBookingnummer: **${data.booking.id}**\n\nDu vil motta bekreftelse på e-post og SMS. Er det noe annet jeg kan hjelpe deg med?`,
          suggestions: ["Åpningstider", "Adresse", "Avbestille time"],
        });
      } else {
        push({
          role: "assistant",
          content: `Noe gikk galt: ${data.error ?? "Ukjent feil."}`,
        });
        setBookingStep("enter-details");
      }
    } catch {
      push({
        role: "assistant",
        content: "Beklager, jeg fikk ikke lagret bookingen. Prøv igjen.",
      });
      setBookingStep("enter-details");
    } finally {
      setSending(false);
    }
  }

  // --- Render booking UI ---
  function BookingPane() {
    if (bookingStep === "none") return null;

    if (bookingStep === "choose-service") {
      return (
        <div className="animate-slide-up rounded-xl border border-ink-100 bg-white p-4 shadow-soft">
          <p className="text-sm font-medium text-ink-900 mb-3">Velg tjeneste</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {clinicConfig.services.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setDraft(d => ({ ...d, serviceId: s.id }));
                  setBookingStep("choose-date");
                }}
                className="text-left rounded-lg border border-ink-100 p-3 hover:border-brand-400 hover:bg-brand-50/40 transition"
              >
                <div className="text-sm font-semibold text-ink-900">{s.name}</div>
                <div className="text-xs text-ink-500 mt-0.5">{s.durationMinutes} min · {formatNok(s.priceNok)}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const service = clinicConfig.services.find(s => s.id === draft.serviceId);

    if (bookingStep === "choose-date" && service) {
      const dates = nextNDates(6);
      return (
        <div className="animate-slide-up rounded-xl border border-ink-100 bg-white p-4 shadow-soft">
          <p className="text-sm text-ink-500 mb-1">Valgt tjeneste</p>
          <p className="text-sm font-semibold text-ink-900 mb-3">{service.name} · {service.durationMinutes} min · {formatNok(service.priceNok)}</p>
          <p className="text-sm font-medium text-ink-900 mb-3">Velg dato</p>
          <div className="grid grid-cols-3 gap-2">
            {dates.map(d => (
              <button
                key={d}
                onClick={() => {
                  setDraft(x => ({ ...x, date: d }));
                  setBookingStep("choose-time");
                }}
                className="rounded-lg border border-ink-100 p-2 text-center hover:border-brand-400 hover:bg-brand-50/40 transition text-sm"
              >
                {fmtDateLabel(d)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setBookingStep("choose-service")}
            className="mt-3 text-xs text-ink-500 hover:text-ink-900"
          >
            ← Bytt tjeneste
          </button>
        </div>
      );
    }

    if (bookingStep === "choose-time" && service && draft.date) {
      const slots = timeSlotsFor(draft.date, service.durationMinutes);
      return (
        <div className="animate-slide-up rounded-xl border border-ink-100 bg-white p-4 shadow-soft">
          <p className="text-sm text-ink-500">Valgt tjeneste · dato</p>
          <p className="text-sm font-semibold text-ink-900 mb-3">
            {service.name} · {fmtDateLabel(draft.date)}
          </p>
          <p className="text-sm font-medium text-ink-900 mb-3">Velg tidspunkt</p>
          {slots.length === 0 ? (
            <p className="text-sm text-ink-500">Ingen ledige tider denne dagen. Velg en annen dato.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setDraft(x => ({ ...x, time: t }));
                    setBookingStep("enter-details");
                  }}
                  className="rounded-lg border border-ink-100 py-2 text-center text-sm hover:border-brand-400 hover:bg-brand-50/40 transition"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setBookingStep("choose-date")}
            className="mt-3 text-xs text-ink-500 hover:text-ink-900"
          >
            ← Bytt dato
          </button>
        </div>
      );
    }

    if (bookingStep === "enter-details" && service && draft.date && draft.time) {
      return (
        <form
          className="animate-slide-up rounded-xl border border-ink-100 bg-white p-4 shadow-soft space-y-3"
          onSubmit={e => {
            e.preventDefault();
            submitBooking();
          }}
        >
          <div>
            <p className="text-sm text-ink-500">Bekreft booking</p>
            <p className="text-sm font-semibold text-ink-900">
              {service.name} · {fmtDateLabel(draft.date)} kl. {draft.time}
            </p>
            <p className="text-xs text-ink-500">{formatNok(service.priceNok)} · {service.durationMinutes} min</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Fullt navn</span>
              <input
                required
                type="text"
                placeholder="Ola Nordmann"
                value={draft.name ?? ""}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-ink-700">Telefon</span>
                <input
                  required
                  type="tel"
                  placeholder="+47 123 45 678"
                  value={draft.phone ?? ""}
                  onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-700">E-post</span>
                <input
                  required
                  type="email"
                  placeholder="ola@eksempel.no"
                  value={draft.email ?? ""}
                  onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center rounded-lg bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-800 disabled:opacity-60"
            >
              {sending ? "Bekrefter…" : "Bekreft booking"}
            </button>
            <button
              type="button"
              onClick={() => setBookingStep("choose-time")}
              className="text-xs text-ink-500 hover:text-ink-900"
            >
              ← Tilbake
            </button>
          </div>
        </form>
      );
    }

    if (bookingStep === "booked" && confirmation) {
      return (
        <div className="animate-slide-up rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
            </div>
            <p className="text-sm font-semibold text-brand-900">Booking bekreftet</p>
          </div>
          <p className="mt-2 text-sm text-brand-900">
            <strong>{confirmation.serviceName}</strong><br />
            {fmtDateLabel(confirmation.date)} kl. {confirmation.time}<br />
            Bookingnummer: <strong>{confirmation.id}</strong>
          </p>
          <button
            onClick={() => {
              setBookingStep("none");
              setDraft({});
              setConfirmation(null);
            }}
            className="mt-3 text-xs text-brand-800 hover:text-brand-900 underline"
          >
            Lukk
          </button>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-ink-100 bg-white shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold shadow-soft">
                S
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-brand-400 border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">SvarAI</p>
              <p className="text-xs text-ink-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-soft" />
                Online · svarer på sekunder
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-ink-500">
            <span>{clinicConfig.name}</span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="h-[460px] overflow-y-auto scrollbar-thin px-4 py-5 relative"
          style={{ backgroundColor: "rgba(249,250,251,0.4)", perspective: "400px", perspectiveOrigin: "50% 0%" }}
        >
          <style>{`
            @keyframes waveScroll {
              0% { background-position-x: 0px; }
              100% { background-position-x: 60px; }
            }
          `}</style>
          {/* Back layer – waves */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='32'%3E%3Cpath d='M0,16 C100,8 200,24 400,16 S600,8 800,16' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='1.2'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat-y",
            backgroundSize: "100% 32px",
            transform: "translateZ(-40px) scale(1.12)",
            animation: "waveScroll 7s linear infinite",
            pointerEvents: "none",
            filter: "blur(0.4px)",
          }} />
          {/* Front layer – messages */}
          <div className="space-y-4 relative" style={{ transform: "translateZ(0px)", zIndex: 1 }}>
            {messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <Avatar role="assistant" />}
                <div className={`max-w-[80%] ${m.role === "user" ? "order-first" : ""}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft ${
                      m.role === "assistant"
                        ? "bg-white text-ink-900 rounded-tl-sm border border-ink-100"
                        : "bg-ink-900 text-white rounded-tr-sm"
                    }`}
                  >
                    <MarkdownText text={m.content} />
                  </div>
                  {m.suggestions && m.suggestions.length > 0 && !sending && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {m.suggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => handleSubmit(s)}
                          className="text-xs rounded-full border border-ink-200 bg-white px-3 py-1 text-ink-700 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/60 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === "user" && <Avatar role="user" />}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <Avatar role="assistant" />
                <div className="rounded-2xl rounded-tl-sm bg-white border border-ink-100 px-4 py-3 shadow-soft">
                  <span className="typing-dot" />
                  <span className="typing-dot ml-1" />
                  <span className="typing-dot ml-1" />
                </div>
              </div>
            )}

            {bookingStep !== "none" && (
              <div className="pl-11">
                <BookingPane />
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <form
          className="flex items-center gap-2 border-t border-ink-100 bg-white px-3 py-3"
          onSubmit={e => {
            e.preventDefault();
            handleSubmit(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Skriv en melding…"
            disabled={sending}
            className="flex-1 rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-4 py-2.5 text-white text-sm font-medium hover:bg-ink-800 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
      <p className="text-xs text-ink-500 text-center mt-3">
        Prøver du SvarAI? Dette er en live demo – svar genereres av AI.
      </p>
    </div>
  );
}
