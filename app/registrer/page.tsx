"use client";

import { useState } from "react";

type ClinicType = "tannlege" | "lege" | "hudklinikk" | "fysioterapi" | "generell";

type HourRow = { day: string; sort_order: number; open: string | null; close: string | null };

const CLINIC_TYPES: { value: ClinicType; label: string; emoji: string }[] = [
  { value: "tannlege",    label: "Tannlege",      emoji: "🦷" },
  { value: "lege",        label: "Legeklinikk",   emoji: "🩺" },
  { value: "hudklinikk",  label: "Hudklinikk",    emoji: "✨" },
  { value: "fysioterapi", label: "Fysioterapi",   emoji: "💪" },
  { value: "generell",    label: "Annen klinikk", emoji: "🏥" },
];

const DEFAULT_HOURS: HourRow[] = [
  { day: "Mandag",   sort_order: 0, open: "08:00", close: "16:00" },
  { day: "Tirsdag",  sort_order: 1, open: "08:00", close: "16:00" },
  { day: "Onsdag",   sort_order: 2, open: "08:00", close: "16:00" },
  { day: "Torsdag",  sort_order: 3, open: "08:00", close: "16:00" },
  { day: "Fredag",   sort_order: 4, open: "08:00", close: "15:00" },
  { day: "Lørdag",   sort_order: 5, open: null,    close: null    },
  { day: "Søndag",   sort_order: 6, open: null,    close: null    },
];

type Step = 1 | 2 | 3;

type Result = {
  clinicId: string;
  widgetUrl: string;
  embedCode: string;
  adminUrl: string;
};

export default function RegistrerPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  // Steg 1 – klinikk-info
  const [name, setName] = useState("");
  const [type, setType] = useState<ClinicType>("tannlege");
  const [tagline, setTagline] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [street, setStreet] = useState("");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");

  // Steg 2 – åpningstider
  const [hours, setHours] = useState<HourRow[]>(DEFAULT_HOURS.map(h => ({ ...h })));

  function setHourField(idx: number, field: "open" | "close", value: string) {
    setHours(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value || null } : h));
  }

  function toggleDay(idx: number) {
    setHours(prev => prev.map((h, i) => {
      if (i !== idx) return h;
      if (h.open) return { ...h, open: null, close: null };
      return { ...h, open: "08:00", close: "16:00" };
    }));
  }

  function validateStep1(): string {
    if (!name.trim()) return "Fyll inn klinikk-navn.";
    if (!phone.trim()) return "Fyll inn telefonnummer.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Fyll inn gyldig e-postadresse.";
    return "";
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, type, tagline,
          address_street: street,
          address_postal: postal,
          address_city: city,
          contact_phone: phone,
          contact_email: email,
          contact_website: website,
          hours,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Noe gikk galt. Prøv igjen.");
        return;
      }
      setResult(data);
      setStep(3);
    } catch {
      setError("Kunne ikke koble til serveren. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="py-6 px-6 flex items-center justify-between max-w-3xl mx-auto w-full">
        <a href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-indigo-600">SvarAI</span>
        </a>
        <span className="text-sm text-slate-400">Registrering</span>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-16">
        {/* Progress bar */}
        {step < 3 && (
          <div className="w-full max-w-lg mb-8 mt-2">
            <div className="flex items-center gap-2 mb-2">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step >= s ? "bg-indigo-600 text-white" : "bg-white text-slate-400 border border-slate-200"
                  }`}>
                    {step > s ? "✓" : s}
                  </div>
                  <span className={`text-sm ${step >= s ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                    {s === 1 ? "Klinikk-info" : "Åpningstider"}
                  </span>
                  {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-indigo-600" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEG 1: Klinikk-info ── */}
        {step === 1 && (
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Registrer klinikken din</h1>
              <p className="text-slate-500 text-sm mb-7">Fyll ut informasjonen under. Du kan endre alt i admin-panelet etterpå.</p>

              {/* Klinikk-type velger */}
              <label className="block text-sm font-medium text-slate-700 mb-2">Type klinikk</label>
              <div className="grid grid-cols-3 gap-2 mb-5 sm:grid-cols-5">
                {CLINIC_TYPES.map(ct => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setType(ct.value)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                      type === ct.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl">{ct.emoji}</span>
                    {ct.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Klinikk-navn <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="f.eks. Rygge Tannklinikk AS"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slagord <span className="text-slate-400 font-normal">(valgfritt)</span></label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="f.eks. Trygg tannbehandling for hele familien"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefon <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+47 22 00 11 22"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-post <span className="text-red-400">*</span></label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="post@klinikk.no"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nettside <span className="text-slate-400 font-normal">(valgfritt)</span></label>
                  <input
                    type="text"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="www.klinikken.no"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse <span className="text-slate-400 font-normal">(valgfritt)</span></label>
                  <input
                    type="text"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="Storgata 1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={postal}
                      onChange={e => setPostal(e.target.value)}
                      placeholder="Postnr."
                      className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Sted"
                      className="col-span-2 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={() => {
                  const e = validateStep1();
                  if (e) { setError(e); return; }
                  setError("");
                  setStep(2);
                }}
                className="mt-7 w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-indigo-700 transition-colors"
              >
                Neste: Åpningstider →
              </button>
            </div>
          </div>
        )}

        {/* ── STEG 2: Åpningstider ── */}
        {step === 2 && (
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Åpningstider</h2>
              <p className="text-slate-500 text-sm mb-7">Velg hvilke dager dere har åpent og klokkeslett. Du kan endre dette i admin-panelet.</p>

              <div className="space-y-3">
                {hours.map((h, idx) => (
                  <div key={h.day} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`w-24 text-sm font-medium py-1.5 px-2 rounded-lg border transition-all text-left ${
                        h.open
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      {h.day}
                    </button>

                    {h.open ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={h.open ?? ""}
                          onChange={e => setHourField(idx, "open", e.target.value)}
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="text-slate-400 text-sm">–</span>
                        <input
                          type="time"
                          value={h.close ?? ""}
                          onChange={e => setHourField(idx, "close", e.target.value)}
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 flex-1">Stengt</span>
                    )}
                  </div>
                ))}
              </div>

              {error && <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 mt-7">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  ← Tilbake
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                  {loading ? "Oppretter klinikk…" : "Fullfør registrering →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEG 3: Ferdig ── */}
        {step === 3 && result && (
          <div className="w-full max-w-lg">
            {/* Suksess-header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Klinikken er klar!</h1>
              <p className="text-slate-500 text-sm">
                <strong className="text-slate-700">{name}</strong> er registrert og SvarAI-widgeten din er klar til bruk.
              </p>
            </div>

            {/* Widget preview lenke */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
              <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <span className="text-indigo-500">🤖</span> Din AI-resepsjonist
              </h3>
              <p className="text-sm text-slate-500 mb-4">Test chatten med dine egne data før du legger den på nettsiden.</p>
              <a
                href={result.widgetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-indigo-50 text-indigo-700 rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                Åpne chat-demo →
              </a>
            </div>

            {/* Embed-kode */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
              <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <span className="text-indigo-500">{"</>"}</span> Embed på nettsiden din
              </h3>
              <p className="text-sm text-slate-500 mb-3">Lim inn denne koden på nettsiden din, like før <code className="bg-slate-100 px-1 rounded">&lt;/body&gt;</code></p>
              <div className="relative">
                <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                  {`<iframe\n  src="https://svarai.no/widget?id=${result.clinicId}"\n  width="420"\n  height="620"\n  frameborder="0"\n  style="border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);"\n></iframe>`}
                </pre>
                <button
                  onClick={() => copy(`<iframe\n  src="https://svarai.no/widget?id=${result.clinicId}"\n  width="420"\n  height="620"\n  frameborder="0"\n  style="border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);"\n></iframe>`)}
                  className="absolute top-3 right-3 bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied ? "✓ Kopiert!" : "Kopier"}
                </button>
              </div>
            </div>

            {/* Admin panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
              <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <span className="text-indigo-500">⚙️</span> Admin-panel
              </h3>
              <p className="text-sm text-slate-500 mb-4">Rediger tjenester, priser, åpningstider og se bookinger.</p>
              <a
                href={result.adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-slate-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Gå til admin-panel →
              </a>
            </div>

            {/* Klinikk-ID info */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <p className="text-sm text-indigo-800">
                <strong>Din klinikk-ID:</strong>{" "}
                <code className="bg-white px-2 py-0.5 rounded font-mono text-indigo-700 border border-indigo-200">{result.clinicId}</code>
              </p>
              <p className="text-xs text-indigo-600 mt-1">Bruk denne ID-en til å hente inn korrekt data i chatten.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
