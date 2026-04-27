"use client";

import { useEffect, useState } from "react";

const conversation = [
  { role: "assistant", text: "Hei! 👋 Jeg er den digitale resepsjonisten. Hva kan jeg hjelpe deg med?", delay: 500 },
  { role: "user", text: "Jeg har veldig vondt i en tann bak, det banker og stikker", delay: 2000 },
  { role: "assistant", text: "Det høres ut som tannpine – dette kan skyldes et hull eller betennelse i tannroten. 🦷 Jeg anbefaler en **akuttkonsultasjon** så snart som mulig (890 kr, 30 min). Vil du se ledige tider?", delay: 4000 },
  { role: "user", text: "Ja gjerne, hva har dere i morgen?", delay: 7500 },
  { role: "assistant", text: "Vi har følgende ledige tider i morgen:\n• 09:00\n• 11:30\n• 14:00\n\nHvilken passer best for deg?", delay: 9500 },
  { role: "user", text: "09:00 passer fint", delay: 12500 },
  { role: "assistant", text: "✅ **Timen er bekreftet!**\nAkuttkonsultasjon – i morgen kl. 09:00\n\nDu mottar bekreftelse på SMS. Vi gleder oss til å se deg! 🦷", delay: 14500 },
];

export default function AnimatedDemo() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (visibleMessages >= conversation.length) return;

    const current = conversation[visibleMessages];
    const next = conversation[visibleMessages + 1];

    const showTimer = setTimeout(() => {
      if (current.role === "assistant") setIsTyping(true);

      const revealTimer = setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(v => v + 1);
      }, current.role === "assistant" ? 1200 : 400);

      return () => clearTimeout(revealTimer);
    }, visibleMessages === 0 ? current.delay : (next ? next.delay - current.delay : 1000));

    return () => clearTimeout(showTimer);
  }, [visibleMessages]);

  // Restart animation after completion
  useEffect(() => {
    if (visibleMessages >= conversation.length) {
      const restart = setTimeout(() => setVisibleMessages(0), 4000);
      return () => clearTimeout(restart);
    }
  }, [visibleMessages]);

  function renderText(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-2xl border border-ink-100 bg-white shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-100 bg-white relative overflow-hidden">
          {/* Tapering stripe pattern */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} preserveAspectRatio="none" viewBox="0 0 400 56">
            {[
              { y: 10, opacity: 0.18, amp: 3 },
              { y: 20, opacity: 0.13, amp: 4 },
              { y: 30, opacity: 0.09, amp: 3 },
              { y: 40, opacity: 0.05, amp: 2 },
              { y: 50, opacity: 0.02, amp: 1.5 },
            ].map((w, i) => (
              <path
                key={i}
                d={`M0,${w.y} C50,${w.y - w.amp} 100,${w.y + w.amp} 150,${w.y} S250,${w.y - w.amp} 300,${w.y} S350,${w.y + w.amp} 400,${w.y}`}
                fill="none"
                stroke="#000"
                strokeWidth="1"
                opacity={w.opacity}
              />
            ))}
          </svg>
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold text-sm">
              S
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-brand-400 border-2 border-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">SvarAI</p>
            <p className="text-xs text-ink-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              Online · svarer på sekunder
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-hidden px-4 py-4 bg-ink-50/40 space-y-3">
          {conversation.slice(0, visibleMessages).map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""} animate-fade-in`}>
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">S</div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-soft whitespace-pre-line ${
                msg.role === "assistant"
                  ? "bg-white text-ink-900 rounded-tl-sm border border-ink-100"
                  : "bg-ink-900 text-white rounded-tr-sm"
              }`}>
                {renderText(msg.text)}
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-ink-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">P</div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">S</div>
              <div className="bg-white border border-ink-100 rounded-2xl rounded-tl-sm px-3 py-2 shadow-soft">
                <span className="typing-dot" />
                <span className="typing-dot ml-1" />
                <span className="typing-dot ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-ink-100 bg-white px-3 py-2.5">
          <div className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-xs text-ink-400">
            Skriv en melding…
          </div>
          <div className="rounded-xl bg-ink-900 px-3 py-2 text-white text-xs font-medium">Send</div>
        </div>
      </div>
    </div>
  );
}
