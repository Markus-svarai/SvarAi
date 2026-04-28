"use client";

import { useEffect, useRef, useState } from "react";

// ── Animation steps ────────────────────────────────────────────────────────
// Each step adds a message or changes the UI panel

type Step =
  | { type: "msg"; role: "assistant" | "user"; text: string }
  | { type: "show_slots" }
  | { type: "select_slot"; time: string }
  | { type: "show_form" }
  | { type: "submit_form" }
  | { type: "done" };

const STEPS: Step[] = [
  { type: "msg", role: "assistant", text: "Hei! Jeg er resepsjonisten her. Hva kan jeg hjelpe deg med?" },
  { type: "msg", role: "user",      text: "Jeg har veldig vondt i en tann bak, det banker og stikker" },
  { type: "msg", role: "assistant", text: "Det høres akutt ut — dette bør vi se på raskt. Vi har ledige tider i dag. Vil du booke?" },
  { type: "msg", role: "user",      text: "Ja gjerne" },
  { type: "msg", role: "assistant", text: "Velg en tid som passer:" },
  { type: "show_slots" },
  { type: "select_slot", time: "10:30" },
  { type: "show_form" },
  { type: "submit_form" },
  { type: "done" },
];

const STEP_DELAYS = [500, 2000, 3800, 5800, 7200, 7800, 10500, 11200, 15000, 15800];
const RESTART_DELAY = 5000;

const SLOTS = ["09:00", "10:30", "13:00", "14:30"];
const BRAND = "#1ea67e";

function renderText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function AnimatedDemo() {
  const [step, setStep]           = useState(-1);
  const [isTyping, setIsTyping]   = useState(false);
  const [panel, setPanel]         = useState<"none" | "slots" | "form" | "done">("none");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [filledName, setFilledName]     = useState(false);
  const [filledPhone, setFilledPhone]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Collect visible messages from steps
  const messages = STEPS
    .slice(0, Math.max(0, step + 1))
    .filter((s): s is Extract<Step, { type: "msg" }> => s.type === "msg");

  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(() => {
        setStep(-1);
        setPanel("none");
        setSelectedSlot(null);
        setFilledName(false);
        setFilledPhone(false);
        setIsTyping(false);
      }, RESTART_DELAY);
      return () => clearTimeout(t);
    }

    const nextStep = step + 1;
    if (nextStep >= STEPS.length) return;

    const delay = nextStep === 0 ? STEP_DELAYS[0] : STEP_DELAYS[nextStep] - STEP_DELAYS[nextStep - 1];

    const t = setTimeout(() => {
      const s = STEPS[nextStep];

      if (s.type === "msg" && s.role === "assistant") {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setStep(nextStep);
        }, 900);
      } else if (s.type === "show_slots") {
        setPanel("slots");
        setStep(nextStep);
      } else if (s.type === "select_slot") {
        setSelectedSlot(s.time);
        setStep(nextStep);
      } else if (s.type === "show_form") {
        setPanel("form");
        setStep(nextStep);
      } else if (s.type === "submit_form") {
        // Simulate filling in fields
        setTimeout(() => setFilledName(true), 300);
        setTimeout(() => setFilledPhone(true), 800);
        setStep(nextStep);
      } else if (s.type === "done") {
        setPanel("done");
        setStep(nextStep);
      } else {
        setStep(nextStep);
      }
    }, delay);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isTyping, panel]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-ink-100 bg-white shadow-card overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-100 bg-white">
          <div className="relative">
            <div className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm text-white" style={{ background: BRAND }}>S</div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">SvarAI</p>
            <p className="text-xs text-ink-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Online — svarer på sekunder
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="overflow-y-auto px-3 py-3 space-y-2.5"
          style={{ height: 260, background: "rgba(249,250,251,0.5)" }}
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 items-end ${msg.role === "user" ? "justify-end" : ""}`}
              style={{ animation: "demoFadeIn 0.2s ease" }}>
              {msg.role === "assistant" && (
                <div className="h-6 w-6 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: BRAND }}>S</div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-white text-ink-900 border border-ink-100 shadow-sm rounded-bl-sm"
                  : "text-white rounded-br-sm"
              }`} style={msg.role === "user" ? { background: "#111" } : {}}>
                {renderText(msg.text)}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 items-end" style={{ animation: "demoFadeIn 0.2s ease" }}>
              <div className="h-6 w-6 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: BRAND }}>S</div>
              <div className="bg-white border border-ink-100 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#9ca3af",
                    animation: "demoPulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel: Slot picker */}
        {panel === "slots" && (
          <div style={{ background: "#f9fafb", borderTop: "1px solid #f0f0f0", padding: "12px 14px", animation: "demoSlideUp 0.22s ease" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
              I dag — velg en tid:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SLOTS.map(t => (
                <div key={t} style={{
                  padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "default",
                  border: `1.5px solid ${selectedSlot === t ? BRAND : "#e5e7eb"}`,
                  background: selectedSlot === t ? BRAND : "#fff",
                  color: selectedSlot === t ? "#fff" : BRAND,
                  transition: "all 0.15s",
                  boxShadow: selectedSlot === t ? `0 0 0 3px ${BRAND}22` : "none",
                }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel: Info form */}
        {panel === "form" && (
          <div style={{ background: "#f9fafb", borderTop: "1px solid #f0f0f0", padding: "12px 14px", animation: "demoSlideUp 0.22s ease" }}>
            {/* Time summary */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 10px", background: "#fff", borderRadius: 7, border: "1px solid #e5e7eb", fontSize: 11, color: "#374151" }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="14" height="14" rx="2" stroke="#9ca3af" strokeWidth="1.5"/>
                <path d="M7 2v4M13 2v4M3 9h14" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>I dag kl. <strong>10:30</strong></span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>Endre tid</span>
            </div>
            {/* Fields */}
            {[
              { label: "Fullt navn", value: filledName ? "Kari Nordmann" : "", placeholder: "Fullt navn" },
              { label: "Telefon", value: filledPhone ? "47 98 76 54" : "", placeholder: "Telefonnummer" },
              { label: "E-post", value: "", placeholder: "E-postadresse" },
            ].map((f, i) => (
              <div key={i} style={{
                width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #e5e7eb",
                background: "#fff", fontSize: 12, color: f.value ? "#111" : "#9ca3af",
                marginBottom: i < 2 ? 6 : 8,
              }}>
                {f.value || f.placeholder}
              </div>
            ))}
            <div style={{
              padding: "8px", borderRadius: 7, background: BRAND, color: "#fff",
              textAlign: "center", fontSize: 12, fontWeight: 700,
            }}>
              Bekreft booking →
            </div>
          </div>
        )}

        {/* Panel: Done */}
        {panel === "done" && (
          <div style={{ background: "#f0faf6", borderTop: `1px solid ${BRAND}33`, padding: "14px", animation: "demoSlideUp 0.22s ease", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" fill={BRAND}/>
                <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>Timen er bestilt</span>
            </div>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>I dag kl. 10:30 — Kari Nordmann</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Bekreftelse sendes på e-post</p>
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-center gap-2 border-t border-ink-100 bg-white px-3 py-2.5">
          <div className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-xs text-ink-400">
            Skriv en melding…
          </div>
          <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: "#111" }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M3 10L17 10M17 10L11 4M17 10L11 16" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes demoFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes demoSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes demoPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
