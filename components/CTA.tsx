"use client";

import { useState } from "react";

export default function CTA() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clinic: "",
    name: "",
    email: "",
    phone: "",
  });

  return (
    <section id="kontakt" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="relative mx-auto max-w-4xl px-6">
        <div className="rounded-3xl border border-ink-100 bg-white shadow-card p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-2">
              <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Book demo</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 leading-tight">
                Se SvarAI trent på din klinikk.
              </h2>
              <p className="mt-4 text-ink-600 leading-relaxed">
                15 minutter. Vi viser deg en ferdig demo, basert på dine tjenester,
                priser og rutiner. Helt uforpliktende.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-ink-700">
                {["Ingen bindingstid", "Oppsett på 5 dager", "Dedikert onboarding"].map(x => (
                  <li key={x} className="flex items-center gap-2">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-500"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                    {x}
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-ink-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4">Eller ta kontakt direkte</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-ink-100 flex items-center justify-center text-sm font-bold text-ink-700 shrink-0">
                    AH
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Alexander Hagen</p>
                    <p className="text-xs text-ink-500">SvarAI</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <a href="tel:+4747229344" className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 transition">
                    <svg className="h-4 w-4 text-brand-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    +47 472 29 344
                  </a>
                  <a href="mailto:alexander.magnus.hagen@gmail.com" className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 transition">
                    <svg className="h-4 w-4 text-brand-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    alexander.magnus.hagen@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {sent ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="font-semibold text-brand-900">Takk, {form.name.split(" ")[0] || "du"}!</p>
                  </div>
                  <p className="mt-3 text-sm text-brand-900">
                    Vi tar kontakt innen 24 timer på <strong>{form.email}</strong> for å sette opp demoen.
                  </p>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={async e => {
                    e.preventDefault();
                    setLoading(true);
                    setError("");
                    try {
                      const res = await fetch("/api/lead", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(form),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || "Noe gikk galt.");
                      }
                      setSent(true);
                    } catch (err: any) {
                      setError(err.message || "Kunne ikke sende. Prøv igjen.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <div>
                    <label className="block text-xs font-medium text-ink-700">Klinikkens navn</label>
                    <input
                      required
                      value={form.clinic}
                      onChange={e => setForm({ ...form, clinic: e.target.value })}
                      placeholder="Oslo Tannlegesenter"
                      className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-700">Ditt navn</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Ola Nordmann"
                      className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-700">E-post</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="ola@klinikk.no"
                        className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-700">Telefon</label>
                      <input
                        required
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="+47 123 45 678"
                        className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-ink-900 text-white font-medium px-6 py-3 hover:bg-ink-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sender..." : "Book 15-min demo →"}
                  </button>
                  <p className="text-xs text-ink-500 text-center">
                    Vi kontakter deg innen 24 timer. Dine opplysninger selges aldri videre.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
