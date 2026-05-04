"use client";

import { useState, useEffect, useRef } from "react";

const PRESETS = [
  { label: "Tannklinikk", value: "tannklinikk" },
  { label: "Hudklinikk", value: "hudklinikk" },
  { label: "Fysioterapi", value: "fysioterapi" },
  { label: "Psykolog", value: "psykolog" },
  { label: "Legeklinikk", value: "legeklinikk" },
  { label: "Kiropraktor", value: "kiropraktor" },
];

const EXAMPLE_QUESTIONS: Record<string, { q: string; hint: string }[]> = {
  tannklinikk: [
    { q: "Jeg har vondt i en tann bak, det stikker og banker", hint: "Symptomforståelse" },
    { q: "Tannen min er veldig følsom for kaldt", hint: "Diagnose & råd" },
    { q: "Jeg vil bestille tannrens", hint: "Booking-flyt" },
    { q: "Når har dere åpent?", hint: "Åpningstider" },
  ],
  hudklinikk: [
    { q: "Jeg har fått et rødt utslett som ikke gir seg", hint: "Symptomforståelse" },
    { q: "Hva koster laserbehandling?", hint: "Priser" },
    { q: "Jeg vil booke en konsultasjon", hint: "Booking-flyt" },
    { q: "Har dere lørdag-timer?", hint: "Åpningstider" },
  ],
  fysioterapi: [
    { q: "Jeg har hatt vondt i ryggen i to uker", hint: "Symptomforståelse" },
    { q: "Trenger jeg henvisning fra lege?", hint: "Praktisk info" },
    { q: "Vil gjerne booke en time", hint: "Booking-flyt" },
    { q: "Hva koster en konsultasjon?", hint: "Priser" },
  ],
  psykolog: [
    { q: "Jeg sliter med angst og søvnproblemer", hint: "Henvendelse" },
    { q: "Tar dere imot nye pasienter?", hint: "Kapasitet" },
    { q: "Jeg vil booke en innledende samtale", hint: "Booking-flyt" },
    { q: "Tar dere helseforsikring?", hint: "Betaling" },
  ],
  legeklinikk: [
    { q: "Jeg har hatt feber og vondt i halsen i tre dager", hint: "Symptomforståelse" },
    { q: "Trenger fornyelse av resept", hint: "Rask henvendelse" },
    { q: "Vil booke time til lege", hint: "Booking-flyt" },
    { q: "Har dere øyeblikkelig hjelp?", hint: "Akutt" },
  ],
  kiropraktor: [
    { q: "Jeg har smerter i nakken og skuldrene", hint: "Symptomforståelse" },
    { q: "Hva koster en behandling?", hint: "Priser" },
    { q: "Vil booke første konsultasjon", hint: "Booking-flyt" },
    { q: "Kan kiropraktor hjelpe med hodepine?", hint: "Faglig spørsmål" },
  ],
};

function getExamples(clinicType: string) {
  const key = clinicType.toLowerCase().trim();
  return EXAMPLE_QUESTIONS[key] ?? [
    { q: `Jeg trenger hjelp med noe`, hint: "Henvendelse" },
    { q: `Hva koster en time?`, hint: "Priser" },
    { q: `Jeg vil booke en time`, hint: "Booking-flyt" },
    { q: `Når har dere åpent?`, hint: "Åpningstider" },
  ];
}

export default function DemoSection() {
  const [inputValue, setInputValue] = useState("tannklinikk");
  const [activeClinicType, setActiveClinicType] = useState("tannklinikk");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  function applyClinicType(value: string) {
    const trimmed = value.trim() || "tannklinikk";
    setActiveClinicType(trimmed);
    setIframeKey(k => k + 1); // Force iframe reload
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyClinicType(val), 600);
  }

  function handleInputBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    applyClinicType(inputValue);
  }

  function handlePreset(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue(value);
    applyClinicType(value);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const examples = getExamples(activeClinicType);
  const iframeSrc = `/widget?id=demo&clinicType=${encodeURIComponent(activeClinicType)}&color=1ea67e`;

  return (
    <section id="demo" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Live demo</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
            Prøv SvarAI akkurat som pasientene dine ville gjort.
          </h2>
          <p className="mt-5 text-lg text-ink-600 leading-relaxed">
            Beskriv symptomene dine, spør om priser og åpningstider, eller bestill time direkte.
            SvarAI forstår hva du trenger og hjelper deg til riktig behandling – akkurat som en resepsjonist, men aldri opptatt.
          </p>
        </div>

        {/* Clinic type selector */}
        <div className="mt-10 max-w-sm">
          <p className="text-sm font-medium text-ink-700 mb-3">Tilpass demo til din klinikk:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  activeClinicType.toLowerCase() === p.value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-ink-600 border-ink-200 hover:border-brand-400 hover:text-brand-700",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                applyClinicType(inputValue);
              }
            }}
            placeholder="Eller skriv din klinikk-type..."
            className="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-800 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>

        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border border-ink-100" style={{ height: 560 }}>
            <iframe
              key={iframeKey}
              src={iframeSrc}
              className="w-full h-full border-0"
              title="SvarAI Live Demo"
            />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-ink-600">
          {examples.map(x => (
            <div key={x.q} className="rounded-xl border border-ink-100 bg-white p-4">
              <p className="text-xs font-medium text-brand-700 uppercase tracking-wider">{x.hint}</p>
              <p className="mt-2 text-sm text-ink-800">&quot;{x.q}&quot;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
