"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };

type BookingState = {
  step: "idle" | "slots" | "info" | "done";
  serviceId: string;
  date: string;
  dateLabel: string;
  time: string;
};

const INIT_BOOKING: BookingState = {
  step: "idle", serviceId: "", date: "", dateLabel: "", time: "",
};

// ── Dag-helpers ────────────────────────────────────────────────────────────

function getUpcomingDays(count = 14) {
  const days: { label: string; short: string; value: string }[] = [];
  const today = new Date();
  for (let i = 0; days.length < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      label: d.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" }),
      short: i === 0 ? "I dag" : i === 1 ? "I morgen" : d.toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "short" }),
      value: d.toLocaleDateString("sv-SE"),
    });
  }
  return days;
}

// ── Markdown ───────────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i} style={{ whiteSpace: "pre-line" }}>{p}</span>
  );
}

// ── SlotPicker ─────────────────────────────────────────────────────────────

function SlotPicker({ clinicId, serviceId, brandColor, onSelect }: {
  clinicId: string;
  serviceId: string;
  brandColor: string;
  onSelect: (date: string, time: string, dateLabel: string) => void;
}) {
  const days = getUpcomingDays();
  const [dayIndex, setDayIndex] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const currentDay = days[dayIndex];

  useEffect(() => {
    if (!currentDay) return;
    setLoadingSlots(true);
    setSlots([]);
    fetch(`/api/availability?clinicId=${encodeURIComponent(clinicId)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(currentDay.value)}`)
      .then(r => r.json())
      .then(data => setSlots((data.slots ?? []).map((s: { time: string }) => s.time)))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [dayIndex, clinicId, serviceId, currentDay?.value]);

  return (
    <div style={{
      background: "#f9fafb",
      borderTop: "1px solid #f0f0f0",
      padding: "14px 14px 10px",
    }}>
      {/* Dag-navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button
          onClick={() => setDayIndex(i => Math.max(0, i - 1))}
          disabled={dayIndex === 0}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid #e5e7eb",
            background: dayIndex === 0 ? "#f9fafb" : "#fff",
            color: dayIndex === 0 ? "#d1d5db" : "#374151",
            cursor: dayIndex === 0 ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600,
          }}
        >‹</button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{currentDay.short}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{currentDay.value}</div>
        </div>

        <button
          onClick={() => setDayIndex(i => Math.min(days.length - 1, i + 1))}
          disabled={dayIndex === days.length - 1}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#374151",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600,
          }}
        >›</button>
      </div>

      {/* Ledige tider */}
      {loadingSlots ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
          <div style={{
            display: "flex", gap: 4, alignItems: "center",
          }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                animation: "pulse 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        </div>
      ) : slots.length === 0 ? (
        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", margin: "8px 0" }}>
          Ingen ledige tider denne dagen — prøv en annen dag
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {slots.map(time => (
            <button
              key={time}
              onClick={() => onSelect(currentDay.value, time, currentDay.label)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: `1.5px solid ${brandColor}`,
                background: "#fff",
                color: brandColor,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.1s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = brandColor;
                (e.currentTarget as HTMLElement).style.color = "#fff";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "#fff";
                (e.currentTarget as HTMLElement).style.color = brandColor;
              }}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── InfoForm ───────────────────────────────────────────────────────────────

function InfoForm({ date, time, dateLabel, brandColor, loading, onSubmit, onCancel }: {
  date: string;
  time: string;
  dateLabel: string;
  brandColor: string;
  loading: boolean;
  onSubmit: (name: string, phone: string, email: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Skriv inn fullt navn");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return setError("Skriv inn et gyldig telefonnummer (8 siffer)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Skriv inn en gyldig e-postadresse");
    onSubmit(name.trim(), phone.trim(), email.trim());
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontSize: 13,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      background: "#f9fafb",
      borderTop: "1px solid #f0f0f0",
      padding: "14px",
    }}>
      {/* Time summary */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 12, padding: "8px 12px",
        background: "#fff", borderRadius: 8,
        border: "1px solid #e5e7eb",
        fontSize: 12, color: "#374151",
      }}>
        <span style={{ fontSize: 14 }}>📅</span>
        <span><strong>{dateLabel}</strong> kl. <strong>{time}</strong></span>
        <button
          onClick={onCancel}
          style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}
        >
          Endre tid
        </button>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          placeholder="Fullt navn"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          style={inputStyle}
          autoFocus
        />
        <input
          placeholder="Telefonnummer"
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setError(""); }}
          style={inputStyle}
        />
        <input
          placeholder="E-postadresse"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          style={inputStyle}
        />
        {error && (
          <p style={{ fontSize: 11, color: "#ef4444", margin: 0 }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#e5e7eb" : brandColor,
            color: loading ? "#9ca3af" : "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            transition: "background 0.15s",
            marginTop: 2,
          }}
        >
          {loading ? "Bestiller…" : "Bekreft booking →"}
        </button>
      </form>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(["Jeg har tannpine", "Book time", "Åpningstider", "Priser"]);
  const [blocked, setBlocked] = useState(false);
  const [booking, setBooking] = useState<BookingState>(INIT_BOOKING);
  const [bookingLoading, setBookingLoading] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const clinicId = params.get("id") ?? "demo";
  const brandColor = "#" + (params.get("color") ?? "1ea67e");

  const sessionId = useRef<string>(
    typeof crypto !== "undefined"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );

  useEffect(() => {
    fetch(`/api/widget-check?id=${encodeURIComponent(clinicId)}`)
      .then(res => {
        if (!res.ok) setBlocked(true);
        else addAssistantMessage("Hei! 👋 Jeg er den digitale resepsjonisten. Hva kan jeg hjelpe deg med?", ["Jeg har tannpine", "Book time", "Åpningstider", "Priser"]);
      })
      .catch(() => addAssistantMessage("Hei! 👋 Jeg er den digitale resepsjonisten. Hva kan jeg hjelpe deg med?", ["Jeg har tannpine", "Book time", "Åpningstider", "Priser"]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, booking.step]);

  function addAssistantMessage(text: string, sugg?: string[]) {
    setMessages(prev => [...prev, { role: "assistant", text }]);
    setSuggestions(sugg ?? []);
  }

  function addUserMessage(text: string) {
    setMessages(prev => [...prev, { role: "user", text }]);
    setSuggestions([]);
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const trimmed = text.trim();
    setInput("");
    addUserMessage(trimmed);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, clinicId, sessionId: sessionId.current }),
      });
      const data = await res.json();

      if (data.action?.type === "start_booking") {
        // Trigger SlotPicker uansett — bruk serviceId fra action eller fallback
        const sid = (data.action.serviceId as string) || "undersokelse";
        setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
        setSuggestions([]);
        setBooking({ ...INIT_BOOKING, step: "slots", serviceId: sid });
      } else {
        addAssistantMessage(data.reply, data.suggestions);
      }
    } catch {
      addAssistantMessage("Beklager, noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionClick(s: string) {
    if (s === "Book en ny time") {
      setBooking(INIT_BOOKING);
      send("Book time");
      return;
    }
    send(s);
  }

  function handleSlotSelect(date: string, time: string, dateLabel: string) {
    setBooking(b => ({ ...b, step: "info", date, time, dateLabel }));
  }

  async function handleInfoSubmit(name: string, phone: string, email: string) {
    setBookingLoading(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: booking.serviceId,
          date: booking.date,
          time: booking.time,
          name, phone, email,
          clinicId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setBooking(b => ({ ...b, step: "done" }));
        addAssistantMessage(
          `✅ **Timen er bestilt!**\n\n📅 ${booking.dateLabel} kl. ${booking.time}\n👤 ${name}\n\nKlinikken vil bekrefte timen. Ha en fin dag! 🦷`,
          ["Book en ny time", "Åpningstider"]
        );
      } else {
        addAssistantMessage(`Beklager: ${data.error ?? "Noe gikk galt."} Prøv igjen.`, ["Prøv igjen", "Ring oss"]);
        setBooking(INIT_BOOKING);
      }
    } catch {
      addAssistantMessage("Klarte ikke å sende bestillingen. Prøv igjen.", ["Prøv igjen"]);
      setBooking(INIT_BOOKING);
    } finally {
      setBookingLoading(false);
    }
  }


  if (blocked) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#ffffff", padding: 24, textAlign: "center",
      }}>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Chat er ikke tilgjengelig.</p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Ta kontakt med klinikken direkte.</p>
      </div>
    );
  }

  const showInput = booking.step === "idle" || booking.step === "done";

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: "#ffffff", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px", borderBottom: "1px solid #f0f0f0",
        background: "#ffffff", flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: brandColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0, position: "relative",
        }}>
          S
          <span style={{
            position: "absolute", bottom: 1, right: 1,
            width: 9, height: 9, borderRadius: "50%",
            background: "#22c55e", border: "2px solid white",
          }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>SvarAI</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>● Online – svarer på sekunder</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} style={{
        flex: 1, overflowY: "auto",
        padding: "16px 12px 8px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            gap: 8, alignItems: "flex-end",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: brandColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: 11, flexShrink: 0,
              }}>S</div>
            )}
            <div style={{
              maxWidth: "78%", padding: "9px 13px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? "#111" : "#f4f4f5",
              color: msg.role === "user" ? "#fff" : "#111",
              fontSize: 13, lineHeight: 1.5,
            }}>
              {renderMarkdown(msg.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: brandColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 11, flexShrink: 0,
            }}>S</div>
            <div style={{
              padding: "9px 14px", borderRadius: "18px 18px 18px 4px",
              background: "#f4f4f5", display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                  animation: "pulse 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div style={{ height: 4 }} />
      </div>

      {/* Suggestions (bare når ikke i booking-flyt) */}
      {suggestions.length > 0 && showInput && (
        <div style={{ padding: "6px 12px", display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSuggestionClick(s)} style={{
              padding: "5px 12px", borderRadius: 20,
              border: "1px solid #e5e7eb", background: "#fff",
              color: "#374151", fontSize: 12, cursor: "pointer",
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f4f4f5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Slot picker */}
      {booking.step === "slots" && (
        <SlotPicker
          clinicId={clinicId}
          serviceId={booking.serviceId}
          brandColor={brandColor}
          onSelect={handleSlotSelect}
        />
      )}

      {/* Info form */}
      {booking.step === "info" && (
        <InfoForm
          date={booking.date}
          time={booking.time}
          dateLabel={booking.dateLabel}
          brandColor={brandColor}
          loading={bookingLoading}
          onSubmit={handleInfoSubmit}
          onCancel={() => setBooking(b => ({ ...b, step: "slots" }))}
        />
      )}

      {/* Input (kun synlig når ikke i booking-flyt) */}
      {showInput && (
        <div style={{
          padding: "8px 12px 12px", borderTop: "1px solid #f0f0f0",
          display: "flex", gap: 8, flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="Skriv en melding…"
            style={{
              flex: 1, padding: "9px 14px", borderRadius: 24,
              border: "1px solid #e5e7eb", fontSize: 13,
              outline: "none", background: "#fafafa",
            }}
            onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.background = "#fff"; }}
            onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: input.trim() && !loading ? "#111" : "#e5e7eb",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M3 10L17 10M17 10L11 4M17 10L11 16" stroke={input.trim() && !loading ? "#fff" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
