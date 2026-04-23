const benefits = [
  { metric: "+32%", label: "flere bookinger", sub: "når kvelder og helger også er dekket." },
  { metric: "−70%", label: "tid brukt på telefon", sub: "for resepsjonen din – frigitt til pasienter." },
  { metric: "4,8 / 5", label: "kundetilfredshet", sub: "fra pasienter som chatter med SvarAI." },
  { metric: "< 3 sek", label: "responstid", sub: "på alle henvendelser – hele døgnet." },
];

export default function Benefits() {
  return (
    <section id="fordeler" className="py-24 bg-ink-50/50 border-y border-ink-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-sm font-medium text-brand-700 uppercase tracking-wider">Fordeler</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900 leading-tight">
              Mer omsetning. Mindre stress. <br className="hidden sm:block" />
              Gladere pasienter.
            </h2>
            <p className="mt-5 text-lg text-ink-600 leading-relaxed">
              Klinikker som bruker SvarAI fanger opp henvendelser de aldri
              ellers ville fått. Samtidig slipper de ansatte å gjenta det samme hundre ganger om dagen.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-700">
              {[
                "Ingen tapte henvendelser etter stengetid",
                "Færre avbud – AI-en sender smarte påminnelser",
                "Mer tid til de pasientene som faktisk er i klinikken",
                "Klare, rapporterte tall på hver eneste henvendelse",
              ].map(b => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {benefits.map(b => (
              <div
                key={b.label}
                className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
              >
                <div className="text-3xl font-semibold tracking-tight text-ink-900">{b.metric}</div>
                <div className="mt-2 text-sm font-medium text-ink-900">{b.label}</div>
                <div className="mt-1 text-xs text-ink-500">{b.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
