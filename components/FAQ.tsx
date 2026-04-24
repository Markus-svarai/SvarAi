"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Hvordan fungerer oppsett?",
    a: "Vi trenger informasjon om klinikken din – tjenester, priser, åpningstider og vanlige spørsmål dere får. Innen 5 virkedager er SvarAI klar og tilpasset din klinikk. Du trenger ikke gjøre noe teknisk selv.",
  },
  {
    q: "Hva skjer med henvendelser som er for kompliserte for AI-en?",
    a: "SvarAI håndterer de fleste vanlige spørsmål. Hvis noe er for komplisert, informerer den pasienten om å ta direkte kontakt med klinikken. Du mister aldri en henvendelse.",
  },
  {
    q: "Kan pasientene mine se at det er en AI?",
    a: "SvarAI er åpen om at den er en digital assistent. Det fleste pasienter setter pris på at de får svar umiddelbart – uansett tidspunkt – fremfor å vente på at noen tar telefonen.",
  },
  {
    q: "Fungerer det med vår eksisterende nettside?",
    a: "Ja. SvarAI legges inn på nettsiden din med en enkel kode-linje. Det fungerer med alle vanlige nettsideløsninger – WordPress, Squarespace, Wix og egenutviklede sider.",
  },
  {
    q: "Er det bindingstid?",
    a: "Ingen bindingstid. Du betaler måned for måned og kan avslutte når du vil. Vi tilbyr også 14 dagers gratis prøveperiode uten kredittkort.",
  },
  {
    q: "Hva koster det å komme i gang?",
    a: "Ingenting. Oppsett er inkludert i abonnementet. Du starter gratis i 14 dager, og betaler kun hvis du ønsker å fortsette.",
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-sm font-semibold text-ink-900">{q}</span>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <p className="pb-5 text-sm text-ink-600 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <section className="py-24 bg-ink-50/40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Spørsmål og svar</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
            Vanlige spørsmål fra klinikker.
          </h2>
        </div>

        <div className="mt-12 max-w-3xl">
          {faqs.map(f => (
            <Item key={f.q} q={f.q} a={f.a} />
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-500">
          Har du andre spørsmål?{" "}
          <a href="mailto:hei@svarai.no" className="text-brand-700 hover:underline">
            Send oss en e-post
          </a>{" "}
          – vi svarer innen én arbeidsdag.
        </p>
      </div>
    </section>
  );
}
