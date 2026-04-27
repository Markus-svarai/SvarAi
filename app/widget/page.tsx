"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };
type BookingStep = "idle" | "date" | "time" | "name" | "phone" | "email" | "confirm" | "done";

const AVAILABLE_TIMES = ["09:00", "10:00", "11:30", "13:00", "14:30", "15:30"];

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getNextDates(count = 5): { label: string; value: string }[] {
  const dates: { label: string; value: string }[] = [];
  const d = new Date();
  for (let i = 1; dates.length < count; i++) {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    const dow = next.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    dates.push({
      label: next.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" }),
      value: next.toISOString().split("T")[0],
    });
  }
  return dates;
}

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i} style={{ whiteSpace: "pre-line" }}>{p}</span>
  );
}

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(["Jeg har tannpine", "Book time", "Åpningstider", "Priser"]);
  const [blocked, setBlocked] = useState(false);

  // Booking state
  const [bookingStep, setBookingStep] = useState<BookingStep>("idle");
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<{
    serviceId: string; date: string; time: string; name: string; phone: string; email: string;
  }>({ serviceId: "", date: "", time: "", name: "", phone: "", email: "" });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const clinicId = params.get("id") ?? "demo";
  const brandColor = "#" + (params.get("color") ?? "6c63ff");

  useEffect(() => {
    // Check if this clinic has an active subscription
    fetch(`/api/widget-check?id=${encodeURIComponent(clinicId)}`)
      .then(res => {
        if (!res.ok) {
          setBlocked(true);
        } else {
          addAssistantMessage(
            "Hei! 👋 Jeg er den digitale resepsjonisten. Hva kan jeg hjelpe deg med?",
            ["Jeg har tannpine", "Book time", "Åpningstider", "Priser"]
          );
        }
      })
      .catch(() => {
        // On network error, allow through (fail open — better UX than blocking)
        addAssistantMessage(
          "Hei! 👋 Jeg er den digitale resepsjonisten. Hva kan jeg hjelpe deg med?",
          ["Jeg har tannpine", "Book time", "Åpningstider", "Priser"]
        );
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function addAssistantMessage(text: string, sugg?: string[]) {
    setMessages(prev => [...prev, { role: "assistant", text }]);
    if (sugg) setSuggestions(sugg);
    else setSuggestions([]);
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

    // Handle booking flow
    if (bookingStep !== "idle" && bookingStep !== "done") {
      await handleBookingInput(trimmed);
      return;
    }

    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const data = await res.json();
      addAssistantMessage(data.reply, data.suggestions);

      // Start booking flow if action triggered
      if (data.action?.type === "start_booking" && data.action.serviceId) {
        setPendingServiceId(data.action.serviceId);
      }
    } catch {
      addAssistantMessage("Beklager, noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  function startBooking(serviceId: string) {
    setBookingData(d => ({ ...d, serviceId }));
    setBookingStep("date");
    const dates = getNextDates();
    const labels = dates.map(d => d.label);
    addAssistantMessage(
      "Velg dato for timen din:",
      labels
    );
  }

  async function handleBookingInput(input: string) {
    switch (bookingStep) {
      case "date": {
        const dates = getNextDates();
        const match = dates.find(d =>
          d.label.toLowerCase().includes(input.toLowerCase()) ||
          d.value === input
        );
        const chosenDate = match?.value ?? getTomorrowDate();
        setBookingData(d => ({ ...d, date: chosenDate }));
        setBookingStep("time");
        addAssistantMessage(
          `Ledige tider ${match?.label ?? input}:`,
          AVAILABLE_TIMES
        );
        break;
      }
      case "time": {
        const time = AVAILABLE_TIMES.includes(input) ? input : AVAILABLE_TIMES[0];
        setBookingData(d => ({ ...d, time }));
        setBookingStep("name");
        addAssistantMessage("Hva er ditt fulle navn?");
        break;
      }
      case "name": {
        if (input.trim().length < 2) {
          addAssistantMessage("Skriv inn fullt navn (minst 2 tegn).");
          return;
        }
        setBookingData(d => ({ ...d, name: input.trim() }));
        setBookingStep("phone");
        addAssistantMessage("Hva er ditt telefonnummer?");
        break;
      }
      case "phone": {
        const digits = input.replace(/\D/g, "");
        if (digits.length < 8) {
          addAssistantMessage("Skriv inn et gyldig telefonnummer (8 siffer).");
          return;
        }
        setBookingData(d => ({ ...d, phone: input.trim() }));
        setBookingStep("email");
        addAssistantMessage("Hva er din e-postadresse?");
        break;
      }
      case "email": {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
          addAssistantMessage("Skriv inn en gyldig e-postadresse.");
          return;
        }
        const finalData = { ...bookingData, email: input.trim() };
        setBookingData(finalData);
        setBookingStep("confirm");
        addAssistantMessage(
          `Her er en oppsummering av bestillingen din:\n\n📅 **Dato:** ${new Date(finalData.date + "T00:00:00").toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })}\n🕐 **Tid:** kl. ${finalData.time}\n👤 **Navn:** ${finalData.name}\n📞 **Telefon:** ${finalData.phone}\n✉️ **E-post:** ${finalData.email}\n\nBekreft bestillingen?`,
          ["Ja, bekreft", "Avbryt"]
        );
        break;
      }
      case "confirm": {
        if (input.toLowerCase().includes("avbryt") || input.toLowerCase().includes("nei")) {
          setBookingStep("idle");
          setPendingServiceId(null);
          addAssistantMessage("Bestillingen ble avbrutt. Kan jeg hjelpe deg med noe annet?", ["Book time", "Åpningstider", "Priser"]);
          return;
        }
        // Submit booking
        setLoading(true);
        try {
          const res = await fetch("/api/booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingData),
          });
          const data = await res.json();
          if (data.ok) {
            setBookingStep("done");
            addAssistantMessage(
              `✅ **Timen er bestilt!**\n\nBookingnr: ${data.booking.id}\n\nKlinikken vil ringe deg på **${bookingData.phone}** for å bekrefte timen. Ha en fin dag! 🦷`,
              ["Book en ny time", "Åpningstider"]
            );
          } else {
            addAssistantMessage(`Beklager: ${data.error ?? "Noe gikk galt."}`, ["Prøv igjen", "Ring oss"]);
            setBookingStep("idle");
          }
        } catch {
          addAssistantMessage("Klarte ikke å sende bestillingen. Prøv igjen.", ["Prøv igjen"]);
          setBookingStep("idle");
        } finally {
          setLoading(false);
        }
        break;
      }
    }
  }

  // When a "Book ..." suggestion is clicked after AI replies with booking action
  function handleSuggestionClick(s: string) {
    if (s === "Book en ny time") {
      setBookingStep("idle");
      setPendingServiceId(null);
      setBookingData({ serviceId: "", date: "", time: "", name: "", phone: "", email: "" });
      send("Book time");
      return;
    }

    // If we just got a booking action and user clicks "Book akuttkonsultasjon" etc.
    if (pendingServiceId && (s.toLowerCase().includes("book") || s.toLowerCase().includes("bestill"))) {
      addUserMessage(s);
      setSuggestions([]);
      startBooking(pendingServiceId);
      setPendingServiceId(null);
      return;
    }

    send(s);
  }

  if (blocked) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#ffffff",
        padding: 24,
        textAlign: "center",
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16 }}>
          <circle cx="12" cy="12" r="10" stroke="#d1d5db" strokeWidth="1.5"/>
          <path d="M8 8l8 8M16 8l-8 8" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Chat er ikke tilgjengelig.</p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Ta kontakt med klinikken direkte.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: "#ffffff",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px 16px",
        borderBottom: "1px solid #f0f0f0",
        background: "#ffffff",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Tapering stripe pattern */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 6px,
            rgba(0,0,0,0.04) 6px,
            rgba(0,0,0,0.04) 8px
          )`,
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
          pointerEvents: "none",
        }} />
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: brandColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontSize: 14,
          position: "relative",
          flexShrink: 0,
        }}>
          S
          <span style={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid white",
          }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>SvarAI</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>● Online – svarer på sekunder</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            gap: 8,
            alignItems: "flex-end",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: brandColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 11,
                flexShrink: 0,
              }}>S</div>
            )}
            <div style={{
              maxWidth: "78%",
              padding: "9px 13px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? "#111" : "#f4f4f5",
              color: msg.role === "user" ? "#fff" : "#111",
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              {renderMarkdown(msg.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: brandColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 11, flexShrink: 0,
            }}>S</div>
            <div style={{
              padding: "9px 14px", borderRadius: "18px 18px 18px 4px",
              background: "#f4f4f5", display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                  animation: "pulse 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{
          padding: "6px 12px",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          flexShrink: 0,
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = "#f4f4f5";
                (e.target as HTMLElement).style.borderColor = "#d1d5db";
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = "#fff";
                (e.target as HTMLElement).style.borderColor = "#e5e7eb";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: "8px 12px 12px",
        borderTop: "1px solid #f0f0f0",
        display: "flex",
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder="Skriv en melding…"
          style={{
            flex: 1,
            padding: "9px 14px",
            borderRadius: 24,
            border: "1px solid #e5e7eb",
            fontSize: 13,
            outline: "none",
            background: "#fafafa",
          }}
          onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.background = "#fff"; }}
          onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: input.trim() && !loading ? "#111" : "#e5e7eb",
            border: "none",
            cursor: input.trim() && !loading ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M3 10L17 10M17 10L11 4M17 10L11 16" stroke={input.trim() && !loading ? "#fff" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

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
